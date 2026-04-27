const bcrypt = require("bcryptjs");
const db = require("../config/db");
const fs = require("fs");
const path = require("path");

function normalizeRelation(value) {
  return String(value || "").trim().toLowerCase();
}

function relationMatches(value, expected) {
  return normalizeRelation(value) === normalizeRelation(expected);
}

function relationIn(value, expectedList) {
  const normalized = normalizeRelation(value);
  return expectedList.some((item) => normalized === normalizeRelation(item));
}

function inferSiblingRelation(gender) {
  return "sibling";
}

function canonicalizeRelationForDb(relation, fallback = "sibling") {
  const normalized = normalizeRelation(relation);
  const relationMap = {
    husband: "spouse",
    wife: "spouse",
    son: "child",
    daughter: "child",
    brother: "sibling",
    sister: "sibling"
  };

  const canonical = relationMap[normalized] || normalized;
  const allowed = new Set(["father", "mother", "spouse", "child", "sibling"]);
  return allowed.has(canonical) ? canonical : fallback;
}

async function buildFamilyDataForUser(userId, preferredRootId = null) {
  let selfId = null;

  const parsedRootId = Number(preferredRootId);
  if (Number.isInteger(parsedRootId) && parsedRootId > 0) {
    const [ownerCheck] = await db.query(
      "SELECT id FROM persons WHERE id = ? AND user_id = ? LIMIT 1",
      [parsedRootId, userId]
    );
    if (ownerCheck.length > 0) {
      selfId = parsedRootId;
    }
  }

  if (!selfId) {
    const [selfCheck] = await db.query(
      "SELECT id FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1",
      [userId]
    );
    if (selfCheck.length === 0) {
      return null;
    }
    selfId = selfCheck[0].id;
  }

  const [relatives] = await db.query(
    `SELECT r.relation, p.*
     FROM relationships r
     JOIN persons p ON p.id = r.related_person_id
     WHERE r.person_id = ?`,
    [selfId]
  );
  const [selfData] = await db.query("SELECT * FROM persons WHERE id = ?", [selfId]);

  const allMembers = [...relatives];
  if (selfData.length > 0) {
    selfData[0].relation = "Self";
    allMembers.unshift(selfData[0]);
  }

  return {
    self: allMembers.find((r) => relationMatches(r.relation, "Self")) || {},
    father: allMembers.find((r) => relationMatches(r.relation, "father")) || {},
    mother: allMembers.find((r) => relationMatches(r.relation, "mother")) || {},
    spouse: allMembers.find((r) => relationMatches(r.relation, "spouse")) || {},
    children: allMembers.filter((r) => relationIn(r.relation, ["child", "son", "daughter"])),
    siblings: allMembers.filter((r) => relationIn(r.relation, ["sibling", "brother", "sister"]))
  };
}

function buildMemberListFromFamilyData(familyData) {
  if (!familyData || typeof familyData !== "object") return [];

  const pushMember = (bucket, person, relation) => {
    if (!person || !person.id) return;
    bucket.push({
      ...person,
      relation,
      photo: person.image || null,
      member_type: relationIn(relation, ["child", "son", "daughter"]) ? "child" : "parent"
    });
  };

  const members = [];
  pushMember(members, familyData.father, "father");
  pushMember(members, familyData.mother, "mother");
  pushMember(members, familyData.self, "Self");
  pushMember(members, familyData.spouse, "spouse");

  (Array.isArray(familyData.siblings) ? familyData.siblings : []).forEach((member) => {
    const siblingRelation = relationIn(member.relation, ["brother", "sister"])
      ? normalizeRelation(member.relation)
      : inferSiblingRelation(member.gender);
    pushMember(members, member, siblingRelation);
  });

  (Array.isArray(familyData.children) ? familyData.children : []).forEach((member) => {
    pushMember(members, member, "child");
  });

  return members;
}

function safeMoveUploadToFolder(reqFile, folderName) {
  if (!reqFile || !folderName) return null;
  const photoPath = `${folderName}/${reqFile.filename}`;
  const oldPath = reqFile.path;
  const newPath = path.join(__dirname, "../uploads", photoPath);

  if (oldPath && newPath && oldPath !== newPath) {
    fs.renameSync(oldPath, newPath);
  }

  return photoPath;
}

