const bcrypt = require("bcryptjs");
const db = require("../config/db");
const fs = require("fs");
const path = require("path");

/* ================= AUTH ================= */

// Show login page
exports.showLogin = (req, res) => {
  res.render("family-login", {
    error: req.query.error,
    registered: req.query.registered,
    logout: req.query.logout
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
      return res.redirect("/login?error=password");
    }

    // Check if user already exists
    const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      // User already exists - redirect to register page with error
      return res.redirect("/login?error=exists");
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (email, password) VALUES (?, ?)", [
      email,
      hash,
    ]);
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

    // Check if family exists
    const [families] = await db.query(
      "SELECT * FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (families.length > 0) {
      // Family exists → redirect to my-family
      return res.redirect("/my-family");
    } else {
      // Family does not exist → redirect to add form
      return res.redirect("/family-form");
    }
  } catch (err) {
    console.error(err);
    return res.redirect("/dashboard");
  }
};

/* ================= FAMILY ================= */

// Show family form
exports.showForm = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [selfCheck] = await db.query("SELECT id FROM persons WHERE user_id = ? ORDER BY id ASC LIMIT 1", [userId]);
    let familyData = null;

    if (selfCheck.length > 0) {
      const selfId = selfCheck[0].id;
      const [relatives] = await db.query(
        `SELECT r.relation, p.* FROM relationships r JOIN persons p ON p.id = r.related_person_id WHERE r.person_id = ?`,
        [selfId]
      );
      const [selfData] = await db.query("SELECT * FROM persons WHERE id = ?", [selfId]);

      let allMembers = [...relatives];
      if (selfData.length > 0) {
        selfData[0].relation = "Self";
        allMembers.unshift(selfData[0]); // Inject self
      }

      // Map back to structured object for easy prefill
      familyData = {
        self: allMembers.find(r => r.relation === 'Self') || {},
        father: allMembers.find(r => r.relation === 'father') || {},
        mother: allMembers.find(r => r.relation === 'mother') || {},
        spouse: allMembers.find(r => r.relation === 'spouse') || {},
        children: allMembers.filter(r => r.relation === 'child'),
        siblings: allMembers.filter(r => r.relation === 'sibling')
      };
    }

    res.render("family-form", {
      addChildMode: req.query.mode === 'addChild',
      familyData: familyData ? JSON.stringify(familyData) : null
    });
  } catch (err) {
    console.error("Error loading family form:", err);
    res.render("family-form", { addChildMode: false, familyData: null });
  }
};

exports.showFamilyForm = exports.showForm;

