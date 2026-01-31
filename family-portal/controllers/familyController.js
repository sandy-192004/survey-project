// // // // // const User = require("../models/User");
// // // // // const FamilyMember = require("../models/FamilyMember");
// // // // // const bcrypt = require("bcryptjs");
// // // // // const db = require("../config/db");

// // // // // /* ================= AUTH ================= */

// // // // // // Show login
// // // // // exports.showLogin = (req, res) => {
// // // // //   res.render("family-login");
// // // // // };

// // // // // // Show register
// // // // // exports.showRegister = (req, res) => {
// // // // //   res.render("family-register");
// // // // // };

// // // // // // Login
// // // // // exports.login = async (req, res) => {
// // // // //   try {
// // // // //     const { email, password } = req.body;
// // // // //     const users = await User.getByEmail(email);
// // // // //     if (users.length === 0) {
// // // // //       return res.status(400).send("Invalid email or password");
// // // // //     }

// // // // //     const user = users[0];
// // // // //     const match = await bcrypt.compare(password, user.password);
// // // // //     if (!match) return res.status(400).send("Invalid email or password");

// // // // //     req.session.user = { id: user.id, email: user.email };
// // // // //     res.redirect("/dashboard");
// // // // //   } catch (err) {
// // // // //     console.error(err);
// // // // //     res.status(500).send("Server Error");
// // // // //   }
// // // // // };

// // // // // // Register
// // // // // exports.register = async (req, res) => {
// // // // //   try {
// // // // //     const { email, password, confirmPassword } = req.body;
// // // // //     if (password !== confirmPassword) {
// // // // //       return res.status(400).send("Passwords do not match");
// // // // //     }

// // // // //     const hash = await bcrypt.hash(password, 10);
// // // // //     await User.create({ email, password: hash });

// // // // //     res.redirect("/login?registered=true");
// // // // //   } catch (err) {
// // // // //     console.error("Registration error:", err);
// // // // //     res.status(500).send("Registration failed. Please try again.");
// // // // //   }
// // // // // };

// // // // // // Logout
// // // // // exports.logout = (req, res) => {
// // // // //   req.session.destroy(() => res.redirect("/login"));
// // // // // };

// // // // // /* ================= DASHBOARD ================= */

// // // // // exports.dashboard = (req, res) => {
// // // // //   if (!req.session.user) return res.redirect("/login");
// // // // //   res.render("dashboard");
// // // // // };

// // // // // exports.checkFamily = async (req, res) => {
// // // // //   if (!req.session.user) return res.redirect("/login");

// // // // //   try {
// // // // //     const userId = req.session.user.id;
// // // // //     const Person = require("../models/Person");

// // // // //     const [personRows] = await Person.getByUserId(userId);

// // // // //     if (personRows.length === 0) {
// // // // //       return res.redirect("/family-form");
// // // // //     }

// // // // //     const familyId = personRows[0].family_id;
// // // // //     const [members] = await db.query(
// // // // //       "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
// // // // //       [familyId]
// // // // //     );

// // // // //     if (members.length > 0) {
// // // // //       return res.redirect("/my-family");
// // // // //     }

// // // // //     return res.redirect("/family-form");
// // // // //   } catch (err) {
// // // // //     console.error("Database error in checkFamily:", err);
// // // // //     return res.redirect("/family-form");
// // // // //   }
// // // // // };

// // // // // /* ================= FAMILY LOGIC ================= */

// // // // // exports.familyLogic = async (req, res) => {
// // // // //   if (!req.session.user) return res.redirect("/login");

// // // // //   try {
// // // // //     const userId = req.session.user.id;
// // // // //     const Person = require("../models/Person");

// // // // //     const [personRows] = await Person.getByUserId(userId);

// // // // //     if (personRows.length === 0) {
// // // // //       return res.render("family-form", { addChildMode: false });
// // // // //     }

// // // // //     const familyId = personRows[0].family_id;
// // // // //     const [members] = await db.query(
// // // // //       "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
// // // // //       [familyId]
// // // // //     );

// // // // //     if (members.length > 0) {
// // // // //       const membersData = await FamilyMember.getByFamilyId(familyId);
// // // // //       return res.render("my-family", {
// // // // //         family: personRows[0],
// // // // //         members: membersData
// // // // //       });
// // // // //     }

// // // // //     return res.render("family-form", { addChildMode: false });
// // // // //   } catch (err) {
// // // // //     console.error(err);
// // // // //     res.status(500).send("Server Error");
// // // // //   }
// // // // // };

// // // // // /* ================= FAMILY FORM ================= */

// // // // // exports.showForm = (req, res) => {
// // // // //   res.render("family-form", { addChildMode: false });
// // // // // };

// // // // // exports.showFamilyForm = (req, res) => {
// // // // //   res.render("family-form", { addChildMode: false });
// // // // // };

// // // // // /* ================= SAVE FAMILY ================= */

// // // // // exports.saveFamily = async (req, res) => {
// // // // //   const connection = await db.getConnection();

// // // // //   try {
// // // // //     const userId = req.session.user.id;

// // // // //     console.log("📥 Received Body:", req.body);
// // // // //     console.log("📎 Received Files:", req.files);

// // // // //     let { husband_name, members } = req.body;

// // // // //     if (typeof members === "string") {
// // // // //       try {
// // // // //         members = JSON.parse(members);
// // // // //       } catch (e) {
// // // // //         console.error("❌ Failed to parse members JSON:", e);
// // // // //         members = [];
// // // // //       }
// // // // //     }

// // // // //     if (!Array.isArray(members)) members = [];

// // // // //     await connection.beginTransaction();

// // // // //     // Step 1: Check if user already has a family
// // // // //     const [existingPersons] = await connection.query(
// // // // //       "SELECT id FROM persons WHERE user_id = ?",
// // // // //       [userId]
// // // // //     );

// // // // //     if (existingPersons.length > 0) {
// // // // //       throw new Error("User already has a family record");
// // // // //     }

// // // // //     // Step 2: Create family
// // // // //     const familyCode = `FAM-${Date.now()}`;
// // // // //     const [familyResult] = await connection.query(
// // // // //       "INSERT INTO families (family_code) VALUES (?)",
// // // // //       [familyCode]
// // // // //     );

// // // // //     const familyId = familyResult.insertId;

// // // // //     // Step 3: Insert main person (husband)
// // // // //     await connection.query(
// // // // //       "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
// // // // //       [userId, familyId, husband_name]
// // // // //     );

