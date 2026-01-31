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
exports.login = (req, res) => {
  const { email, password } = req.body;

  User.getByEmail(email, (err, users) => {
    if (err || users.length === 0) {
      return res.status(400).send("Invalid email or password");
    }

    const user = users[0];

    bcrypt.compare(password, user.password, (err, match) => {
      if (!match) return res.status(400).send("Invalid email or password");

      req.session.user = { id: user.id, email: user.email };
      res.redirect("/dashboard");
    });
  });
};

// Register
exports.register = (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  bcrypt.hash(password, 10, (err, hash) => {
    User.create({ email, password: hash }, () => {
      res.redirect("/login?registered=true");
    });
  });
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

/* ================= FAMILY LOGIC ================= */

// 🔑 CORE ROUTE: /family
exports.familyLogic = async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const userId = req.session.user.id;
    const Person = require("../models/Person");

    const [personRows] = await Person.getByUserId(userId);

    if (personRows.length === 0) {
      return res.redirect("/family-form");
    }

    const familyId = personRows[0].family_id;
    const [members] = await db.promise().query(
      "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
      [familyId]
    );

    if (members.length > 0) {
      return res.redirect("/my-family");
    }

    return res.redirect("/family-form");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

/* ================= FAMILY FORM ================= */

exports.showFamilyForm = (req, res) => {
  res.render("family-form");
};

// Save parents
exports.saveFamily = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { parent, children } = req.body;

    const Person = require("../models/Person");
    const FamilyMember = require("../models/FamilyMember");

    // Get family_id from persons table
    const [personRows] = await Person.getByUserId(userId);
    if (personRows.length === 0) {
      return res.status(400).send("No family found for user");
    }
    const familyId = personRows[0].family_id;

    // Insert parents
    await FamilyMember.create({
      family_id: familyId,
      member_type: 'parent',
      name: parent.name,
      relationship: 'self',
      mobile: parent.mobile,
      occupation: parent.occupation || '',
      dob: parent.dob || null,
      gender: parent.gender || '',
      door_no: parent.door_no,
      street: parent.street,
      district: parent.district,
      state: parent.state,
      pincode: parent.pincode,
      photo: null
    });

    await FamilyMember.create({
      family_id: familyId,
      member_type: 'parent',
      name: parent.wife_name,
      relationship: 'spouse',
      mobile: parent.mobile_wife,
      occupation: parent.wife_occupation || '',
      dob: parent.wife_dob || null,
      gender: parent.wife_gender || '',
      door_no: parent.door_no,
      street: parent.street,
      district: parent.district,
      state: parent.state,
      pincode: parent.pincode,
      photo: null
    });

    // Insert children if any
    if (children && Array.isArray(children)) {
      for (const child of children) {
        await FamilyMember.create({
          family_id: familyId,
          member_type: 'child',
          name: child.name,
          relationship: child.relationship || 'child',
          mobile: child.mobile || '',
          occupation: child.occupation || '',
          dob: child.dob,
          gender: child.gender,
          door_no: '',
          street: '',
          district: '',
          state: '',
          pincode: '',
          photo: null
        });
      }
    }

    res.redirect("/dashboard?success=true");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

/* ================= MY FAMILY ================= */

exports.myFamily = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const Person = require("../models/Person");
    const FamilyMember = require("../models/FamilyMember");

    const [personRows] = await Person.getByUserId(userId);

    if (personRows.length === 0) {
      return res.render("family-form", {
        message: "No family found. Please add family details."
      });
    }

    const familyId = personRows[0].family_id;

    const [members] = await FamilyMember.getByFamilyId(familyId);

    res.render("my-family", { members });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
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

exports.addChild = async (req, res) => {
  const familyId = req.session.user.id;
  const { name, dob, gender, occupation } = req.body;

  await db.promise().query(
    `INSERT INTO children
     (family_id, name, dob, gender, occupation)
     VALUES (?, ?, ?, ?, ?)`,
    [familyId, name, dob, gender, occupation]
  );

  res.redirect("/my-family");
};