// Save family data
exports.saveFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.session.user.id;
    console.log("📥 Received Body:", req.body);

    const {
      father_name, mother_name,
      my_name, my_gender, my_dob, my_mobile, my_occupation,
      spouse_name, spouse_gender, spouse_mobile, spouse_occupation,
      door_no, street, state, district, pincode,
      children, siblings
    } = req.body;

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
    if (children && Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        if (c && c.name) {
          const cid = await insertPerson(c.name, c.gender, c.dob, null, null, `children[${i}][image]`, c.existing_image);
          if (cid) childrenIds.push(cid);
        }
      }
    }

    const siblingIds = [];
    if (siblings && Array.isArray(siblings)) {
      for (let i = 0; i < siblings.length; i++) {
        const s = siblings[i];
        if (s && s.name) {
          const sid = await insertPerson(s.name, s.gender, null, null, null, `siblings[${i}][image]`, s.existing_image);
          if (sid) siblingIds.push(sid);
        }
      }
    }

    // STEP 6: Insert Relationships
    const insertRelation = async (p1, p2, rel1, rel2) => {
      if (!p1 || !p2) return;
      await connection.query(
        `INSERT INTO relationships (user_id, person_id, related_person_id, relation) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
        [userId, p1, p2, rel1, userId, p2, p1, rel2]
      );
    };

    if (fatherId) await insertRelation(selfId, fatherId, 'father', 'child');
    if (motherId) await insertRelation(selfId, motherId, 'mother', 'child');
    if (spouseId) await insertRelation(selfId, spouseId, 'spouse', 'spouse');

    const myParentRel = my_gender === 'female' ? 'mother' : 'father';
    for (const cid of childrenIds) {
      await insertRelation(selfId, cid, 'child', myParentRel);
    }

    for (const sid of siblingIds) {
      await insertRelation(selfId, sid, 'sibling', 'sibling');
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
    const siblings = uniqueMembers.filter((m) => m.relation === "sibling");
    const children = uniqueMembers.filter((m) => m.relation === "child");

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
    const [members] = await db.query(
      "SELECT * FROM family_members WHERE family_id = ?",
      [familyId]
    );
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

    const [familyRows] = await db.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (familyRows.length === 0) {
      return res.json({ success: false });
    }

    const familyId = familyRows[0].id;

    const [members] = await db.query(
      "SELECT * FROM family_members WHERE family_id = ?",
      [familyId]
    );

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
    let photoPath = null;
    if (req.file) {
      photoPath = `children/${req.file.filename}`;
      const oldPath = req.file.path;
      const newPath = path.join(__dirname, '../uploads', photoPath);
      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
      }
    }
    const validRelationship = relationship || 'other';

    // Get family_id from families table
    const [familyRows] = await db.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (familyRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No family found. Please create a family first."
      });
    }

    const familyId = familyRows[0].id;

    // Insert child into family_members
    const sql = `
      INSERT INTO family_members
      (family_id, member_type, name, relationship, dob, gender, occupation, door_no, street, pincode, state, district, photo)
      VALUES (?, 'child', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      familyId,
      name,
      validRelationship,
      dob || null,
      gender || null,
      occupation || null,
      door_no || null,
      street || null,
      pincode || null,
      state || null,
      district || null,
      photoPath
    ]);

    res.json({ success: true, id: result.insertId, message: "Child added successfully" });
  } catch (err) {
    console.error("Add child error:", err);
    res.status(500).json({ success: false, message: "Failed to add child", error: err.message });
  }
};

exports.getChildren = async (req, res) => {
  try {
    const userId = req.session.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    // Get family_id from families table
    const [familyRows] = await db.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (familyRows.length === 0) {
      return res.json([]);
    }

    const familyId = familyRows[0].id;

    const [children] = await db.query(
      "SELECT * FROM family_members WHERE family_id = ? AND member_type = 'child'",
      [familyId]
    );

    res.json(children);
  } catch (err) {
    console.error("Get children error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch children", error: err.message });
  }
};

exports.getChild = async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await db.query("SELECT * FROM family_members WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Child not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Get child error:", err);
    res.status(500).json({ error: "Failed to fetch child" });
  }
};

exports.updateChild = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, dob, gender, occupation, relationship, address } = req.body;
    let photoPath = null;
    if (req.file) {
      photoPath = `children/${req.file.filename}`;
      const oldPath = path.join('uploads', req.file.filename);
      const newPath = path.join('uploads', photoPath);
      fs.renameSync(oldPath, newPath);
      const stats = fs.statSync(newPath);
      photoPath = `${photoPath}(${stats.size})`;
    }

    let sql, params;

    if (photoPath) {
      sql = `
        UPDATE family_members
        SET name=?, dob=?, gender=?, occupation=?, relationship=?, door_no=?, photo=?
        WHERE id=?
      `;
      params = [name, dob, gender, occupation, relationship, address, photoPath, id];
    } else {
      sql = `
        UPDATE family_members
        SET name=?, dob=?, gender=?, occupation=?, relationship=?, door_no=?
        WHERE id=?
      `;
      params = [name, dob, gender, occupation, relationship, address, id];
    }

    await db.query(sql, params);
    res.json({ message: "Updated" });
  } catch (err) {
    console.error("Update child error:", err);
    res.status(500).json({ error: "Failed to update child" });
  }
};