/* ================= AUTH ================= */

// Show login page
exports.showLogin = (req, res) => {
  const adminCreateFamilyFlow = req.query.flow === "create-family" || req.session.nextAfterAuth === "/admin/create-family";
  res.render("family-login", {
    error: req.query.error,
    registered: req.query.registered,
    logout: req.query.logout,
    flow: adminCreateFamilyFlow ? "create-family" : null
  });
};

// Show register page
exports.showRegister = (req, res) => {
  res.render("family-register");
};

// Login handler
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.redirect("/login?error=invalid");
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.redirect("/login?error=invalid");
    }

    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase() : null;
    const resolvedRole = user.role || (adminEmail && user.email.toLowerCase() === adminEmail ? "admin" : "user");

    req.session.user = { id: user.id, email: user.email, role: resolvedRole };
    const redirectUrl = resolvedRole === "admin" ? "/admin/dashboard" : "/dashboard?login=success";
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Server error");
  }
};

// Register handler
exports.register = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      const flowQuery = req.session.nextAfterAuth === "/admin/create-family" ? "&flow=create-family" : "";
      return res.redirect(`/login?error=password${flowQuery}`);
    }

    // Check if user already exists
    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      // User already exists - redirect to register page with error
      const flowQuery = req.session.nextAfterAuth === "/admin/create-family" ? "&flow=create-family" : "";
      return res.redirect(`/login?error=exists${flowQuery}`);
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [
      email,
      hash,
      "user"
    ]);

    req.session.user = { id: result.insertId, email, role: "user" };

    if (req.session.nextAfterAuth === "/admin/create-family") {
      delete req.session.nextAfterAuth;
      return res.redirect("/admin/create-family");
    }

    res.redirect("/login?registered=true");
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send("Server error");
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login?logout=success");
  });
};

/* ================= DASHBOARD ================= */

exports.dashboard = async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const userId = req.session.user.id;

    const [persons] = await db.query(
      "SELECT id FROM persons WHERE user_id = ? LIMIT 1",
      [userId]
    );

    const hasFamily = persons.length > 0;

    // Check for success message in session
    const successMsg = req.session.success || null;
    req.session.success = null; // Clear it after reading

    res.render("dashboard", {
      user: req.session.user,
      message: req.query.message || null,
      success: successMsg,
      hasFamily,
      members: []
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", {
      user: req.session.user,
      message: req.query.message || null,
      success: null,
      hasFamily: false,
      members: []
    });
  }
};

/* ================= FAMILY CHECK ================= */

exports.familyCheck = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [persons] = await db.query(
      "SELECT id FROM persons WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (persons.length > 0) {
      return res.redirect("/my-family");
    }

    return res.redirect("/family-form");
  } catch (err) {
    console.error(err);
    return res.redirect("/dashboard");
  }
};

/* ================= FAMILY ================= */

// Show family form
exports.showFamilyForm = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const familyData = await buildFamilyDataForUser(userId);

    res.render("family-form", {
      addChildMode: req.query.mode === 'addChild',
      familyData: familyData ? JSON.stringify(familyData) : null
    });
  } catch (err) {
    console.error("Error loading family form:", err);
    res.render("family-form", { addChildMode: false, familyData: null });
  }
};