// // // // //     // Step 4: Insert family members
// // // // //     for (const member of members) {
// // // // //       const {
// // // // //         member_type,
// // // // //         name,
// // // // //         relationship,
// // // // //         mobile,
// // // // //         occupation,
// // // // //         dob,
// // // // //         gender,
// // // // //         door_no,
// // // // //         street,
// // // // //         district,
// // // // //         state,
// // // // //         pincode,
// // // // //         photo
// // // // //       } = member;

// // // // //       if (!name || !relationship) continue;

// // // // //       await connection.query(
// // // // //         `INSERT INTO family_members
// // // // //          (family_id, member_type, name, relationship, mobile, occupation,
// // // // //           dob, gender, door_no, street, district, state, pincode, photo)
// // // // //          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
// // // // //         [
// // // // //           familyId,
// // // // //           member_type || "child",
// // // // //           name,
// // // // //           relationship,
// // // // //           mobile || null,
// // // // //           occupation || null,
// // // // //           dob || null,
// // // // //           gender || null,
// // // // //           door_no || null,
// // // // //           street || null,
// // // // //           district || null,
// // // // //           state || null,
// // // // //           pincode || null,
// // // // //           photo || null
// // // // //         ]
// // // // //       );
// // // // //     }

// // // // //     await connection.commit();

// // // // //     res.json({
// // // // //       success: true,
// // // // //       message: "✅ Family details saved successfully!",
// // // // //       familyId,
// // // // //       familyCode
// // // // //     });
// // // // //   } catch (err) {
// // // // //     await connection.rollback();
// // // // //     console.error("🔥 SAVE FAMILY ERROR 🔥");
// // // // //     console.error("Message:", err.message);
// // // // //     console.error("SQL:", err.sqlMessage);
// // // // //     console.error("Stack:", err.stack);

// // // // //     res.status(500).json({
// // // // //       success: false,
// // // // //       message: "❌ Failed to save family data",
// // // // //       error: err.message,
// // // // //       sql: err.sqlMessage
// // // // //     });
// // // // //   } finally {
// // // // //     connection.release();
// // // // //   }
// // // // // };

// // // // // /* ================= FAMILY CHECK ================= */

// // // // // exports.checkFamilyExists = async (req, res) => {
// // // // //   try {
// // // // //     const userId = req.session.user.id;

// // // // //     const [rows] = await db.query(
// // // // //       "SELECT id FROM persons WHERE user_id = ? LIMIT 1",
// // // // //       [userId]
// // // // //     );

// // // // //     res.json({ exists: rows.length > 0 });
// // // // //   } catch (err) {
// // // // //     console.error("checkFamilyExists error:", err);
// // // // //     res.status(500).json({ exists: false });
// // // // //   }
// // // // // };

// // // // // /* ================= MY FAMILY ================= */

// // // // // exports.myFamily = async (req, res) => {
// // // // //   const userId = req.session.user.id;
// // // // //   const Person = require("../models/Person");

// // // // //   const [personRows] = await Person.getByUserId(userId);

// // // // //   if (personRows.length === 0) {
// // // // //     return res.render("family-form");
// // // // //   }

// // // // //   const familyId = personRows[0].family_id;
// // // // //   const members = await FamilyMember.getByFamilyId(familyId);

// // // // //   res.render("my-family", {
// // // // //     family: personRows[0],
// // // // //     members
// // // // //   });
// // // // // };

// // // // // exports.myFamilyJson = async (req, res) => {
// // // // //   try {
// // // // //     const userId = req.session.user.id;
// // // // //     const Person = require("../models/Person");

// // // // //     const [personRows] = await Person.getByUserId(userId);

// // // // //     if (personRows.length === 0) {
// // // // //       res.json({ success: false });
// // // // //     } else {
// // // // //       const familyId = personRows[0].family_id;
// // // // //       const members = await FamilyMember.getByFamilyId(familyId);
// // // // //       res.json({ success: true, family: personRows[0], members });
// // // // //     }
// // // // //   } catch (err) {
// // // // //     console.error(err);
// // // // //     res.json({ success: false });
// // // // //   }
// // // // // };

// // // // // /* ================= ADD CHILD ================= */

// // // // // exports.showAddChild = (req, res) => {
// // // // //   res.render("add-child");
// // // // // };

// // // // // exports.addChild = async (req, res) => {
// // // // //   const familyId = req.session.user.id;
// // // // //   const { name, dob, gender, occupation } = req.body;

// // // // //   await db.query(
// // // // //     `INSERT INTO children
// // // // //      (family_id, name, dob, gender, occupation)
// // // // //      VALUES (?, ?, ?, ?, ?)`,
// // // // //     [familyId, name, dob, gender, occupation]
// // // // //   );

// // // // //   res.redirect("/my-family");
// // // // // };

// // // // // /* ================= EDIT FAMILY ================= */

// // // // // exports.editForm = async (req, res) => {
// // // // //   try {
// // // // //     const id = req.params.id;
// // // // //     const [members] = await db.query(
// // // // //       "SELECT * FROM family_members WHERE id = ?",
// // // // //       [id]
// // // // //     );
// // // // //     if (members.length === 0) {
// // // // //       return res.status(404).send("Member not found");
// // // // //     }
// // // // //     res.render("family-edit", { member: members[0] });
// // // // //   } catch (err) {
// // // // //     console.error(err);
// // // // //     res.status(500).send("Server Error");
// // // // //   }
// // // // // };

// // // // // exports.updateFamily = async (req, res) => {
// // // // //   try {
// // // // //     const id = req.params.id;
// // // // //     const {
// // // // //       name,
// // // // //       mobile,
// // // // //       occupation,
// // // // //       dob,
// // // // //       gender,
// // // // //       door_no,
// // // // //       street,
// // // // //       district,
// // // // //       state,
// // // // //       pincode
// // // // //     } = req.body;

// // // // //     await db.query(
// // // // //       `UPDATE family_members SET
// // // // //        name = ?, mobile = ?, occupation = ?, dob = ?, gender = ?,
// // // // //        door_no = ?, street = ?, district = ?, state = ?, pincode = ?
// // // // //        WHERE id = ?`,
// // // // //       [
// // // // //         name,
// // // // //         mobile,
// // // // //         occupation,
// // // // //         dob,
// // // // //         gender,
// // // // //         door_no,
// // // // //         street,
// // // // //         district,
// // // // //         state,
// // // // //         pincode,
// // // // //         id
// // // // //       ]
// // // // //     );

// // // // //     res.redirect("/my-family");
// // // // //   } catch (err) {
// // // // //     console.error(err);
// // // // //     res.status(500).send("Server Error");
// // // // //   }
// // // // // };

