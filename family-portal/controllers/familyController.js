const User = require("../models/User");
const FamilyMember = require("../models/FamilyMember");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

/* ================= AUTH ================= */

// Show login
exports.showLogin = (req, res) => {
  res.render("family-login");
};

// Show register
exports.showRegister = (req, res) => {
  res.render("family-register");
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const users = await User.getByEmail(email);
    if (users.length === 0) {
      return res.status(400).send("Invalid email or password");
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send("Invalid email or password");

    req.session.user = { id: user.id, email: user.email };
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Register
exports.register = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).send("Passwords do not match");
    }

    const hash = await bcrypt.hash(password, 10);
    await User.create({ email, password: hash });

    res.redirect("/login?registered=true");
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send("Registration failed. Please try again.");
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
};

/* ================= DASHBOARD ================= */

exports.dashboard = (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("dashboard");
};

exports.checkFamily = async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const userId = req.session.user.id;

    const [family] = await db.query(
      "SELECT * FROM families WHERE user_id = ?",
      [userId]
    );

    if (!family.length) {
      return res.redirect("/family-form");
    }

    const familyId = family[0].id;
    const [members] = await db.query(
      "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
      [familyId]
    );

    if (members.length > 0) {
      return res.redirect("/my-family");
    }

    return res.redirect("/family-form");
  } catch (err) {
    console.error("Database error in checkFamily:", err);
    // If database is not available, redirect to family form
    return res.redirect("/family-form");
  }
};

/* ================= FAMILY LOGIC ================= */

// 🔑 CORE ROUTE: /family
exports.familyLogic = async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const userId = req.session.user.id;
    const Person = require("../models/Person");

    const [personRows] = await Person.getByUserId(userId);

    if (personRows.length === 0) {
      // No family, show family form
      return res.render("family-form", { addChildMode: false });
    }

    const familyId = personRows[0].family_id;
    const [members] = await db.query(
      "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
      [familyId]
    );

    if (members.length > 0) {
      // Has family, show my-family
      const members = await FamilyMember.getByFamilyId(familyId);
      return res.render("my-family", {
        family: personRows[0],
        members
      });
    }

    // No members yet, show form
    return res.render("family-form", { addChildMode: false });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

/* ================= FAMILY FORM ================= */

exports.showForm = (req, res) => {
  res.render("family-form", {
    addChildMode: false
  });
};

exports.showFamilyForm = (req, res) => {
  res.render("family-form", {
    addChildMode: false
  });
};

exports.saveFamily = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const userId = req.session.user.id;

    // 1️⃣ Create family
    const [family] = await conn.query(
      "INSERT INTO families (user_id) VALUES (?)",
      [userId]
    );

    const familyId = family.insertId;

    // 2️⃣ Parse members
    const members = req.body.members;
    if (!members) throw new Error("No members received");

    // 3️⃣ Save members
    for (let i in members) {
      const m = members[i];

      const photoFile = req.files?.find(
        f => f.fieldname === `members[${i}][photo]`
      );

      await conn.query(
        `INSERT INTO family_members
         (family_id, member_type, relationship, name, mobile, photo)
         VALUES (?,?,?,?,?,?)`,
        [
          familyId,
          m.member_type,
          m.relationship,
          m.name,
          m.mobile || null,
          photoFile ? photoFile.filename : null
        ]
      );
    }

    await conn.commit();
    res.json({ success: true });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// ORIGINAL VERSION (commented out for now)