// Save family data
exports.saveFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.session.user.id;
    console.log(" Received Body:", req.body);

    const {
      father_name, mother_name,
      my_name, my_gender, my_dob, my_mobile, my_occupation,
      spouse_name, spouse_gender, spouse_mobile, spouse_occupation,
      door_no, street, state, district, pincode,
      children, siblings
    } = req.body;

    const toIndexedList = (collection) => {
      if (Array.isArray(collection)) return collection;
      if (collection && typeof collection === "object") {
        return Object.entries(collection)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([, value]) => value);
      }
      return [];
    };

    const childrenList = toIndexedList(children);
    const siblingsList = toIndexedList(siblings);

    await connection.beginTransaction();

    // Prevent duplicate main person for user
    const [existingPersons] = await connection.query(
      "SELECT id FROM persons WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (existingPersons.length > 0) {
      // Overwrite/Update logic: Wipe old records for this user and rewrite cleanly
      await connection.query("DELETE FROM relationships WHERE user_id = ?", [userId]);
      await connection.query("DELETE FROM persons WHERE user_id = ?", [userId]);
    }

    // Helper: Insert Person
    const insertPerson = async (name, gender, dob, mobile, occ, photoMap, existingPhotoPath = null) => {
      if (!name) return null;
      let photoPath = existingPhotoPath;

      if (req.files && req.files[photoMap] && req.files[photoMap][0]) {
        let rawPhoto = req.files[photoMap][0].filename;
        if (photoMap.includes("father") || photoMap.includes("mother") || photoMap.includes("parent")) photoPath = "parent/" + rawPhoto;
        else if (photoMap.includes("my_") || photoMap.includes("spouse")) photoPath = "main/" + rawPhoto;
        else if (photoMap.includes("children")) photoPath = "children/" + rawPhoto;
        else if (photoMap.includes("siblings")) photoPath = "siblings/" + rawPhoto;
      } else if (req.body['existing_' + photoMap]) {
        photoPath = req.body['existing_' + photoMap];
      }

      const [insertResult] = await connection.query(
        `INSERT INTO persons 
         (user_id, name, gender, dob, mobile, occupation, image, door_no, street, district, state, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, name, gender || null, dob || null, mobile || null, occ || null, photoPath,
          door_no || null, street || null, district || null, state || null, pincode || null
        ]
      );
      return insertResult.insertId;
    };

    // STEP 1-5: Insert ALL Persons
    // STEP 1-5: Insert ALL Persons
    const selfId = await insertPerson(my_name, my_gender, my_dob, my_mobile, my_occupation, 'my_image', req.body.existing_my_image);

    if (!selfId) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Main person details are required." });
    }

    const fatherId = await insertPerson(father_name, 'Male', null, null, null, 'father_image', req.body.existing_father_image);
    const motherId = await insertPerson(mother_name, 'Female', null, null, null, 'mother_image', req.body.existing_mother_image);
    const spouseId = await insertPerson(spouse_name, spouse_gender, null, spouse_mobile, spouse_occupation, 'spouse_image', req.body.existing_spouse_image);

    const childrenIds = [];
    if (childrenList.length > 0) {
      for (let i = 0; i < childrenList.length; i++) {
        const c = childrenList[i];
        if (c && c.name) {
          const cid = await insertPerson(c.name, c.gender, c.dob, null, null, `children[${i}][image]`, c.existing_image);
          if (cid) childrenIds.push(cid);
        }
      }
    }

    const siblingIds = [];
    if (siblingsList.length > 0) {
      for (let i = 0; i < siblingsList.length; i++) {
        const s = siblingsList[i];
        if (s && s.name) {
          const relationRaw = normalizeRelation(s.relation);
          const siblingGender = s.gender || (relationRaw === "sister" ? "Female" : relationRaw === "brother" ? "Male" : null);
          const sid = await insertPerson(s.name, siblingGender, null, null, null, `siblings[${i}][image]`, s.existing_image);
          if (sid) siblingIds.push(sid);
        }
      }
    }

    // STEP 6: Insert Relationships
    const insertRelation = async (p1, p2, rel1, rel2) => {
      if (!p1 || !p2) return;
      const safeRel1 = canonicalizeRelationForDb(rel1);
      const safeRel2 = canonicalizeRelationForDb(rel2);
      await connection.query(
        `INSERT INTO relationships (user_id, person_id, related_person_id, relation) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
        [userId, p1, p2, safeRel1, userId, p2, p1, safeRel2]
      );
    };

    if (fatherId) await insertRelation(selfId, fatherId, 'father', 'child');
    if (motherId) await insertRelation(selfId, motherId, 'mother', 'child');
    if (spouseId) await insertRelation(selfId, spouseId, 'spouse', 'spouse');

    const myParentRel = my_gender === 'female' ? 'mother' : 'father';
    for (const cid of childrenIds) {
      await insertRelation(selfId, cid, 'child', myParentRel);
    }

    for (let i = 0; i < siblingIds.length; i++) {
      const sid = siblingIds[i];
      const sibling = siblingsList[i] || null;
      const relationFromSelf = inferSiblingRelation(sibling?.gender);
      const relationFromSibling = inferSiblingRelation(my_gender);
      await insertRelation(selfId, sid, relationFromSelf, relationFromSibling);
    }

    await connection.commit();
    req.session.success = "Family saved successfully";
    res.redirect("/dashboard");

  } catch (err) {
    await connection.rollback();
    console.error("SAVE FAMILY ERROR", err);
    res.status(500).json({ success: false, message: "Failed to save family data" });
  } finally {
    if (connection) connection.release();
  }
};