// // // // // exports.deleteFamily = async (req, res) => {
// // // // //   try {
// // // // //     const id = req.params.id;
// // // // //     await db.query("DELETE FROM family_members WHERE id = ?", [id]);
// // // // //     res.redirect("/my-family");
// // // // //   } catch (err) {
// // // // //     console.error(err);
// // // // //     res.status(500).send("Server Error");
// // // // //   }
// // // // // };

// // // // // /* ================= VIEW FAMILY ================= */

// // // // // exports.viewFamily = async (req, res) => {
// // // // //   try {
// // // // //     const familyId = req.params.familyId;
// // // // //     const [members] = await FamilyMember.getByFamilyId(familyId);
// // // // //     res.render("my-family", { members });
// // // // //   } catch (err) {
// // // // //     console.error(err);
// // // // //     res.status(500).send("Server Error");
// // // // //   }
// // // // // };

// // // // // exports.getMyFamilyJson = async (req, res) => {
// // // // //   try {
// // // // //     const userId = req.session.user.id;
// // // // //     const Person = require("../models/Person");

// // // // //     const [personRows] = await Person.getByUserId(userId);

// // // // //     if (personRows.length === 0) {
// // // // //       res.json({ success: false });
// // // // //     } else {
// // // // //       const familyId = personRows[0].family_id;
// // // // //       const members = await FamilyMember.getByFamilyId(familyId);
// // // // //       res.json({ success: true, family: personRows[0], members });
// // // // //     }
// // // // //   } catch (err) {
// // // // //     console.error(err);
// // // // //     res.json({ success: false });
// // // // //   }
// // // // // };
// // // // const User = require("../models/User");
// // // // const FamilyMember = require("../models/FamilyMember");
// // // // const bcrypt = require("bcryptjs");
// // // // const db = require("../config/db");

// // // // /* ================= AUTH ================= */

// // // // exports.showLogin = (req, res) => res.render("family-login");
// // // // exports.showRegister = (req, res) => res.render("family-register");

// // // // // ---------- LOGIN ----------
// // // // exports.login = async (req, res) => {
// // // //   try {
// // // //     const { email, password } = req.body;
// // // //     const users = await User.getByEmail(email);
// // // //     if (!users.length) return res.status(400).send("Invalid email or password");

// // // //     const user = users[0];
// // // //     const match = await bcrypt.compare(password, user.password);
// // // //     if (!match) return res.status(400).send("Invalid email or password");

// // // //     req.session.user = { id: user.id, email: user.email };
// // // //     res.redirect("/dashboard");
// // // //   } catch (err) {
// // // //     console.error("Login Error:", err);
// // // //     res.status(500).send("Server Error");
// // // //   }
// // // // };

// // // // // ---------- REGISTER ----------
// // // // exports.register = async (req, res) => {
// // // //   try {
// // // //     const { email, password, confirmPassword } = req.body;
// // // //     if (password !== confirmPassword)
// // // //       return res.status(400).send("Passwords do not match");

// // // //     const hash = await bcrypt.hash(password, 10);
// // // //     await User.create({ email, password: hash });

// // // //     res.redirect("/login?registered=true");
// // // //   } catch (err) {
// // // //     console.error("Registration error:", err);
// // // //     res.status(500).send("Registration failed. Please try again.");
// // // //   }
// // // // };

// // // // // ---------- LOGOUT ----------
// // // // exports.logout = (req, res) => {
// // // //   req.session.destroy(() => res.redirect("/login"));
// // // // };

// // // // /* ================= DASHBOARD ================= */
// // // // exports.dashboard = (req, res) => {
// // // //   if (!req.session.user) return res.redirect("/login");
// // // //   res.render("dashboard");
// // // // };

// // // // /* ================= SAVE FAMILY ================= */

// // // // exports.saveFamily = async (req, res) => {
// // // //   console.log("🟢 /save-family endpoint triggered");
// // // //   console.log("Session user:", req.session.user);
// // // //   console.log("Body keys:", Object.keys(req.body));
// // // //   console.log("Files:", req.files);

// // // //   const connection = await db.getConnection();

// // // //   try {
// // // //     if (!req.session.user) {
// // // //       console.log("🚨 No session found");
// // // //       return res
// // // //         .status(401)
// // // //         .json({ success: false, message: "User not logged in" });
// // // //     }

// // // //     const userId = req.session.user.id;
// // // //     let { husband_name, members } = req.body;

// // // //     if (typeof members === "string") {
// // // //       try {
// // // //         members = JSON.parse(members);
// // // //       } catch (e) {
// // // //         console.error("❌ Invalid JSON for members:", e);
// // // //         members = [];
// // // //       }
// // // //     }
// // // //     if (!Array.isArray(members)) members = [];

// // // //     await connection.beginTransaction();

// // // //     // Check if user already has family
// // // //     const [existingPersons] = await connection.query(
// // // //       "SELECT id FROM persons WHERE user_id = ?",
// // // //       [userId]
// // // //     );
// // // //     if (existingPersons.length > 0)
// // // //       throw new Error("User already has a family record");

// // // //     // Insert family
// // // //     const familyCode = `FAM-${Date.now()}`;
// // // //     const [familyResult] = await connection.query(
// // // //       "INSERT INTO families (family_code) VALUES (?)",
// // // //       [familyCode]
// // // //     );
// // // //     const familyId = familyResult.insertId;

// // // //     // Insert husband record
// // // //     await connection.query(
// // // //       "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
// // // //       [userId, familyId, husband_name]
// // // //     );

// // // //     // Insert members
// // // //     for (const member of members) {
// // // //       if (!member.name || !member.relationship) continue;

// // // //       await connection.query(
// // // //         `INSERT INTO family_members
// // // //           (family_id, member_type, name, relationship, mobile, occupation,
// // // //            dob, gender, door_no, street, district, state, pincode, photo)
// // // //          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
// // // //         [
// // // //           familyId,
// // // //           member.member_type || "child",
// // // //           member.name,
// // // //           member.relationship,
// // // //           member.mobile || null,
// // // //           member.occupation || null,
// // // //           member.dob || null,
// // // //           member.gender || null,
// // // //           member.door_no || null,
// // // //           member.street || null,
// // // //           member.district || null,
// // // //           member.state || null,
// // // //           member.pincode || null,
// // // //           member.photo || null
// // // //         ]
// // // //       );
// // // //     }

// // // //     await connection.commit();
// // // //     console.log("✅ Family saved successfully");

