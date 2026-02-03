const bcrypt = require("bcryptjs");
const db = require("../config/db");

/* ================= AUTH ================= */

exports.showLogin = (req, res) => {
  res.render("family-login");
};

exports.showRegister = (req, res) => {
  res.render("family-register");
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!users.length) {
      return res.status(400).send("Invalid email or password");
    }

    const user = users[0];
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

exports.register = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).send("Passwords do not match");
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hash]
    );

    res.redirect("/login");
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).send("Server error");
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
};

/* ================= DASHBOARD ================= */

exports.dashboard = async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const userId = req.session.user.id;

    const [families] = await db.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    res.render("dashboard", {
      hasFamily: families.length > 0,
      user: req.session.user
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Server error");
  }
};

/* ================= FAMILY CHECK ================= */

exports.checkFamily = async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const userId = req.session.user.id;

  const [families] = await db.query(
    "SELECT id FROM families WHERE user_id = ? LIMIT 1",
    [userId]
  );

  if (families.length) return res.redirect("/my-family");
  return res.redirect("/family-form");
};

/* ================= FAMILY FORM ================= */

exports.showFamilyForm = (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("family-form");
};

/* ================= SAVE FAMILY ================= */

exports.saveFamily = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = req.session.user.id;
    let members = req.body.members || [];

    if (typeof members === "string") {
      members = JSON.parse(members);
    }

    await connection.beginTransaction();

    const [exists] = await connection.query(
      "SELECT id FROM families WHERE user_id = ?",
      [userId]
    );

    if (exists.length) {
      await connection.rollback();
      return res.json({ success: true, exists: true });
    }

    const [familyResult] = await connection.query(
      "INSERT INTO families (user_id, family_code) VALUES (?, ?)",
      [userId, `FAM-${Date.now()}`]
    );

    const familyId = familyResult.insertId;

    for (const m of members) {
      if (!m.name || !m.relationship) continue;

      await connection.query(
        `INSERT INTO family_members
        (family_id, member_type, name, relationship, mobile, occupation, dob, gender,
         door_no, street, district, state, pincode, photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          familyId,
          m.member_type || "child",
          m.name,
          m.relationship,
          m.mobile || null,
          m.occupation || null,
          m.dob || null,
          m.gender || null,
          m.door_no || null,
          m.street || null,
          m.district || null,
          m.state || null,
          m.pincode || null,
          null
        ]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error("Save family error:", err);
    res.status(500).json({ success: false });
  } finally {
    connection.release();
  }
};

/* ================= MY FAMILY ================= */

exports.myFamily = async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const userId = req.session.user.id;

    const [families] = await db.query(
      "SELECT * FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!families.length) {
      return res.render("my-family", { family: null, members: [] });
    }

    const family = families[0];

    const [members] = await db.query(
      "SELECT * FROM family_members WHERE family_id = ?",
      [family.id]
    );

    res.render("my-family", { family, members });
  } catch (err) {
    console.error("My family error:", err);
    res.render("my-family", { family: null, members: [] });
  }
};

/* ================= CHILD CRUD ================= */

exports.addChild = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false });
  }

  try {
    const userId = req.session.user.id;
    const { name, dob, gender } = req.body;

    const [families] = await db.query(
      "SELECT id FROM families WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!families.length) {
      return res.status(400).json({ success: false });
    }

    await db.query(
      `INSERT INTO family_members
       (family_id, member_type, name, dob, gender)
       VALUES (?, 'child', ?, ?, ?)`,
      [families[0].id, name, dob || null, gender || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Add child error:", err);
    res.status(500).json({ success: false });
  }
};

exports.deleteChild = async (req, res) => {
  try {
    await db.query("DELETE FROM family_members WHERE id = ?", [
      req.params.id
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete child error:", err);
    res.status(500).json({ success: false });
  }
};