// My Family page (EJS render)
exports.myFamily = async (req, res) => {
  console.log("myFamily controller HIT");

  try {
    const userId = req.session.user.id;

    // STEP 1: Check if user has persons
    const [selfCheck] = await db.query(
      "SELECT id FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1",
      [userId]
    );

    if (selfCheck.length === 0) {
      // IF empty: render page with "No family data found"
      return res.render("my-family", {
        members: [],
        father: null,
        mother: null,
        self: null,
        spouse: null,
        siblings: [],
        children: [],
        message: "No family data found"
      });
    }

    const selfId = selfCheck[0].id;

    // STEP 2: Fetch all persons + relationships
    // Also include SELF manually by union or just direct query handling
    const [relatives] = await db.query(
      `SELECT r.relation, p.* 
       FROM relationships r 
       JOIN persons p ON p.id = r.related_person_id 
       WHERE r.person_id = ?`,
      [selfId]
    );

    // Fetch self explicitly to add to the array
    const [selfData] = await db.query("SELECT * FROM persons WHERE id = ?", [selfId]);
    if (selfData.length > 0) {
      selfData[0].relation = "Self";
      relatives.unshift(selfData[0]); // Add self at the beginning
    }

    // Filter duplicates securely (if identical person_id pops up, filter them)
    const uniqueMembers = [];
    const seenMap = new Map();
    for (const mem of relatives) {
      if (!seenMap.has(mem.id)) {
        seenMap.set(mem.id, true);
        uniqueMembers.push(mem);
      }
    }

    const father = uniqueMembers.find((m) => m.relation === "father") || null;
    const mother = uniqueMembers.find((m) => m.relation === "mother") || null;
    const self = uniqueMembers.find((m) => m.relation === "Self") || null;
    const spouse = uniqueMembers.find((m) => m.relation === "spouse") || null;
    const siblings = uniqueMembers.filter((m) => relationIn(m.relation, ["brother", "sister", "sibling"]));
    const children = uniqueMembers.filter((m) => relationIn(m.relation, ["child", "son", "daughter"]));

    return res.render("my-family", {
      members: uniqueMembers,
      father,
      mother,
      self,
      spouse,
      siblings,
      children,
      message: null
    });

  } catch (err) {
    console.error("myFamily ERROR:", err);
    return res.render("my-family", {
      members: [],
      father: null,
      mother: null,
      self: null,
      spouse: null,
      siblings: [],
      children: [],
      message: "An error occurred while loading family data."
    });
  }
};

// ===================== VIEW SPECIFIC FAMILY =====================
exports.viewFamily = async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = Number(familyId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).send("Invalid family id");
    }

    const familyData = await buildFamilyDataForUser(userId);
    const members = buildMemberListFromFamilyData(familyData);

    res.render("my-family", { members });
  } catch (err) {
    console.error("Error loading specific family:", err);
    res.status(500).send("Server error loading family details");
  }
};

/* ================= MY FAMILY JSON (For AJAX Fetch) ================= */
exports.getMyFamilyJson = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ success: false });
    }
    const userId = req.session.user.id;

    const familyData = await buildFamilyDataForUser(userId);
    if (!familyData) {
      return res.json({ success: false, members: [] });
    }

    const members = buildMemberListFromFamilyData(familyData);

    res.json({ success: true, members });

  } catch (err) {
    console.error("Error fetching family JSON:", err);
    res.json({ success: false });
  }
};

/* ================= CHILD MANAGEMENT ================= */