// // // //     res.json({
// // // //       success: true,
// // // //       message: "Family details saved successfully",
// // // //       familyId,
// // // //       familyCode
// // // //     });
// // // //   } catch (err) {
// // // //     await connection.rollback().catch(() => {});
// // // //     console.error("🔥 SAVE FAMILY ERROR 🔥");
// // // //     console.error(err);
// // // //     res.status(500).json({
// // // //       success: false,
// // // //       message: "Server crashed while saving family",
// // // //       error: err.message,
// // // //       sql: err.sqlMessage,
// // // //       stack: err.stack
// // // //     });
// // // //   } finally {
// // // //     connection.release();
// // // //   }
// // // // };

// // // // /* ================= OTHER CONTROLLERS (same as before) ================= */
// // // // // keep your existing myFamily, updateFamily, deleteFamily, etc. here

// // // // const bcrypt = require("bcryptjs");
// // // // const db = require("../config/db");

// // // // /* ================= AUTH ================= */

// // // // // Show login page
// // // // exports.showLogin = (req, res) => {
// // // //   res.render("family-login");
// // // // };

// // // // // Show register page
// // // // exports.showRegister = (req, res) => {
// // // //   res.render("family-register");
// // // // };

// // // // // Login handler
// // // // exports.login = async (req, res) => {
// // // //   try {
// // // //     const { email, password } = req.body;
// // // //     const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

// // // //     if (rows.length === 0) {
// // // //       return res.status(400).send("Invalid email or password");
// // // //     }

// // // //     const user = rows[0];
// // // //     const match = await bcrypt.compare(password, user.password);
// // // //     if (!match) {
// // // //       return res.status(400).send("Invalid email or password");
// // // //     }

// // // //     req.session.user = { id: user.id, email: user.email };
// // // //     res.redirect("/dashboard");
// // // //   } catch (err) {
// // // //     console.error("Login error:", err);
// // // //     res.status(500).send("Server error");
// // // //   }
// // // // };

// // // // // Register handler
// // // // exports.register = async (req, res) => {
// // // //   try {
// // // //     const { email, password, confirmPassword } = req.body;
// // // //     if (password !== confirmPassword) {
// // // //       return res.status(400).send("Passwords do not match");
// // // //     }

// // // //     const hash = await bcrypt.hash(password, 10);
// // // //     await db.query("INSERT INTO users (email, password) VALUES (?, ?)", [
// // // //       email,
// // // //       hash,
// // // //     ]);
// // // //     res.redirect("/login?registered=true");
// // // //   } catch (err) {
// // // //     console.error("Registration error:", err);
// // // //     res.status(500).send("Server error");
// // // //   }
// // // // };

// // // // // Logout
// // // // exports.logout = (req, res) => {
// // // //   req.session.destroy(() => {
// // // //     res.redirect("/login");
// // // //   });
// // // // };

// // // // /* ================= DASHBOARD ================= */

// // // // exports.dashboard = (req, res) => {
// // // //   if (!req.session.user) return res.redirect("/login");
// // // //   res.render("dashboard");
// // // // };

// // // // /* ================= FAMILY ================= */

// // // // exports.showForm = (req, res) => {
// // // //   res.render("family-form", { addChildMode: false });
// // // // };

// // // // exports.saveFamily = async (req, res) => {
// // // //   console.log("🟢 /save-family endpoint triggered");

// // // //   const connection = await db.getConnection();
// // // //   try {
// // // //     const userId = req.session.user?.id;
// // // //     if (!userId) {
// // // //       return res.status(401).json({ success: false, message: "Not logged in" });
// // // //     }

// // // //     let { husband_name, members } = req.body;
// // // //     if (typeof members === "string") {
// // // //       try {
// // // //         members = JSON.parse(members);
// // // //       } catch {
// // // //         members = [];
// // // //       }
// // // //     }

// // // //     await connection.beginTransaction();

// // // //     const [familyResult] = await connection.query(
// // // //       "INSERT INTO families (family_code) VALUES (?)",
// // // //       [`FAM-${Date.now()}`]
// // // //     );
// // // //     const familyId = familyResult.insertId;

// // // //     await connection.query(
// // // //       "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
// // // //       [userId, familyId, husband_name]
// // // //     );

// // // //     for (const m of members) {
// // // //       await connection.query(
// // // //         `INSERT INTO family_members
// // // //          (family_id, member_type, name, relationship, mobile, occupation,
// // // //           dob, gender, door_no, street, district, state, pincode, photo)
// // // //          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
// // // //         [
// // // //           familyId,
// // // //           m.member_type || "child",
// // // //           m.name,
// // // //           m.relationship,
// // // //           m.mobile || null,
// // // //           m.occupation || null,
// // // //           m.dob || null,
// // // //           m.gender || null,
// // // //           m.door_no || null,
// // // //           m.street || null,
// // // //           m.district || null,
// // // //           m.state || null,
// // // //           m.pincode || null,
// // // //           m.photo || null,
// // // //         ]
// // // //       );
// // // //     }

// // // //     await connection.commit();
// // // //     res.json({ success: true, message: "Family saved successfully ✅" });
// // // //   } catch (err) {
// // // //     await connection.rollback();
// // // //     console.error("🔥 SAVE FAMILY ERROR:", err);
// // // //     res.status(500).json({ success: false, error: err.message });
// // // //   } finally {
// // // //     connection.release();
// // // //   }
// // // // };

// // // // // View family
// // // // exports.myFamily = async (req, res) => {
// // // //   res.render("my-family");
// // // // };


// // // const bcrypt = require("bcryptjs");
// // // const db = require("../config/db");

// // // /* ================= AUTH ================= */

// // // // Show login page
// // // exports.showLogin = (req, res) => {
// // //   res.render("family-login");
// // // };

// // // // Show register page
// // // exports.showRegister = (req, res) => {
// // //   res.render("family-register");
// // // };

// // // // Login handler
// // // exports.login = async (req, res) => {
// // //   try {
// // //     const { email, password } = req.body;
// // //     const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

// // //     if (rows.length === 0) {
// // //       return res.status(400).send("Invalid email or password");
// // //     }

// // //     const user = rows[0];
// // //     const match = await bcrypt.compare(password, user.password);
// // //     if (!match) {
// // //       return res.status(400).send("Invalid email or password");
// // //     }

// // //     req.session.user = { id: user.id, email: user.email };
// // //     res.redirect("/dashboard");
// // //   } catch (err) {
// // //     console.error("Login error:", err);
// // //     res.status(500).send("Server error");
// // //   }
// // // };

// // // // Register handler
// // // exports.register = async (req, res) => {
// // //   try {
// // //     const { email, password, confirmPassword } = req.body;
// // //     if (password !== confirmPassword) {
// // //       return res.status(400).send("Passwords do not match");
// // //     }

