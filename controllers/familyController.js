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

    req.session.user = { id: user.id, email: user.email, role: user.role };
    const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/dashboard?login=success';
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

    // Check if user has a family
    const [families] = await db.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    const hasFamily = families.length > 0;
    let members = [];

    if (hasFamily) {
      const familyId = families[0].id;
      const [rows] = await db.query(
        "SELECT * FROM family_members WHERE family_id = ?",
        [familyId]
      );
      members = rows || [];
    }

    res.render("dashboard", {
      user: req.session.user,
      message: req.query.message || null,
      hasFamily,
      members
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", {
      user: req.session.user,
      message: req.query.message || null,
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
      return res.redirect("/my-family");
    } else {
      return res.redirect("/family-form");
    }
  } catch (err) {
    console.error(err);
    return res.redirect("/dashboard");
  }
};

/* ================= FAMILY ================= */

// Show family form
exports.showForm = (req, res) => {
  res.render("family-form", { addChildMode: false });
};

exports.showFamilyForm = (req, res) => {
  res.render("family-form", { addChildMode: false });
};

// Save family data with Tree Structure Logic
exports.saveFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.session.user.id;

    console.log("📥 Received Body:", req.body);
    console.log("📎 Received Files:", req.files);

    let { husband_name, wife_name, has_siblings, members } = req.body;

    if (typeof members === "string") {
      try {
        members = JSON.parse(members);
      } catch (e) {
        console.error("Failed to parse members JSON:", e);
        members = [];
      }
    }

    if (!Array.isArray(members)) members = [];

    await connection.beginTransaction();

    // Step 1: Check if user already has a family
    const [existingPersons] = await connection.query(
      "SELECT id FROM families WHERE user_id = ?",
      [userId]
    );

    if (existingPersons.length > 0) {
      await connection.rollback();
      return res.json({
        success: true,
        exists: true
      });
    }

    // Step 2: Find or create husband's father's family (for parent_family_id)
    let husbandFatherFamilyId = null;
    const husbandFather = members.find(m => m.relation_type === 'father' && m.sibling_side !== 'wife');

    if (husbandFather && husbandFather.name) {
      // Search for existing family by father name
      const [fatherFamily] = await connection.query(
        `SELECT f.id FROM families f 
         JOIN family_members fm ON f.id = fm.family_id 
         WHERE fm.name = ? AND fm.relationship = 'father' 
         LIMIT 1`,
        [husbandFather.name]
      );

      if (fatherFamily.length > 0) {
        husbandFatherFamilyId = fatherFamily[0].id;
      } else {
        // Create dummy family for husband's father
        const [fatherFamilyResult] = await connection.query(
          "INSERT INTO families (user_id, family_code, created_by_admin) VALUES (NULL, ?, 1)",
          [`FAM-DUMMY-HF-${Date.now()}`
          ]);
        husbandFatherFamilyId = fatherFamilyResult.insertId;

        // Add father to his own family
        await connection.query(
          `INSERT INTO family_members 
           (family_id, member_type, name, relationship, gender, occupation, relation_type) 
           VALUES (?, 'parent', ?, 'father', 'Male', ?, 'father')`,
          [husbandFatherFamilyId, husbandFather.name, husbandFather.occupation || null]
        );
      }
    }

    // Step 3: Find or create wife's father's family (for spouse_family_id)
    let wifeFatherFamilyId = null;
    const wifeFather = members.find(m => m.relation_type === 'father' && m.sibling_side === 'wife');

    if (wifeFather && wifeFather.name) {
      const [wfFamily] = await connection.query(
        `SELECT f.id FROM families f 
         JOIN family_members fm ON f.id = fm.family_id 
         WHERE fm.name = ? AND fm.relationship = 'father' 
         LIMIT 1`,
        [wifeFather.name]
      );

      if (wfFamily.length > 0) {
        wifeFatherFamilyId = wfFamily[0].id;
      } else {
        // Create dummy family for wife's father
        const [wfFamilyResult] = await connection.query(
          "INSERT INTO families (user_id, family_code, created_by_admin) VALUES (NULL, ?, 1)",
          [`FAM-DUMMY-WF-${Date.now()}`
          ]);
        wifeFatherFamilyId = wfFamilyResult.insertId;

        await connection.query(
          `INSERT INTO family_members 
           (family_id, member_type, name, relationship, gender, occupation, relation_type) 
           VALUES (?, 'parent', ?, 'father', 'Male', ?, 'father')`,
          [wifeFatherFamilyId, wifeFather.name, wifeFather.occupation || null]
        );
      }
    }

    // Step 4: Create current user's family with parent and spouse references
    const familyCode = `FAM-${Date.now()}`;
    const [familyResult] = await connection.query(
      `INSERT INTO families (user_id, family_code, parent_family_id, spouse_family_id, created_by_admin) 
       VALUES (?, ?, ?, ?, 0)`,
      [userId, familyCode, husbandFatherFamilyId, wifeFatherFamilyId]
    );

    const familyId = familyResult.insertId;

    // Step 5: Insert all family members with relation_type
    for (const m of members) {
      const {
        member_type,
        relation_type,
        name,
        relationship,
        mobile,
        occupation,
        dob,
        gender,
        door_no,
        street,
        district,
        state,
        pincode,
        photo_field
      } = m;

      if (!name || !relationship) continue;

      // Get photo path from files
      let photoPath = null;
      if (photo_field && req.files) {
        const fileData = req.files[photo_field];
        if (fileData && fileData[0]) {
          // Determine folder based on member type
          let folder = 'parent';
          if (member_type === 'child') folder = 'children';
          else if (member_type === 'sibling') folder = 'siblings';
          photoPath = `${folder}/${fileData[0].filename}`;
        }
      }

      await connection.query(
        `INSERT INTO family_members
         (family_id, member_type, relation_type, name, relationship, mobile, occupation,
          dob, gender, door_no, street, district, state, pincode, photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          familyId,
          member_type || 'parent',
          relation_type || relationship,
          name,
          relationship,
          mobile || null,
          occupation || null,
          dob || null,
          gender || null,
          door_no || null,
          street || null,
          district || null,
          state || null,
          pincode || null,
          photoPath
        ]
      );
    }

    // Step 6: Handle siblings - create separate family records if needed
    if (has_siblings === 'true' || has_siblings === true) {
      const husbandSiblings = members.filter(m => m.member_type === 'sibling' && m.sibling_side === 'husband');
      const wifeSiblings = members.filter(m => m.member_type === 'sibling' && m.sibling_side === 'wife');

      // Create sibling families for husband's side
      for (const sibling of husbandSiblings) {
        const siblingFamilyCode = `FAM-SIB-HF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const [siblingFamilyResult] = await connection.query(
          `INSERT INTO families (user_id, family_code, parent_family_id, spouse_family_id, created_by_admin) 
           VALUES (NULL, ?, ?, NULL, 1)`,
          [siblingFamilyCode, husbandFatherFamilyId]
        );
        const siblingFamilyId = siblingFamilyResult.insertId;

        await connection.query(
          `INSERT INTO family_members
           (family_id, member_type, relation_type, name, relationship, gender, occupation, photo)
           VALUES (?, 'sibling', ?, ?, ?, ?, ?, NULL)`,
          [
            siblingFamilyId,
            sibling.relation_type || sibling.relationship,
            sibling.name,
            sibling.relationship,
            sibling.gender,
            sibling.occupation || null
          ]
        );
      }

      // Create sibling families for wife's side
      for (const sibling of wifeSiblings) {
        const siblingFamilyCode = `FAM-SIB-WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const [siblingFamilyResult] = await connection.query(
          `INSERT INTO families (user_id, family_code, parent_family_id, spouse_family_id, created_by_admin) 
           VALUES (NULL, ?, ?, NULL, 1)`,
          [siblingFamilyCode, wifeFatherFamilyId]
        );
        const siblingFamilyId = siblingFamilyResult.insertId;

        await connection.query(
          `INSERT INTO family_members
           (family_id, member_type, relation_type, name, relationship, gender, occupation, photo)
           VALUES (?, 'sibling', ?, ?, ?, ?, ?, NULL)`,
          [
            siblingFamilyId,
            sibling.relation_type || sibling.relationship,
            sibling.name,
            sibling.relationship,
            sibling.gender,
            sibling.occupation || null
          ]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Family details saved successfully!",
      familyId,
      familyCode
    });

  } catch (err) {
    await connection.rollback();
    console.error("SAVE FAMILY ERROR");
    console.error("Message:", err.message);
    console.error("SQL:", err.sqlMessage);
    console.error("Stack:", err.stack);

    res.status(500).json({
      success: false,
      message: "Failed to save family data",
      error: err.message,
      sql: err.sqlMessage
    });
  } finally {
    connection.release();
  }
};

// Helper to get full family data including siblings and parents
exports.getFullFamilyData = async function (familyId) {
  const [families] = await db.query("SELECT * FROM families WHERE id = ?", [familyId]);
  if (families.length === 0) return { family: null, members: [] };
  const family = families[0];

  let allMembers = [];

  // 1. Get user's immediate family
  const [immediateMembers] = await db.query("SELECT * FROM family_members WHERE family_id = ?", [family.id]);
  allMembers = allMembers.concat(immediateMembers);

  // 2. Get Husband's Parents (parent_family_id)
  if (family.parent_family_id) {
    const [hParents] = await db.query("SELECT * FROM family_members WHERE family_id = ? AND member_type = 'parent'", [family.parent_family_id]);
    hParents.forEach(m => { m.original_member_type = m.member_type; m.member_type = 'husband_parent'; });
    allMembers = allMembers.concat(hParents);

    // Get Husband's Siblings (families with same parent_family_id)
    const [hSiblingFamilies] = await db.query("SELECT id FROM families WHERE parent_family_id = ? AND id != ?", [family.parent_family_id, family.id]);
    for (let sFam of hSiblingFamilies) {
      const [sMembers] = await db.query("SELECT * FROM family_members WHERE family_id = ?", [sFam.id]);
      sMembers.forEach(m => {
        if (m.member_type === 'sibling' || m.member_type === 'parent') {
          m.original_member_type = m.member_type; m.member_type = 'husband_sibling';
        } else if (m.member_type === 'child') {
          m.original_member_type = m.member_type; m.member_type = 'husband_sibling_child';
        }
      });
      allMembers = allMembers.concat(sMembers);
    }
  }

  // 3. Get Wife's Parents (spouse_family_id)
  if (family.spouse_family_id) {
    const [wParents] = await db.query("SELECT * FROM family_members WHERE family_id = ? AND member_type = 'parent'", [family.spouse_family_id]);
    wParents.forEach(m => { m.original_member_type = m.member_type; m.member_type = 'wife_parent'; });
    allMembers = allMembers.concat(wParents);

    // Get Wife's Siblings
    const [wSiblingFamilies] = await db.query("SELECT id FROM families WHERE parent_family_id = ? AND id != ?", [family.spouse_family_id, family.id]);
    for (let sFam of wSiblingFamilies) {
      const [sMembers] = await db.query("SELECT * FROM family_members WHERE family_id = ?", [sFam.id]);
      sMembers.forEach(m => {
        if (m.member_type === 'sibling' || m.member_type === 'parent') {
          m.original_member_type = m.member_type; m.member_type = 'wife_sibling';
        } else if (m.member_type === 'child') {
          m.original_member_type = m.member_type; m.member_type = 'wife_sibling_child';
        }
      });
      allMembers = allMembers.concat(sMembers);
    }
  }

  return { family, members: allMembers };
}

// My Family page (EJS render)
exports.myFamily = async (req, res) => {
  console.log("myFamily controller HIT");
  try {
    const userId = req.session.user.id;
    const [families] = await db.query("SELECT id FROM families WHERE user_id = ? LIMIT 1", [userId]);

    if (families.length === 0) {
      return res.redirect('/family-form');
    }

    const { family, members } = await exports.getFullFamilyData(families[0].id);

    if (!members || members.length === 0) {
      return res.redirect('/family-form');
    }

    return res.render("my-family", { family, members });
  } catch (err) {
    console.error("myFamily ERROR:", err);
    return res.render("my-family", { family: null, members: [] });
  }
};

// ===================== VIEW SPECIFIC FAMILY =====================
exports.viewFamily = async (req, res) => {
  try {
    const { familyId } = req.params;
    const { family, members } = await exports.getFullFamilyData(familyId);
    res.render("my-family", { family, members });
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

/* ================= FAMILY TREE FETCH (For Admin) ================= */

// Recursive function to fetch full family tree
async function fetchFamilyTree(familyId, visited = new Set()) {
  // Prevent infinite recursion
  if (visited.has(familyId)) {
    return null;
  }
  visited.add(familyId);

  try {
    // Get family details
    const [families] = await db.query(
      "SELECT * FROM families WHERE id = ?",
      [familyId]
    );

    if (families.length === 0) {
      return null;
    }

    const family = families[0];

    // Get all members of this family
    const [members] = await db.query(
      "SELECT * FROM family_members WHERE family_id = ?",
      [familyId]
    );

    // Build the tree node
    const treeNode = {
      id: family.id,
      family_code: family.family_code,
      parent_family_id: family.parent_family_id,
      spouse_family_id: family.spouse_family_id,
      members: members,
      children: [],
      siblings: []
    };

    // Recursively fetch parent family (blood relation)
    if (family.parent_family_id) {
      treeNode.parent = await fetchFamilyTree(family.parent_family_id, visited);
    }

    // Recursively fetch spouse family (marriage relation)
    if (family.spouse_family_id) {
      treeNode.spouse = await fetchFamilyTree(family.spouse_family_id, visited);
    }

    // Find children families (families that have this family as parent)
    const [childFamilies] = await db.query(
      "SELECT id FROM families WHERE parent_family_id = ?",
      [familyId]
    );

    for (const childFamily of childFamilies) {
      const childTree = await fetchFamilyTree(childFamily.id, visited);
      if (childTree) {
        treeNode.children.push(childTree);
      }
    }

    // Find sibling families (families with same parent)
    if (family.parent_family_id) {
      const [siblingFamilies] = await db.query(
        "SELECT id FROM families WHERE parent_family_id = ? AND id != ?",
        [family.parent_family_id, familyId]
      );

      for (const sibFamily of siblingFamilies) {
        const sibTree = await fetchFamilyTree(sibFamily.id, visited);
        if (sibTree) {
          treeNode.siblings.push(sibTree);
        }
      }
    }

    return treeNode;
  } catch (err) {
    console.error("Error fetching family tree:", err);
    return null;
  }
}

// Get family tree for a specific user
exports.getFamilyTree = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the user's family
    const [families] = await db.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (families.length === 0) {
      return res.json({ success: false, message: "Family not found" });
    }

    const familyId = families[0].id;
    const tree = await fetchFamilyTree(familyId);

    res.json({ success: true, tree });
  } catch (err) {
    console.error("Error getting family tree:", err);
    res.status(500).json({ success: false, message: "Failed to fetch family tree" });
  }
};

// Get simple family tree (flattened for simpler rendering)
exports.getSimpleFamilyTree = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the user's family
    const [families] = await db.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (families.length === 0) {
      return res.json({ success: false, message: "Family not found" });
    }

    const familyId = families[0].id;
    const tree = await fetchFamilyTree(familyId);

    // Convert to simple structure for UI
    const simpleTree = convertToSimpleTree(tree);

    res.json({ success: true, tree: simpleTree });
  } catch (err) {
    console.error("Error getting simple family tree:", err);
    res.status(500).json({ success: false, message: "Failed to fetch family tree" });
  }
};

// Helper function to convert tree to simple structure
function convertToSimpleTree(node, visited = new Set()) {
  if (!node || visited.has(node.id)) {
    return null;
  }
  visited.add(node.id);

  const simple = {
    id: node.id,
    family_code: node.family_code,
    members: node.members.map(m => ({
      id: m.id,
      name: m.name,
      relationship: m.relationship,
      relation_type: m.relation_type,
      gender: m.gender,
      occupation: m.occupation,
      photo: m.photo,
      mobile: m.mobile
    }))
  };

  if (node.parent) {
    simple.parents = convertToSimpleTree(node.parent, visited);
  }

  if (node.spouse) {
    simple.spouse = convertToSimpleTree(node.spouse, visited);
  }

  if (node.children && node.children.length > 0) {
    simple.children = node.children
      .map(c => convertToSimpleTree(c, visited))
      .filter(c => c !== null);
  }

  if (node.siblings && node.siblings.length > 0) {
    simple.siblings = node.siblings
      .map(s => convertToSimpleTree(s, visited))
      .filter(s => s !== null);
  }

  return simple;
}

// ===================== EDIT/UPDATE FAMILY (FULL FORM) =====================
exports.editFamilyFull = async (req, res) => {
  try {
    const { familyId } = req.params;
    let targetFamilyId = familyId;

    if (!targetFamilyId) {
      if (!req.session.user) return res.redirect('/login');
      const [families] = await db.query("SELECT id FROM families WHERE user_id = ? LIMIT 1", [req.session.user.id]);
      if (families.length === 0) return res.redirect('/dashboard');
      targetFamilyId = families[0].id;
    }

    const { family, members } = await exports.getFullFamilyData(targetFamilyId);
    if (!family) return res.redirect('/dashboard');

    res.render("family-edit-full", { family, members });
  } catch (err) {
    console.error("Error loading family for edit:", err);
    res.status(500).send("Server error loading family edit page");
  }
};

exports.updateFamilyFull = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.session.user.id;
    let { husband_name, wife_name, has_siblings, members } = req.body;

    if (typeof members === "string") {
      try { members = JSON.parse(members); } catch (e) { members = []; }
    }
    if (!Array.isArray(members)) members = [];

    await connection.beginTransaction();

    const familyId = req.params.familyId;
    const [familyRes] = await connection.query("SELECT * FROM families WHERE id = ?", [familyId]);
    if (familyRes.length === 0) throw new Error("Family not found");
    const family = familyRes[0];

    // Collect all existing photos for this family to preserve them
    const [existingMembers] = await connection.query("SELECT id, member_type, relation_type, relationship, name, photo FROM family_members WHERE family_id = ?", [family.id]);

    // Also fetch photos from dummy parent families if any
    let existingParents = [];
    if (family.parent_family_id) {
      const [hParents] = await connection.query("SELECT member_type, relation_type, relationship, name, photo FROM family_members WHERE family_id = ?", [family.parent_family_id]);
      existingParents.push(...hParents);
    }
    if (family.spouse_family_id) {
      const [wParents] = await connection.query("SELECT member_type, relation_type, relationship, name, photo FROM family_members WHERE family_id = ?", [family.spouse_family_id]);
      existingParents.push(...wParents);
    }

    // Also fetch photos from sibling families
    let existingSiblings = [];
    if (family.parent_family_id) {
      const [hSibs] = await connection.query("SELECT m.member_type, m.relation_type, m.relationship, m.name, m.photo FROM family_members m JOIN families f ON m.family_id = f.id WHERE f.parent_family_id = ? AND f.family_code LIKE '%FAM-SIB-%'", [family.parent_family_id]);
      existingSiblings.push(...hSibs);
    }
    if (family.spouse_family_id) {
      const [wSibs] = await connection.query("SELECT m.member_type, m.relation_type, m.relationship, m.name, m.photo FROM family_members m JOIN families f ON m.family_id = f.id WHERE f.parent_family_id = ? AND f.family_code LIKE '%FAM-SIB-%'", [family.spouse_family_id]);
      existingSiblings.push(...wSibs);
    }

    // Step 1: Find or create husband's father's family
    let husbandFatherFamilyId = family.parent_family_id;
    const husbandFather = members.find(m => m.relation_type === 'father' && m.sibling_side !== 'wife');

    if (husbandFather && husbandFather.name) {
      if (!husbandFatherFamilyId) {
        const [fatherFamilyResult] = await connection.query("INSERT INTO families (user_id, family_code, created_by_admin) VALUES (NULL, ?, 1)", [`FAM-D-HF-${Date.now()}`]);
        husbandFatherFamilyId = fatherFamilyResult.insertId;
      }
      // Update or replace father member
      await connection.query("DELETE FROM family_members WHERE family_id = ? AND member_type = 'parent' AND relationship = 'father'", [husbandFatherFamilyId]);

      let pPhoto = null;
      if (husbandFather.photo_field && req.files && req.files[husbandFather.photo_field]) {
        pPhoto = `parent/${req.files[husbandFather.photo_field][0].filename}`;
      } else {
        const op = existingParents.find(p => p.relationship === 'father' && p.name === husbandFather.name);
        if (op) pPhoto = op.photo;
      }
      await connection.query(
        "INSERT INTO family_members (family_id, member_type, name, relationship, gender, occupation, relation_type, photo) VALUES (?, 'parent', ?, 'father', 'Male', ?, 'father', ?)",
        [husbandFatherFamilyId, husbandFather.name, husbandFather.occupation || null, pPhoto]
      );
    }

    // Step 2: Find or create wife's father's family
    let wifeFatherFamilyId = family.spouse_family_id;
    const wifeFather = members.find(m => m.relation_type === 'father' && m.sibling_side === 'wife');

    if (wifeFather && wifeFather.name) {
      if (!wifeFatherFamilyId) {
        const [wfFamilyResult] = await connection.query("INSERT INTO families (user_id, family_code, created_by_admin) VALUES (NULL, ?, 1)", [`FAM-D-WF-${Date.now()}`]);
        wifeFatherFamilyId = wfFamilyResult.insertId;
      }
      await connection.query("DELETE FROM family_members WHERE family_id = ? AND member_type = 'parent' AND relationship = 'father'", [wifeFatherFamilyId]);

      let pPhoto = null;
      if (wifeFather.photo_field && req.files && req.files[wifeFather.photo_field]) {
        pPhoto = `parent/${req.files[wifeFather.photo_field][0].filename}`;
      } else {
        const op = existingParents.find(p => p.relationship === 'father' && p.name === wifeFather.name);
        if (op) pPhoto = op.photo;
      }
      await connection.query(
        "INSERT INTO family_members (family_id, member_type, name, relationship, gender, occupation, relation_type, photo) VALUES (?, 'parent', ?, 'father', 'Male', ?, 'father', ?)",
        [wifeFatherFamilyId, wifeFather.name, wifeFather.occupation || null, pPhoto]
      );
    }

    // Update family pointers
    await connection.query("UPDATE families SET parent_family_id = ?, spouse_family_id = ? WHERE id = ?", [husbandFatherFamilyId, wifeFatherFamilyId, family.id]);

    // Step 3: Replace immediate family members (husband, wife, children)
    await connection.query("DELETE FROM family_members WHERE family_id = ?", [family.id]);

    // Filter out parents/siblings that belong in dummy families
    const immediateMembers = members.filter(m => {
      if (m.member_type === 'parent') return false;
      if (m.relation_type === 'father' || m.relation_type === 'mother') return false; // mother should be caught here
      if (m.member_type === 'sibling') return false;
      return true;
    });

    for (const m of immediateMembers) {
      const { member_type, relation_type, name, relationship, mobile, occupation, dob, gender, door_no, street, district, state, pincode, photo_field } = m;
      if (!name || !relationship) continue;

      let photoPath = null;
      if (photo_field && req.files && req.files[photo_field]) {
        let folder = member_type === 'child' ? 'children' : 'parent';
        photoPath = `${folder}/${req.files[photo_field][0].filename}`;
      } else {
        const oldMember = existingMembers.find(em => em.relationship === relationship && em.name === name) || existingMembers.find(em => em.relationship === relationship);
        if (oldMember) photoPath = oldMember.photo;
      }

      await connection.query(
        `INSERT INTO family_members (family_id, member_type, relation_type, name, relationship, mobile, occupation, dob, gender, door_no, street, district, state, pincode, photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [family.id, member_type || 'parent', relation_type || relationship, name, relationship, mobile || null, occupation || null, dob || null, gender || null, door_no || null, street || null, district || null, state || null, pincode || null, photoPath]
      );
    }

    // Step 4: Add Mothers to dummy families if any
    const husbandMother = members.find(m => m.relation_type === 'mother' && m.sibling_side !== 'wife');
    if (husbandMother && husbandMother.name && husbandFatherFamilyId) {
      await connection.query("DELETE FROM family_members WHERE family_id = ? AND relationship = 'mother'", [husbandFatherFamilyId]);
      let mPhoto = null;
      if (husbandMother.photo_field && req.files && req.files[husbandMother.photo_field]) mPhoto = `parent/${req.files[husbandMother.photo_field][0].filename}`;
      else { const op = existingParents.find(p => p.relationship === 'mother' && p.name === husbandMother.name); if (op) mPhoto = op.photo; }

      await connection.query("INSERT INTO family_members (family_id, member_type, name, relationship, gender, occupation, relation_type, photo) VALUES (?, 'parent', ?, 'mother', 'Female', ?, 'mother', ?)", [husbandFatherFamilyId, husbandMother.name, husbandMother.occupation || null, mPhoto]);
    }

    const wifeMother = members.find(m => m.relation_type === 'mother' && m.sibling_side === 'wife');
    if (wifeMother && wifeMother.name && wifeFatherFamilyId) {
      await connection.query("DELETE FROM family_members WHERE family_id = ? AND relationship = 'mother'", [wifeFatherFamilyId]);
      let mPhoto = null;
      if (wifeMother.photo_field && req.files && req.files[wifeMother.photo_field]) mPhoto = `parent/${req.files[wifeMother.photo_field][0].filename}`;
      else { const op = existingParents.find(p => p.relationship === 'mother' && p.name === wifeMother.name); if (op) mPhoto = op.photo; }

      await connection.query("INSERT INTO family_members (family_id, member_type, name, relationship, gender, occupation, relation_type, photo) VALUES (?, 'parent', ?, 'mother', 'Female', ?, 'mother', ?)", [wifeFatherFamilyId, wifeMother.name, wifeMother.occupation || null, mPhoto]);
    }

    // Step 5: Handle siblings
    // First, delete old sibling families (FAM-SIB-...) for these parents
    if (husbandFatherFamilyId) {
      const [oldSibsH] = await connection.query("SELECT id FROM families WHERE parent_family_id = ? AND family_code LIKE '%FAM-SIB-%'", [husbandFatherFamilyId]);
      for (let sFam of oldSibsH) {
        await connection.query("DELETE FROM family_members WHERE family_id = ?", [sFam.id]);
        await connection.query("DELETE FROM families WHERE id = ?", [sFam.id]);
      }
    }
    if (wifeFatherFamilyId) {
      const [oldSibsW] = await connection.query("SELECT id FROM families WHERE parent_family_id = ? AND family_code LIKE '%FAM-SIB-%'", [wifeFatherFamilyId]);
      for (let sFam of oldSibsW) {
        await connection.query("DELETE FROM family_members WHERE family_id = ?", [sFam.id]);
        await connection.query("DELETE FROM families WHERE id = ?", [sFam.id]);
      }
    }

    if (has_siblings === 'true' || has_siblings === true || has_siblings === 'on') {
      const husbandSiblings = members.filter(m => m.member_type === 'sibling' && m.sibling_side === 'husband');
      const wifeSiblings = members.filter(m => m.member_type === 'sibling' && m.sibling_side === 'wife');

      for (const sibling of husbandSiblings) {
        if (!husbandFatherFamilyId || !sibling.name) continue;
        const [sibFam] = await connection.query("INSERT INTO families (user_id, family_code, parent_family_id, created_by_admin) VALUES (NULL, ?, ?, 1)", [`FAM-SIB-HF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, husbandFatherFamilyId]);

        let sPhoto = null;
        if (sibling.photo_field && req.files && req.files[sibling.photo_field]) sPhoto = `siblings/${req.files[sibling.photo_field][0].filename}`;
        else { const op = existingSiblings.find(s => s.name === sibling.name); if (op) sPhoto = op.photo; }

        await connection.query("INSERT INTO family_members (family_id, member_type, relation_type, name, relationship, gender, occupation, photo) VALUES (?, 'sibling', ?, ?, ?, ?, ?, ?)", [sibFam.insertId, sibling.relation_type || sibling.relationship, sibling.name, sibling.relationship, sibling.gender, sibling.occupation || null, sPhoto]);
      }

      for (const sibling of wifeSiblings) {
        if (!wifeFatherFamilyId || !sibling.name) continue;
        const [sibFam] = await connection.query("INSERT INTO families (user_id, family_code, parent_family_id, created_by_admin) VALUES (NULL, ?, ?, 1)", [`FAM-SIB-WF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, wifeFatherFamilyId]);

        let sPhoto = null;
        if (sibling.photo_field && req.files && req.files[sibling.photo_field]) sPhoto = `siblings/${req.files[sibling.photo_field][0].filename}`;
        else { const op = existingSiblings.find(s => s.name === sibling.name); if (op) sPhoto = op.photo; }

        await connection.query("INSERT INTO family_members (family_id, member_type, relation_type, name, relationship, gender, occupation, photo) VALUES (?, 'sibling', ?, ?, ?, ?, ?, ?)", [sibFam.insertId, sibling.relation_type || sibling.relationship, sibling.name, sibling.relationship, sibling.gender, sibling.occupation || null, sPhoto]);
      }
    }

    await connection.commit();
    res.json({ success: true, message: "Family updated successfully" });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Update Family Full Error:", err);
    res.status(500).json({ success: false, message: "Failed to update family", error: err.message });
  } finally {
    if (connection) connection.release();
  }
};