/*
exports.saveFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.session.user.id;

    // DEBUG: Log what we receive
    console.log("🔍 DEBUG - req.body:", req.body);
    console.log("🔍 DEBUG - req.files:", req.files);

    // form fields
    let {
      husband_name,
      members // comes as JSON string from frontend
    } = req.body;

    // Parse members if it's a string
    if (typeof members === 'string') {
      try {
        members = JSON.parse(members);
      } catch (e) {
        console.error("Failed to parse members JSON:", e);
        members = [];
      }
    }

    // Ensure members is an array
    if (!Array.isArray(members)) {
      members = [];
    }

    await connection.beginTransaction();

    // Check if user already has a family
    const [existingPersons] = await connection.query(
      "SELECT id FROM persons WHERE user_id = ?",
      [userId]
    );

    if (existingPersons.length > 0) {
      throw new Error("User already has a family record");
    }

    // 1️⃣ create family
    const [familyResult] = await connection.query(
      "INSERT INTO families () VALUES ()"
    );

    const familyId = familyResult.insertId;

    // 2️⃣ link user → family
    await connection.query(
      "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
      [userId, familyId, husband_name]
    );

    // 3️⃣ insert family members
    for (const member of members) {
      await connection.query(
        `INSERT INTO family_members
         (family_id, member_type, name, relationship, mobile, occupation,
          dob, gender, door_no, street, district, state, pincode, photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          familyId,
          member.member_type,
          member.name,
          member.relationship,
          member.mobile,
          member.occupation,
          member.dob,
          member.gender,
          member.door_no,
          member.street,
          member.district,
          member.state,
          member.pincode,
          member.photo
        ]
      );
    }

    await connection.commit();

    // ✅ IMPORTANT: send JSON success
    res.json({ success: true });

  } catch (err) {
    await connection.rollback();
    console.error("🔥 SAVE FAMILY ERROR 🔥");
    console.error("Full error:", err);
    console.error("SQL Message:", err.sqlMessage);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Failed to save family",
      error: err.message,
      sql: err.sqlMessage
    });
  } finally {
    connection.release();
  }
};
*/

/* ================= FAMILY CHECK ================= */

exports.checkFamilyExists = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [rows] = await db.query(
      "SELECT id FROM persons WHERE user_id = ? LIMIT 1",
      [userId]
    );

    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error("checkFamilyExists error:", err);
    res.status(500).json({ exists: false });
  }
};

/* ================= MY FAMILY ================= */

exports.myFamily = async (req, res) => {
  const userId = req.session.user.id;

  const [personRows] = await Person.getByUserId(userId);

  if (!personRows || personRows.length === 0) {
    // No family yet
    return res.render("family-form");
  }

  const person = personRows[0];
  const members = await FamilyMember.getByFamilyId(person.family_id);

  if (!members || members.length === 0) {
    return res.redirect("/dashboard");
  }

  res.render("my-family", {
    family: person,
    members
  });
};

exports.myFamilyJson = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const Person = require("../models/Person");

    const [personRows] = await Person.getByUserId(userId);

    if (personRows.length === 0) {
      res.json({ success: false });
    } else {
      const familyId = personRows[0].family_id;
      const [members] = await db.promise().query(
        "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
        [familyId]
      );
      res.json({ success: members.length > 0 });
    }
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

/* ================= ADD CHILD ================= */

exports.showAddChild = (req, res) => {
  res.render("add-child");
};

exports.addChild = async (req, res) => {
  const familyId = req.session.user.id;
  const { name, dob, gender, occupation } = req.body;

  await db.query(
    `INSERT INTO children
     (family_id, name, dob, gender, occupation)
     VALUES (?, ?, ?, ?, ?)`,
    [familyId, name, dob, gender, occupation]
  );

  res.redirect("/my-family");
};

/* ================= EDIT FAMILY ================= */

exports.editForm = async (req, res) => {
  try {
    const id = req.params.id;
    const [members] = await db.query(
      "SELECT * FROM family_members WHERE id = ?",
      [id]
    );
    if (members.length === 0) {
      return res.status(404).send("Member not found");
    }
    res.render("family-edit", { member: members[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.updateFamily = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, mobile, occupation, dob, gender, door_no, street, district, state, pincode } = req.body;

    await db.query(
      `UPDATE family_members SET
       name = ?, mobile = ?, occupation = ?, dob = ?, gender = ?,
       door_no = ?, street = ?, district = ?, state = ?, pincode = ?
       WHERE id = ?`,
      [name, mobile, occupation, dob, gender, door_no, street, district, state, pincode, id]
    );

    res.redirect("/my-family");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.deleteFamily = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query("DELETE FROM family_members WHERE id = ?", [id]);
    res.redirect("/my-family");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

/* ================= VIEW FAMILY ================= */

exports.viewFamily = async (req, res) => {
  try {
    const familyId = req.params.familyId;
    const [members] = await FamilyMember.getByFamilyId(familyId);
    res.render("my-family", { members });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.getMyFamilyJson = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const Person = require("../models/Person");

    const [personRows] = await Person.getByUserId(userId);

    if (personRows.length === 0) {
      res.json({ success: false });
    } else {
      const familyId = personRows[0].family_id;
      const [members] = await db.query(
        "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
        [familyId]
      );
      res.json({ success: members.length > 0 });
    }
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};