// // //     const hash = await bcrypt.hash(password, 10);
// // //     await db.query("INSERT INTO users (email, password) VALUES (?, ?)", [
// // //       email,
// // //       hash,
// // //     ]);
// // //     res.redirect("/login?registered=true");
// // //   } catch (err) {
// // //     console.error("Registration error:", err);
// // //     res.status(500).send("Server error");
// // //   }
// // // };

// // // // Logout
// // // exports.logout = (req, res) => {
// // //   req.session.destroy(() => {
// // //     res.redirect("/login");
// // //   });
// // // };

// // // /* ================= DASHBOARD ================= */

// // // exports.dashboard = (req, res) => {
// // //   if (!req.session.user) return res.redirect("/login");
// // //   res.render("dashboard");
// // // };

// // // /* ================= FAMILY ================= */

// // // // 🔑 CORE ROUTE: /family
// // // exports.familyLogic = async (req, res) => {
// // //   if (!req.session.user) return res.redirect("/login");

// // //   try {
// // //     const userId = req.session.user.id;
// // //     const Person = require("../models/Person");

// // //     const [personRows] = await Person.getByUserId(userId);

// // //     if (personRows.length === 0) {
// // //       // No family, show family form
// // //       return res.render("family-form", { addChildMode: false });
// // //     }

// // //     const familyId = personRows[0].family_id;
// // //     const [members] = await db.query(
// // //       "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
// // //       [familyId]
// // //     );

// // //     if (members.length > 0) {
// // //       // Has family, show my-family
// // //       const members = await FamilyMember.getByFamilyId(familyId);
// // //       return res.render("my-family", {
// // //         family: personRows[0],
// // //         members
// // //       });
// // //     }

// // //     // No members yet, show form
// // //     return res.render("family-form", { addChildMode: false });
// // //   } catch (err) {
// // //     console.error(err);
// // //     res.status(500).send("Server Error");
// // //   }
// // // };

// // // /* ================= FAMILY FORM ================= */

// // // exports.showForm = (req, res) => {
// // //   res.render("family-form", { addChildMode: false });
// // // };

// // // // Save family data
// // // exports.saveFamily = async (req, res) => {
// // //   console.log("🟢 /save-family endpoint triggered");

// // //   const connection = await db.getConnection();
// // //   try {
// // //     const userId = req.session.user?.id;
// // //     if (!userId) {
// // //       return res.status(401).json({ success: false, message: "Not logged in" });
// // //     }

// // //     let { husband_name, members } = req.body;
// // //     if (typeof members === "string") {
// // //       try {
// // //         members = JSON.parse(members);
// // //       } catch {
// // //         members = [];
// // //       }
// // //     }

// // //     await connection.beginTransaction();

// // //     // Check if user already has a family
// // //     const [existingPersons] = await connection.query(
// // //       "SELECT id FROM persons WHERE user_id = ?",
// // //       [userId]
// // //     );

// // //     if (existingPersons.length > 0) {
// // //       throw new Error("User already has a family record");
// // //     }

// // //     // 1️⃣ create family
// // //     const familyCode = `FAM-${Date.now()}`;
// // //     const [familyResult] = await connection.query(
// // //       "INSERT INTO families (family_code) VALUES (?)",
// // //       [familyCode]
// // //     );

// // //     const familyId = familyResult.insertId;
// // //     console.log("🏠 Created family with ID:", familyId, "and code:", familyCode);

// // //     // 2️⃣ link user → family
// // //     await connection.query(
// // //       "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
// // //       [userId, familyId, husband_name]
// // //     );
// // //     console.log("👤 Linked user to family");

// // //     // 3️⃣ insert family members
// // //     console.log("🔄 Starting member inserts, members count:", members.length);

// // //     for (let i = 0; i < members.length; i++) {
// // //       const member = members[i];
// // //       console.log(`🔄 Processing member ${i + 1}:`, member.name, member.member_type);

// // //       // Handle file uploads - simplified logic
// // //       let photoPath = null;
// // //       if (req.files && req.files.length > 0) {
// // //         // For parents: look for husband_photo or wife_photo
// // //         if (member.member_type === 'parent') {
// // //           if (member.relationship === 'husband') {
// // //             const husbandFile = req.files.find(f => f.fieldname === 'parent[husband_photo]');
// // //             if (husbandFile) photoPath = husbandFile.path.replace(/\\/g, "/");
// // //           } else if (member.relationship === 'wife') {
// // //             const wifeFile = req.files.find(f => f.fieldname === 'parent[wife_photo]');
// // //             if (wifeFile) photoPath = wifeFile.path.replace(/\\/g, "/");
// // //           }
// // //         }
// // //         // For children: look for children[index][photo]
// // //         else if (member.member_type === 'child') {
// // //           const childFile = req.files.find(f => f.fieldname === `children[${i - 2}][photo]`); // Adjust index since parents come first
// // //           if (childFile) photoPath = childFile.path.replace(/\\/g, "/");
// // //         }
// // //       }

// // //       console.log(`📸 Photo path for ${member.name}:`, photoPath);

// // //       await connection.query(
// // //         `INSERT INTO family_members
// // //          (family_id, member_type, name, relationship, mobile, occupation,
// // //           dob, gender, door_no, street, district, state, pincode, photo)
// // //          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
// // //         [
// // //           familyId,
// // //           member.member_type,
// // //           member.name,
// // //           member.relationship,
// // //           member.mobile || null,
// // //           member.occupation || null,
// // //           member.dob || null,
// // //           member.gender || null,
// // //           member.door_no || null,
// // //           member.street || null,
// // //           member.district || null,
// // //           member.state || null,
// // //           member.pincode || null,
// // //           photoPath
// // //         ]
// // //       );
// // //       console.log("✅ Inserted member:", member.name, "Type:", member.member_type);
// // //     }

// // //     console.log("✅ All members inserted successfully");

// // //     await connection.commit();
// // //     console.log("✅ Transaction committed successfully");

// // //     // ✅ IMPORTANT: send JSON success with message
// // //     res.json({
// // //       success: true,
// // //       message: "Family details saved successfully"
// // //     });

// // //   } catch (err) {
// // //     await connection.rollback();
// // //     console.error("🔥 SAVE FAMILY ERROR 🔥");
// // //     console.error("Full error:", err);
// // //     console.error("SQL Message:", err.sqlMessage);
// // //     console.error("Stack:", err.stack);
// // //     res.status(500).json({
// // //       success: false,
// // //       message: "Failed to save family",
// // //       error: err.message,
// // //       sql: err.sqlMessage
// // //     });
// // //   } finally {
// // //     connection.release();
// // //   }
// // // };