exports.addChild = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }
    const userId = req.session.user.id;

    const { name, dob, gender, occupation, relationship, door_no, street, pincode, state, district } = req.body;
    const [selfRows] = await db.query(
      "SELECT id, gender FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1",
      [userId]
    );

    if (selfRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No family found. Please create family data first."
      });
    }

    const self = selfRows[0];
    const photoPath = req.file ? safeMoveUploadToFolder(req.file, "children") : null;
    const validRelationship = relationIn(relationship, ["child", "son", "daughter"])
      ? canonicalizeRelationForDb(relationship, "child")
      : "child";

    const [childResult] = await db.query(
      `INSERT INTO persons
       (user_id, name, dob, gender, occupation, door_no, street, pincode, state, district, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        dob || null,
        gender || null,
        occupation || null,
        door_no || null,
        street || null,
        pincode || null,
        state || null,
        district || null,
        photoPath
      ]
    );

    const childId = childResult.insertId;
    const parentRelation = normalizeRelation(self.gender) === "female" ? "mother" : "father";

    await db.query(
      `INSERT INTO relationships (user_id, person_id, related_person_id, relation)
       VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
      [userId, self.id, childId, validRelationship, userId, childId, self.id, parentRelation]
    );

    res.json({ success: true, id: childId, message: "Child added successfully" });
  } catch (err) {
    console.error("Add child error:", err);
    res.status(500).json({ success: false, message: "Failed to add child", error: err.message });
  }
};


/* ================= PARENT EDIT ================= */

exports.showFamilyEdit = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const familyData = await buildFamilyDataForUser(userId, req.params.id);

    if (!familyData) {
      return res.redirect("/family-form");
    }

    res.render("family-form", {
      addChildMode: false,
      familyData: JSON.stringify(familyData)
    });
  } catch (err) {
    console.error("Show family edit error:", err);
    res.status(500).send("Server Error");
  }
};

exports.showMemberEdit = async (req, res) => {
  try {
    const memberId = req.params.id;
    const userId = req.session.user.id;

    const [members] = await db.query(
      "SELECT * FROM persons WHERE id = ? AND user_id = ? LIMIT 1",
      [memberId, userId]
    );

    if (members.length === 0) {
      return res.status(404).send("Member not found");
    }

    res.render("member-edit", { member: members[0] });
  } catch (err) {
    console.error("Show member edit error:", err);
    res.status(500).send("Server Error");
  }
};