exports.deleteChild = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query("DELETE FROM family_members WHERE id=?", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete child error:", err);
    res.status(500).json({ error: "Failed to delete child" });
  }
};

/* ================= PARENT EDIT ================= */

exports.showFamilyEdit = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get all family members for this user
    const [members] = await db.query(
      "SELECT fm.* FROM family_members fm JOIN families f ON fm.family_id = f.id WHERE f.user_id = ?",
      [userId]
    );

    if (members.length === 0) {
      return res.redirect("/family-form");
    }

    // Calculate photo file sizes
    members.forEach(member => {
      if (member.photo) {
        const photoPath = path.join(__dirname, '../uploads', member.photo);
        if (fs.existsSync(photoPath)) {
          const stats = fs.statSync(photoPath);
          member.photoSize = stats.size;
        } else {
          member.photoSize = 0;
        }
      } else {
        member.photoSize = 0;
      }
    });

    res.render("family-edit", { family: null, members });
  } catch (err) {
    console.error("Show family edit error:", err);
    res.status(500).send("Server Error");
  }
};

exports.showMemberEdit = async (req, res) => {
  try {
    const memberId = req.params.id;
    const userId = req.session.user.id;

    // Get the specific member
    const [members] = await db.query(
      "SELECT * FROM family_members WHERE id = ? AND family_id IN (SELECT id FROM families WHERE user_id = ?)",
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

    // Get family_id
    const [familyRows] = await db.query("SELECT id FROM families WHERE user_id = ? LIMIT 1", [userId]);
    if (familyRows.length === 0) {
      return res.status(404).json({ success: false, message: "Family not found" });
    }
    const familyId = familyRows[0].id;

    // Handle photos
    let husbandPhotoPath = null;
    let wifePhotoPath = null;
    if (req.files) {
      if (req.files['husband_photo'] && req.files['husband_photo'][0]) {
        husbandPhotoPath = `parent/${req.files['husband_photo'][0].filename}`;
        // Delete old husband photo if exists
        const [husbandRows] = await db.query("SELECT photo FROM family_members WHERE family_id = ? AND relationship = 'husband'", [familyId]);
        if (husbandRows.length > 0 && husbandRows[0].photo) {
          const oldPath = path.join(__dirname, '../uploads', husbandRows[0].photo);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }
      if (req.files['wife_photo'] && req.files['wife_photo'][0]) {
        wifePhotoPath = `parent/${req.files['wife_photo'][0].filename}`;
        // Delete old wife photo if exists
        const [wifeRows] = await db.query("SELECT photo FROM family_members WHERE family_id = ? AND relationship = 'wife'", [familyId]);
        if (wifeRows.length > 0 && wifeRows[0].photo) {
          const oldPath = path.join(__dirname, '../uploads', wifeRows[0].photo);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }
    }

    // Update husband
    if (husband_name) {
      let sql = `UPDATE family_members SET name=?, mobile=?, occupation=?, door_no=?, street=?, state=?, district=?, pincode=?`;
      let params = [husband_name, husband_mobile || null, husband_occupation || null, door_no || null, street || null, state || null, district || null, pincode || null];
      if (husbandPhotoPath) {
        sql += `, photo=?`;
        params.push(husbandPhotoPath);
      }
      sql += ` WHERE family_id=? AND relationship='husband'`;
      params.push(familyId);
      await db.query(sql, params);
    }

    // Update wife
    if (wife_name) {
      let sql = `UPDATE family_members SET name=?, mobile=?, occupation=?, door_no=?, street=?, state=?, district=?, pincode=?`;
      let params = [wife_name, wife_mobile || null, wife_occupation || null, door_no || null, street || null, state || null, district || null, pincode || null];
      if (wifePhotoPath) {
        sql += `, photo=?`;
        params.push(wifePhotoPath);
      }
      sql += ` WHERE family_id=? AND relationship='wife'`;
      params.push(familyId);
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

    // Verify the member belongs to the user
    const [members] = await db.query(
      "SELECT * FROM family_members WHERE id = ? AND family_id IN (SELECT id FROM families WHERE user_id = ?)",
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
      const folder = member.member_type === 'child' ? 'children' : 'parent';

      // Delete old photo file if exists
      if (member.photo) {
        const fullOldPath = path.join(__dirname, '../uploads', member.photo);
        if (fs.existsSync(fullOldPath)) {
          fs.unlinkSync(fullOldPath);
        }
      }

      // Generate new filename
      const filename = req.file.filename;
      photoPath = `${folder}/${filename}`;
      const oldPath = req.file.path;
      const newPath = path.join(__dirname, '../uploads', photoPath);

      // Rename/move the file to the desired path
      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
      }
    }


    let sql, params;
    if (photoPath) {
      sql = `
        UPDATE family_members
        SET name=?, relationship=?, mobile=?, occupation=?, dob=?, gender=?, door_no=?, street=?, district=?, state=?, pincode=?, photo=?
        WHERE id=?
      `;
      params = [name, finalRelationship, mobile, occupation, finalDob, gender, door_no, street, district, state, pincode, photoPath, memberId];
    } else {
      sql = `
        UPDATE family_members
        SET name=?, relationship=?, mobile=?, occupation=?, dob=?, gender=?, door_no=?, street=?, district=?, state=?, pincode=?
        WHERE id=?
      `;
      params = [name, finalRelationship, mobile, occupation, finalDob, gender, door_no, street, district, state, pincode, memberId];
    }

    await db.query(sql, params);
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

    const [familyRows] = await db.query("SELECT id FROM families WHERE user_id = ? LIMIT 1", [userId]);
    if (familyRows.length === 0) {
      return res.status(404).json({ success: false, message: "Family not found" });
    }

    const familyId = familyRows[0].id;

    // Get current husband photo to delete if new photo uploaded
    const [husbandRows] = await db.query("SELECT photo FROM family_members WHERE family_id = ? AND relationship = 'husband'", [familyId]);
    let photoPath = null;
    if (req.file) {
      // Delete old photo file if exists
      if (husbandRows.length > 0 && husbandRows[0].photo) {
        const fullOldPath = path.join(__dirname, '../uploads', husbandRows[0].photo);
        if (fs.existsSync(fullOldPath)) {
          fs.unlinkSync(fullOldPath);
        }
      }

      // Generate new filename without file size
      photoPath = `parent/${req.file.filename}`;
      const oldPath = req.file.path;
      const newPath = path.join(__dirname, '../uploads', photoPath);

      // Rename/move the file to the desired path
      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
      }
    }

    let sql = `UPDATE family_members SET name=?, mobile=?, occupation=?, door_no=?, street=?, pincode=?, state=?, district=?`;
    let params = [name, mobile || null, occupation || null, door_no || null, street || null, pincode || null, state || null, district || null];
    if (photoPath) {
      sql += `, photo=?`;
      params.push(photoPath);
    }
    sql += ` WHERE family_id=? AND relationship='husband'`;
    params.push(familyId);

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

    // Get family_id for the user
    const [familyRows] = await connection.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (familyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Family not found" });
    }

    const familyId = familyRows[0].id;

    // Delete family members first (due to foreign key constraint)
    await connection.query("DELETE FROM family_members WHERE family_id = ?", [familyId]);

    // Delete the family
    await connection.query("DELETE FROM families WHERE id = ?", [familyId]);

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
    const [rows] = await db.query('SELECT * FROM family_members WHERE id = ?', [memberId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, member: rows[0] });
  } catch (err) {
    console.error('Get member error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch member' });
  }
};
