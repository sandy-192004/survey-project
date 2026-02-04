const bcrypt = require("bcryptjs");
const db = require("../config/db");
const fs = require("fs");
const path = require("path");

/* ================= AUTH ================= */

// Show login page
exports.showLogin = (req, res) => {
  res.render("family-login");
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
      return res.status(400).send("Invalid email or password");
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).send("Invalid email or password");
    }

    req.session.user = { id: user.id, email: user.email };
    res.redirect("/dashboard");
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
/*******  88ec1cc0-9866-4f21-88ad-db885cafd9bc  *******/
      return res.status(400).send("Passwords do not match");
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
    res.redirect("/login");
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

    res.render("dashboard", {
      user: req.session.user,
      message: req.query.message || null,
      hasFamily
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", {
      user: req.session.user,
      message: req.query.message || null,
      hasFamily: false
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
exports.showForm = (req, res) => {
  res.render("family-form", { addChildMode: false });
};

exports.showFamilyForm = (req, res) => {
  res.render("family-form", { addChildMode: false });
};

// Save family data
exports.saveFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.session.user.id;

    console.log("📥 Received Body:", req.body);
    console.log("📎 Received Files:", req.files);

    let { husband_name, members } = req.body;

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

    // Step 2: Create family
    const familyCode = `FAM-${Date.now()}`;
    const [familyResult] = await connection.query(
      "INSERT INTO families (user_id, family_code) VALUES (?, ?)",
      [userId, familyCode]
    );

    const familyId = familyResult.insertId;

    // Step 3: Insert family members
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const {
        member_type,
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
        pincode
      } = m;

      // Default gender for husband
      let finalGender = gender;
      if (relationship === 'husband' && !gender) {
        finalGender = 'Male';
      }

      if (!name || !relationship) continue;

      // Handle file uploads
      let photoPath = null;
      if (req.files) {
        if (member_type === 'parent') {
          if (relationship === 'husband') {
            const husbandFiles = req.files['parent[husband_photo]'];
            if (husbandFiles && husbandFiles[0]) {
              photoPath = `parents/${husbandFiles[0].filename}`;
              const filePath = path.join('uploads', photoPath);
              const stats = fs.statSync(filePath);
              photoPath = `${photoPath}(${stats.size})`;
            }
          } else if (relationship === 'wife') {
            const wifeFiles = req.files['parent[wife_photo]'];
            if (wifeFiles && wifeFiles[0]) {
              photoPath = `parents/${wifeFiles[0].filename}`;
              const filePath = path.join('uploads', photoPath);
              const stats = fs.statSync(filePath);
              photoPath = `${photoPath}(${stats.size})`;
            }
          }
        } else if (member_type === 'child') {
          const childFiles = req.files[`children[${i - 2}][photo]`]; // Adjust index since parents come first
          if (childFiles && childFiles[0]) {
            photoPath = `children/${childFiles[0].filename}`;
            const filePath = path.join('uploads', photoPath);
            const stats = fs.statSync(filePath);
            photoPath = `${photoPath}(${stats.size})`;
          }
        }
      }

      await connection.query(
        `INSERT INTO family_members
         (family_id, member_type, name, relationship, mobile, occupation,
          dob, gender, door_no, street, district, state, pincode, photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          familyId,
          member_type || "child",
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

// My Family page (EJS render)
exports.myFamily = async (req, res) => {
  console.log("myFamily controller HIT");

  try {
    const userId = req.session.user.id;

    let family = null;
    let members = []; 
    const [families] = await db.query(
      "SELECT * FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (families.length > 0) {
      family = families[0];

      const [rows] = await db.query(
        "SELECT * FROM family_members WHERE family_id = ?",
        [family.id]
      );

      members = rows || [];
    }

    return res.render("my-family", {
      family,
      members
    });

  } catch (err) {
    console.error("myFamily ERROR:", err);

    return res.render("my-family", {
      family: null,
      members: []
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
    if (req.files && req.files['photo'] && req.files['photo'][0]) {
      photoPath = `children/${req.files['photo'][0].filename}`;
      const filePath = path.join('uploads', photoPath);
      const stats = fs.statSync(filePath);
      photoPath = `${photoPath}(${stats.size})`;
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
      const filePath = path.join('uploads', photoPath);
      const stats = fs.statSync(filePath);
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

    // Get parent members for this user
    const [members] = await db.query(
      "SELECT fm.* FROM family_members fm JOIN families f ON fm.family_id = f.id WHERE f.user_id = ? AND fm.member_type = 'parent'",
      [userId]
    );

    if (members.length === 0) {
      return res.redirect("/family-form");
    }

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
        husbandPhotoPath = `parents/${req.files['husband_photo'][0].filename}`;
        const filePath = path.join('uploads', husbandPhotoPath);
        const stats = fs.statSync(filePath);
        husbandPhotoPath = `${husbandPhotoPath}(${stats.size})`;
      }
      if (req.files['wife_photo'] && req.files['wife_photo'][0]) {
        wifePhotoPath = `parents/${req.files['wife_photo'][0].filename}`;
        const filePath = path.join('uploads', wifePhotoPath);
        const stats = fs.statSync(filePath);
        wifePhotoPath = `${wifePhotoPath}(${stats.size})`;
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
    let photoPath = null;
    if (req.file) {
      photoPath = `parents/${req.file.filename}`;
      const filePath = path.join('uploads', photoPath);
      const stats = fs.statSync(filePath);
      photoPath = `${photoPath}(${stats.size})`;
    }

    // Verify the member belongs to the user
    const [members] = await db.query(
      "SELECT * FROM family_members WHERE id = ? AND family_id IN (SELECT id FROM families WHERE user_id = ?)",
      [memberId, userId]
    );

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    let sql, params;
    if (photoPath) {
      sql = `
        UPDATE family_members
        SET name=?, relationship=?, mobile=?, occupation=?, dob=?, gender=?, door_no=?, street=?, district=?, state=?, pincode=?, photo=?
        WHERE id=?
      `;
      params = [name, relationship, mobile, occupation, dob, gender, door_no, street, district, state, pincode, photoPath, memberId];
    } else {
      sql = `
        UPDATE family_members
        SET name=?, relationship=?, mobile=?, occupation=?, dob=?, gender=?, door_no=?, street=?, district=?, state=?, pincode=?
        WHERE id=?
      `;
      params = [name, relationship, mobile, occupation, dob, gender, door_no, street, district, state, pincode, memberId];
    }

    await db.query(sql, params);
    res.json({ success: true, message: "Member updated successfully" });
  } catch (err) {
    console.error("Update member error:", err);
    res.status(500).json({ success: false, message: "Failed to update member", error: err.message });
  }
};