// // // // ORIGINAL VERSION (commented out for now)
// // // /*
// // // exports.saveFamily = async (req, res) => {
// // //   const connection = await db.getConnection();

// // //   try {
// // //     const userId = req.session.user.id;

// // //     // DEBUG: Log what we receive
// // //     console.log("🔍 DEBUG - req.body:", req.body);
// // //     console.log("🔍 DEBUG - req.files:", req.files);

// // //     // form fields
// // //     let {
// // //       husband_name,
// // //       members // comes as JSON string from frontend
// // //     } = req.body;

// // //     // Parse members if it's a string
// // //     if (typeof members === 'string') {
// // //       try {
// // //         members = JSON.parse(members);
// // //       } catch (e) {
// // //         console.error("Failed to parse members JSON:", e);
// // //         members = [];
// // //       }
// // //     }

// // //     // Ensure members is an array
// // //     if (!Array.isArray(members)) {
// // //       members = [];
// // //     }

// // //     await connection.beginTransaction();

// // //     // Check if user already has a family
// // //     const [existingPersons] = await connection.query(
// // //       "SELECT id FROM persons WHERE user_id = ?",
// // //       [userId]
// // //     );

// // //     if (existingPersons.length > 0) {
// // //       throw new Error("User already has a family record");
// // //     }

// // //     // 1️⃣ create family
// // //     const [familyResult] = await connection.query(
// // //       "INSERT INTO families () VALUES ()"
// // //     );
// // //     const familyId = familyResult.insertId;

// // //     // Link person to family
// // //     await connection.query(
// // //       "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
// // //       [userId, familyId, husband_name]
// // //     );

// // //     // Add members
// // //     for (const m of members) {
// // //       await connection.query(
// // //         `INSERT INTO family_members
// // //          (family_id, member_type, name, relationship, mobile, occupation,
// // //           dob, gender, door_no, street, district, state, pincode, photo)
// // //          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
// // //         [
// // //           familyId,
// // //           m.member_type || "child",
// // //           m.name,
// // //           m.relationship,
// // //           m.mobile || null,
// // //           m.occupation || null,
// // //           m.dob || null,
// // //           m.gender || null,
// // //           m.door_no || null,
// // //           m.street || null,
// // //           m.district || null,
// // //           m.state || null,
// // //           m.pincode || null,
// // //           m.photo || null,
// // //         ]
// // //       );
// // //     }

// // //     await connection.commit();
// // //     res.json({ success: true, message: "Family saved successfully ✅" });
// // //   } catch (err) {
// // //     await connection.rollback();
// // //     console.error("🔥 SAVE FAMILY ERROR:", err);
// // //     res.status(500).json({ success: false, error: err.message });
// // //   } finally {
// // //     connection.release();
// // //   }
// // // };
// // // */

// // // /* ================= FAMILY CHECK ================= */

// // //   try {
// // //     const userId = req.session.user.id;

// // //     const [rows] = await db.query(
// // //       "SELECT id FROM persons WHERE user_id = ? LIMIT 1",
// // //       [userId]
// // //     );

// // //     res.json({ exists: rows.length > 0 });
// // //   } catch (err) {
// // //     console.error("checkFamilyExists error:", err);
// // //     res.status(500).json({ exists: false });
// // //   }
// // // };

// // // /* ================= MY FAMILY ================= */

// // // exports.myFamily = async (req, res) => {
// // //   const userId = req.session.user.id;

// // //   const person = await Person.getByUserId(userId);

// // //   if (!person) {
// // //     // No family yet
// // //     return res.render("family-form");
// // //   }

// // //   const members = await FamilyMember.getByFamilyId(person.family_id);

// // //   res.render("my-family", {
// // //     family: person,
// // //     members
// // //   });
// // // };

// // // exports.myFamilyJson = async (req, res) => {
// // //   try {
// // //     const userId = req.session.user.id;
// // //     const Person = require("../models/Person");

// // //     const [personRows] = await Person.getByUserId(userId);

// // //     if (personRows.length === 0) {
// // //       res.json({ success: false });
// // //     } else {
// // //       const familyId = personRows[0].family_id;
// // //       const [members] = await db.promise().query(
// // //         "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
// // //         [familyId]
// // //       );
// // //       res.json({ success: members.length > 0 });
// // //     }
// // //   } catch (err) {
// // //     console.error(err);
// // //     res.json({ success: false });
// // //   }
// // // };

// // // /* ================= MY FAMILY JSON (For AJAX Fetch) ================= */

// // // exports.getMyFamilyJson = async (req, res) => {
// // //   try {
// // //     const userId = req.session.user?.id;
// // //     if (!userId) {
// // //       return res
// // //         .status(401)
// // //         .json({ success: false, message: "User not logged in" });
// // //     }

// // //     // Fetch person's family info
// // //     const [personRows] = await db.query(
// // //       "SELECT * FROM persons WHERE user_id = ? LIMIT 1",
// // //       [userId]
// // //     );

// // //     if (personRows.length === 0) {
// // //       return res
// // //         .status(404)
// // //         .json({ success: false, message: "No family found" });
// // //     }

// // //     const familyId = personRows[0].family_id;

// // //     // Fetch family members
// // //     const [members] = await db.query(
// // //       "SELECT * FROM family_members WHERE family_id = ?",
// // //       [familyId]
// // //     );

// // //     res.json({
// // //       success: true,
// // //       family: personRows[0],
// // //       members,
// // //     });
// // //   } catch (err) {
// // //     console.error("❌ Error fetching family JSON:", err);
// // //     res.status(500).json({
// // //       success: false,
// // //       message: "Server error while loading family details",
// // //     });
// // //   }
// // // };exports.checkFamilyExists = async (req, res) => {

// // const bcrypt = require("bcryptjs");
// // const db = require("../config/db");

// // /* ================= AUTH ================= */

// // // Show login page
// // exports.showLogin = (req, res) => {
// //   res.render("family-login");
// // };

// // // Show register page
// // exports.showRegister = (req, res) => {
// //   res.render("family-register");
// // };

// // // Login handler
// // exports.login = async (req, res) => {
// //   try {
// //     const { email, password } = req.body;
// //     const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

// //     if (rows.length === 0) {
// //       return res.status(400).send("Invalid email or password");
// //     }

// //     const user = rows[0];
// //     const match = await bcrypt.compare(password, user.password);
// //     if (!match) {
// //       return res.status(400).send("Invalid email or password");
// //     }