exports.updateFamily = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { husband_name, wife_name, husband_mobile, wife_mobile, husband_occupation, wife_occupation, door_no, street, state, district, pincode } = req.body;

    const [selfRows] = await db.query("SELECT id FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1", [userId]);
    if (selfRows.length === 0) {
      return res.status(404).json({ success: false, message: "Family not found" });
    }
    const selfId = selfRows[0].id;

    const [spouseRows] = await db.query(
      `SELECT p.id, p.image
       FROM relationships r
       JOIN persons p ON p.id = r.related_person_id
       WHERE r.user_id = ? AND r.person_id = ? AND r.relation = 'spouse'
       LIMIT 1`,
      [userId, selfId]
    );

    const spouseId = spouseRows.length > 0 ? spouseRows[0].id : null;

    let husbandPhotoPath = null;
    let wifePhotoPath = null;
    if (req.files) {
      if (req.files['husband_photo'] && req.files['husband_photo'][0]) {
        const [husbandRows] = await db.query("SELECT image FROM persons WHERE id = ? LIMIT 1", [selfId]);
        if (husbandRows.length > 0 && husbandRows[0].image) {
          const oldPath = path.join(__dirname, '../uploads', husbandRows[0].image);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        husbandPhotoPath = safeMoveUploadToFolder(req.files['husband_photo'][0], "parent");
      }

      if (spouseId && req.files['wife_photo'] && req.files['wife_photo'][0]) {
        const [wifeRows] = await db.query("SELECT image FROM persons WHERE id = ? LIMIT 1", [spouseId]);
        if (wifeRows.length > 0 && wifeRows[0].image) {
          const oldPath = path.join(__dirname, '../uploads', wifeRows[0].image);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        wifePhotoPath = safeMoveUploadToFolder(req.files['wife_photo'][0], "parent");
      }
    }

    if (husband_name) {
      let sql = `UPDATE persons SET name=?, mobile=?, occupation=?, door_no=?, street=?, state=?, district=?, pincode=?`;
      let params = [husband_name, husband_mobile || null, husband_occupation || null, door_no || null, street || null, state || null, district || null, pincode || null];
      if (husbandPhotoPath) {
        sql += `, image=?`;
        params.push(husbandPhotoPath);
      }
      sql += ` WHERE id=? AND user_id=?`;
      params.push(selfId, userId);
      await db.query(sql, params);
    }

    if (spouseId && wife_name) {
      let sql = `UPDATE persons SET name=?, mobile=?, occupation=?, door_no=?, street=?, state=?, district=?, pincode=?`;
      let params = [wife_name, wife_mobile || null, wife_occupation || null, door_no || null, street || null, state || null, district || null, pincode || null];
      if (wifePhotoPath) {
        sql += `, image=?`;
        params.push(wifePhotoPath);
      }
      sql += ` WHERE id=? AND user_id=?`;
      params.push(spouseId, userId);
      await db.query(sql, params);
    }

    res.json({ success: true, message: "Family updated successfully" });
  } catch (err) {
    console.error("Update family error:", err);
    res.status(500).json({ success: false, message: "Failed to update family", error: err.message });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    const userId = req.session.user.id;
    const { name, relationship, mobile, occupation, dob, gender, door_no, street, district, state, pincode } = req.body;

    const [members] = await db.query(
      "SELECT * FROM persons WHERE id = ? AND user_id = ? LIMIT 1",
      [memberId, userId]
    );

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const member = members[0];
    const normalizedRelationship = typeof relationship === 'string' ? relationship.trim() : relationship;
    const finalRelationship = normalizedRelationship || member.relationship;
    const finalDob = typeof dob === 'string' && dob.trim() === '' ? null : dob;

    if (!finalRelationship) {
      return res.status(400).json({ success: false, message: "Relationship is required" });
    }

    let photoPath = null;
    if (req.file) {
      const folder = relationIn(finalRelationship, ['child', 'son', 'daughter'])
        ? 'children'
        : relationIn(finalRelationship, ['sibling', 'brother', 'sister'])
          ? 'siblings'
          : 'parent';

      if (member.image) {
        const fullOldPath = path.join(__dirname, '../uploads', member.image);
        if (fs.existsSync(fullOldPath)) {
          fs.unlinkSync(fullOldPath);
        }
      }

      photoPath = safeMoveUploadToFolder(req.file, folder);
    }

    let sql, params;
    if (photoPath) {
      sql = `
        UPDATE persons
        SET name=?, mobile=?, occupation=?, dob=?, gender=?, door_no=?, street=?, district=?, state=?, pincode=?, image=?
        WHERE id=? AND user_id=?
      `;
      params = [name, mobile, occupation, finalDob, gender, door_no, street, district, state, pincode, photoPath, memberId, userId];
    } else {
      sql = `
        UPDATE persons
        SET name=?, mobile=?, occupation=?, dob=?, gender=?, door_no=?, street=?, district=?, state=?, pincode=?
        WHERE id=? AND user_id=?
      `;
      params = [name, mobile, occupation, finalDob, gender, door_no, street, district, state, pincode, memberId, userId];
    }

    await db.query(sql, params);

    const [selfRows] = await db.query(
      "SELECT id, gender FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1",
      [userId]
    );

    if (selfRows.length > 0 && Number(selfRows[0].id) !== Number(memberId)) {
      const selfId = selfRows[0].id;
      const normalized = canonicalizeRelationForDb(finalRelationship);
      const reverseRelationMap = {
        father: "child",
        mother: "child",
        spouse: "spouse",
        husband: "spouse",
        wife: "spouse",
        child: normalizeRelation(selfRows[0].gender) === "female" ? "mother" : "father",
        son: normalizeRelation(selfRows[0].gender) === "female" ? "mother" : "father",
        daughter: normalizeRelation(selfRows[0].gender) === "female" ? "mother" : "father",
        sibling: "sibling",
        brother: "sibling",
        sister: "sibling"
      };

      const reverseRelation = canonicalizeRelationForDb(reverseRelationMap[normalized] || "sibling");

      await db.query(
        "DELETE FROM relationships WHERE user_id = ? AND person_id = ? AND related_person_id = ?",
        [userId, selfId, memberId]
      );
      await db.query(
        "DELETE FROM relationships WHERE user_id = ? AND person_id = ? AND related_person_id = ?",
        [userId, memberId, selfId]
      );

      await db.query(
        `INSERT INTO relationships (user_id, person_id, related_person_id, relation)
         VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
        [userId, selfId, memberId, normalized, userId, memberId, selfId, reverseRelation]
      );
    }

    res.json({ success: true, message: "Member updated successfully" });
  } catch (err) {
    console.error("Update member error:", err);
    res.status(500).json({ success: false, message: "Failed to update member", error: err.message });
  }
};

exports.updateHusband = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, mobile, occupation, door_no, street, pincode, state, district } = req.body;

    const [selfRows] = await db.query("SELECT id, image FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1", [userId]);
    if (selfRows.length === 0) {
      return res.status(404).json({ success: false, message: "Family not found" });
    }

    const selfId = selfRows[0].id;
    let photoPath = null;
    if (req.file) {
      if (selfRows[0].image) {
        const fullOldPath = path.join(__dirname, '../uploads', selfRows[0].image);
        if (fs.existsSync(fullOldPath)) {
          fs.unlinkSync(fullOldPath);
        }
      }

      photoPath = safeMoveUploadToFolder(req.file, "parent");
    }

    let sql = `UPDATE persons SET name=?, mobile=?, occupation=?, door_no=?, street=?, pincode=?, state=?, district=?`;
    let params = [name, mobile || null, occupation || null, door_no || null, street || null, pincode || null, state || null, district || null];
    if (photoPath) {
      sql += `, image=?`;
      params.push(photoPath);
    }
    sql += ` WHERE id=? AND user_id=?`;
    params.push(selfId, userId);

    await db.query(sql, params);
    res.json({ success: true, message: "Husband updated successfully" });
  } catch (err) {
    console.error("Update husband error:", err);
    res.status(500).json({ success: false, message: "Failed to update husband", error: err.message });
  }
};


exports.deleteFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.session.user.id;

    await connection.beginTransaction();

    const [personRows] = await connection.query(
      "SELECT id FROM persons WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (personRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Family not found" });
    }

    await connection.query("DELETE FROM relationships WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM persons WHERE user_id = ?", [userId]);

    await connection.commit();

    res.json({ success: true, message: "Family deleted successfully" });

  } catch (err) {
    await connection.rollback();
    console.error("Delete family error:", err);
    res.status(500).json({ success: false, message: "Failed to delete family", error: err.message });
  } finally {
    connection.release();
  }
};

/* ================= GET MEMBER BY ID ================= */
exports.getMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    const userId = req.session.user && req.session.user.id;
    const [rows] = await db.query('SELECT * FROM persons WHERE id = ? AND user_id = ? LIMIT 1', [memberId, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Get member error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch member' });
  }
};

/* ================= GET CHILD BY ID ================= */
exports.getChild = async (req, res) => {
  try {
    const childId = req.params.id;
    const userId = req.session.user && req.session.user.id;
    const [rows] = await db.query('SELECT * FROM persons WHERE id = ? AND user_id = ? LIMIT 1', [childId, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Child not found' });
    }

    const member = rows[0];

    const [selfRows] = await db.query(
      'SELECT id FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1',
      [userId]
    );

    if (selfRows.length > 0 && Number(selfRows[0].id) !== Number(childId)) {
      const [relRows] = await db.query(
        'SELECT relation FROM relationships WHERE user_id = ? AND person_id = ? AND related_person_id = ? LIMIT 1',
        [userId, selfRows[0].id, childId]
      );
      member.relationship = relRows.length > 0 ? relRows[0].relation : member.relationship;
    }

    res.json(member);
  } catch (err) {
    console.error('Get child error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch child' });
  }
};