// //     req.session.user = { id: user.id, email: user.email };
// //     res.redirect("/dashboard");
// //   } catch (err) {
// //     console.error("Login error:", err);
// //     res.status(500).send("Server error");
// //   }
// // };

// // // Register handler
// // exports.register = async (req, res) => {
// //   try {
// //     const { email, password, confirmPassword } = req.body;
// //     if (password !== confirmPassword) {
// //       return res.status(400).send("Passwords do not match");
// //     }

// //     const hash = await bcrypt.hash(password, 10);
// //     await db.query("INSERT INTO users (email, password) VALUES (?, ?)", [
// //       email,
// //       hash,
// //     ]);
// //     res.redirect("/login?registered=true");
// //   } catch (err) {
// //     console.error("Registration error:", err);
// //     res.status(500).send("Server error");
// //   }
// // };

// // // Logout
// // exports.logout = (req, res) => {
// //   req.session.destroy(() => {
// //     res.redirect("/login");
// //   });
// // };

// // /* ================= DASHBOARD ================= */

// // exports.dashboard = (req, res) => {
// //   if (!req.session.user) return res.redirect("/login");
// //   res.render("dashboard");
// // };

// // /* ================= FAMILY ================= */

// // // Show family form
// // exports.showForm = (req, res) => {
// //   res.render("family-form", { addChildMode: false });
// // };

// // // Save family data
// // exports.saveFamily = async (req, res) => {
// //   console.log("🟢 /save-family endpoint triggered");

// //   const connection = await db.getConnection();
// //   try {
// //     const userId = req.session.user?.id;
// //     if (!userId) {
// //       return res.status(401).json({ success: false, message: "Not logged in" });
// //     }

// //     let { husband_name, members } = req.body;
// //     if (typeof members === "string") {
// //       try {
// //         members = JSON.parse(members);
// //       } catch {
// //         members = [];
// //       }
// //     }

// //     await connection.beginTransaction();

// //     // Create new family
// //     const [familyResult] = await connection.query(
// //       "INSERT INTO families (family_code) VALUES (?)",
// //       [`FAM-${Date.now()}`]
// //     );
// //     const familyId = familyResult.insertId;

// //     // Link person to family
// //     await connection.query(
// //       "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
// //       [userId, familyId, husband_name]
// //     );

// //     // Add members
// //     for (const m of members) {
// //       await connection.query(
// //         `INSERT INTO family_members
// //          (family_id, member_type, name, relationship, mobile, occupation,
// //           dob, gender, door_no, street, district, state, pincode, photo)
// //          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
// //         [
// //           familyId,
// //           m.member_type || "child",
// //           m.name,
// //           m.relationship,
// //           m.mobile || null,
// //           m.occupation || null,
// //           m.dob || null,
// //           m.gender || null,
// //           m.door_no || null,
// //           m.street || null,
// //           m.district || null,
// //           m.state || null,
// //           m.pincode || null,
// //           m.photo || null,
// //         ]
// //       );
// //     }

// //     await connection.commit();
// //     res.json({ success: true, message: "Family saved successfully ✅" });
// //   } catch (err) {
// //     await connection.rollback();
// //     console.error("🔥 SAVE FAMILY ERROR:", err);
// //     res.status(500).json({ success: false, error: err.message });
// //   } finally {
// //     connection.release();
// //   }
// // };

// // // My Family page (EJS render)
// // exports.myFamily = async (req, res) => {
// //   res.render("my-family");
// // };

// // // ===================== VIEW SPECIFIC FAMILY =====================
// // exports.viewFamily = async (req, res) => {
// //   try {
// //     const { familyId } = req.params;
// //     const [members] = await db.query(
// //       "SELECT * FROM family_members WHERE family_id = ?",
// //       [familyId]
// //     );
// //     res.render("my-family", { members });
// //   } catch (err) {
// //     console.error("Error loading specific family:", err);
// //     res.status(500).send("Server error loading family details");
// //   }
// // };

// // /* ================= MY FAMILY JSON (For AJAX Fetch) ================= */
// // exports.getMyFamilyJson = async (req, res) => {
// //   try {
// //     const userId = req.session.user?.id;
// //     if (!userId) {
// //       return res
// //         .status(401)
// //         .json({ success: false, message: "User not logged in" });
// //     }

// //     // Fetch person's family info
// //     const [personRows] = await db.query(
// //       "SELECT * FROM persons WHERE user_id = ? LIMIT 1",
// //       [userId]
// //     );

// //     if (personRows.length === 0) {
// //       return res
// //         .status(404)
// //         .json({ success: false, message: "No family found" });
// //     }

// //     const familyId = personRows[0].family_id;

// //     // Fetch family members
// //     const [members] = await db.query(
// //       "SELECT * FROM family_members WHERE family_id = ?",
// //       [familyId]
// //     );

// //     res.json({
// //       success: true,
// //       family: personRows[0],
// //       members,
// //     });
// //   } catch (err) {
// //     console.error("❌ Error fetching family JSON:", err);
// //     res.status(500).json({
// //       success: false,
// //       message: "Server error while loading family details",
// //     });
// //   }
// // };




// const User = require("../models/User");
// const FamilyMember = require("../models/FamilyMember");
// const db = require("../config/db");
// const bcrypt = require("bcryptjs");

// /* ================= AUTH ================= */

// exports.showLogin = (req, res) => res.render("family-login");
// exports.showRegister = (req, res) => res.render("family-register");

// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const users = await User.getByEmail(email);
//     if (users.length === 0) return res.status(400).send("Invalid email or password");

//     const user = users[0];
//     const match = await bcrypt.compare(password, user.password);
//     if (!match) return res.status(400).send("Invalid email or password");

//     req.session.user = { id: user.id, email: user.email };
//     res.redirect("/dashboard");
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).send("Server Error");
//   }
// };

// exports.register = async (req, res) => {
//   try {
//     const { email, password, confirmPassword } = req.body;
//     if (password !== confirmPassword) return res.status(400).send("Passwords do not match");

//     const hash = await bcrypt.hash(password, 10);
//     await User.create({ email, password: hash });

//     res.redirect("/login?registered=true");
//   } catch (err) {
//     console.error("Registration error:", err);
//     res.status(500).send("Registration failed. Please try again.");
//   }
// };

// exports.logout = (req, res) => req.session.destroy(() => res.redirect("/login"));

// /* ================= DASHBOARD ================= */

// exports.dashboard = (req, res) => {
//   if (!req.session.user) return res.redirect("/login");
//   res.render("dashboard");
// };

// /* ================= FAMILY ================= */

// exports.saveFamily = async (req, res) => {
//   const connection = await db.getConnection();
//   try {
//     const userId = req.session.user.id;
//     let { husband_name, members } = req.body;
//     if (typeof members === "string") members = JSON.parse(members);

//     await connection.beginTransaction();

//     // Create family
//     const familyCode = `FAM-${Date.now()}`;
//     const [familyResult] = await connection.query(
//       "INSERT INTO families (family_code) VALUES (?)",
//       [familyCode]
//     );
//     const familyId = familyResult.insertId;

//     // Link person
//     await connection.query(
//       "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
//       [userId, familyId, husband_name]
//     );

//     // Add members
//     for (const member of members) {
//       await connection.query(
//         `INSERT INTO family_members
//         (family_id, member_type, name, relationship, mobile, occupation, dob, gender, door_no, street, district, state, pincode, photo)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           familyId,
//           member.member_type,
//           member.name,
//           member.relationship,
//           member.mobile || null,
//           member.occupation || null,
//           member.dob || null,
//           member.gender || null,
//           member.door_no || null,
//           member.street || null,
//           member.district || null,
//           member.state || null,
//           member.pincode || null,
//           member.photo || null
//         ]
//       );
//     }

//     await connection.commit();
//     res.json({ success: true, message: "Family details saved successfully" });
//   } catch (err) {
//     await connection.rollback();
//     console.error("SAVE FAMILY ERROR:", err);
//     res.status(500).json({ success: false, message: "Failed to save family" });
//   } finally {
//     connection.release();
//   }
// };

// /* ================= FAMILY VIEW ================= */

// exports.myFamily = async (req, res) => {
//   try {
//     const userId = req.session.user.id;
//     const [personRows] = await db.query(
//       "SELECT * FROM persons WHERE user_id = ? LIMIT 1",
//       [userId]
//     );

//     if (personRows.length === 0) {
//       return res.render("family-form", { addChildMode: false });
//     }

//     const familyId = personRows[0].family_id;
//     const [members] = await db.query(
//       "SELECT * FROM family_members WHERE family_id = ?",
//       [familyId]
//     );

//     // ✅ FIXED: Pass members to EJS so it’s defined
//     res.render("my-family", { family: personRows[0], members });
//   } catch (err) {
//     console.error("Error loading family:", err);
//     res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
//   }
// };

// /* ================= FAMILY JSON ================= */

// exports.getMyFamilyJson = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     if (!userId) return res.status(401).json({ success: false, message: "User not logged in" });

//     const [personRows] = await db.query(
//       "SELECT * FROM persons WHERE user_id = ? LIMIT 1",
//       [userId]
//     );

//     if (personRows.length === 0)
//       return res.status(404).json({ success: false, message: "No family found" });

//     const familyId = personRows[0].family_id;
//     const [members] = await db.query(
//       "SELECT * FROM family_members WHERE family_id = ?",
//       [familyId]
//     );

//     res.json({ success: true, family: personRows[0], members });
//   } catch (err) {
//     console.error("❌ Error fetching family JSON:", err);
//     res.status(500).json({ success: false, message: "Server error while loading family details" });
//   }
// };

// /* ================= EDIT MEMBER (JSON for Modal) ================= */

// exports.editForm = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const [rows] = await db.query("SELECT * FROM family_members WHERE id = ?", [id]);
//     if (rows.length === 0) {
//       return res.json({ success: false, message: "Member not found" });
//     }
//     res.json({ success: true, member: rows[0] });
//   } catch (err) {
//     console.error("Error loading member:", err);
//     res.json({ success: false, message: "Error loading member" });
//   }
// };

// /* ================= UPDATE MEMBER ================= */

// exports.updateFamily = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const { name, mobile, occupation } = req.body;
//     let photoPath = null;

//     // Handle photo upload if present
//     if (req.file) {
//       photoPath = "uploads/" + req.file.filename;
//     }

//     const query = `
//       UPDATE family_members 
//       SET name = ?, mobile = ?, occupation = ?, photo = COALESCE(?, photo)
//       WHERE id = ?`;
//     await db.query(query, [name, mobile || null, occupation || null, photoPath, id]);

//     res.json({ success: true, message: "Member updated successfully" });
//   } catch (err) {
//     console.error("Update member error:", err);
//     res.json({ success: false, message: "Update failed", error: err.message });
//   }
// };





const bcrypt = require("bcryptjs");
const db = require("../config/db");

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

exports.dashboard = (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("dashboard", {
    user: req.session.user,
    message: req.query.message || null
  });
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
        console.error("❌ Failed to parse members JSON:", e);
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

      if (!name || !relationship) continue;

      // Handle file uploads
      let photoPath = null;
      if (req.files && req.files.length > 0) {
        if (member_type === 'parent') {
          if (relationship === 'husband') {
            const husbandFile = req.files.find(f => f.fieldname === 'parent[husband_photo]');
            if (husbandFile) photoPath = husbandFile.path.replace(/\\/g, "/");
          } else if (relationship === 'wife') {
            const wifeFile = req.files.find(f => f.fieldname === 'parent[wife_photo]');
            if (wifeFile) photoPath = wifeFile.path.replace(/\\/g, "/");
          }
        } else if (member_type === 'child') {
          const childFile = req.files.find(f => f.fieldname === `children[${i - 2}][photo]`); // Adjust index since parents come first
          if (childFile) photoPath = childFile.path.replace(/\\/g, "/");
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
      message: "✅ Family details saved successfully!",
      familyId,
      familyCode
    });

  } catch (err) {
    await connection.rollback();
    console.error("🔥 SAVE FAMILY ERROR 🔥");
    console.error("Message:", err.message);
    console.error("SQL:", err.sqlMessage);
    console.error("Stack:", err.stack);

    res.status(500).json({
      success: false,
      message: "❌ Failed to save family data",
      error: err.message,
      sql: err.sqlMessage
    });
  } finally {
    connection.release();
  }
};

// My Family page (EJS render)
exports.myFamily = async (req, res) => {
  console.log("🔥 myFamily controller HIT");

  try {
    const userId = req.session.user.id;

    let family = null;
    let members = []; // ⬅️ GUARANTEED

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

    // 🔥 ALWAYS PASS members
    return res.render("my-family", {
      family,
      members
    });

  } catch (err) {
    console.error("🔥 myFamily ERROR:", err);

    // 🔥 EVEN ON ERROR
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
      "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
      [familyId]
    );

    res.json({ success: members.length > 0 });

  } catch (err) {
    console.error("❌ Error fetching family JSON:", err);
    res.json({ success: false });
  }
};
