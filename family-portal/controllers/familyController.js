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

//   try {
//     const userId = req.session.user.id;
//     const Person = require("../models/Person");

//     const [personRows] = await Person.getByUserId(userId);

//     if (personRows.length === 0) {
//       return res.redirect("/family-form");
//     }

//     const familyId = personRows[0].family_id;
//     const [members] = await db.query(
//       "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
//       [familyId]
//     );

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

// FULL FUNCTIONALITY VERSION
exports.saveFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.session.user.id;

    // DEBUG: Log what we receive
    console.log("🔍 DEBUG - req.body:", req.body);
    console.log("🔍 DEBUG - req.files:", req.files);

    // form fields - husband_name might be in req.body or as a field
    let husband_name = req.body.husband_name;
    let members = req.body.members; // comes as JSON string from frontend

    console.log("🔍 Raw members from req.body:", members);
    console.log("🔍 Type of members:", typeof members);

    // Parse members if it's a string
    if (typeof members === 'string') {
      try {
        members = JSON.parse(members);
        console.log("✅ Successfully parsed members JSON");
      } catch (e) {
        console.error("❌ Failed to parse members JSON:", e);
        console.error("❌ Raw members string:", members);
        members = [];
      }
    }

    // Ensure members is an array
    if (!Array.isArray(members)) {
      console.log("⚠️ Members is not an array, converting to empty array");
      members = [];
    }

    console.log("📊 Final parsed members:", members);
    console.log("📊 Members count:", members.length);

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
    const familyCode = `FAM-${Date.now()}`;
    const [familyResult] = await connection.query(
      "INSERT INTO families (family_code) VALUES (?)",
      [familyCode]
    );

    const familyId = familyResult.insertId;
    console.log("🏠 Created family with ID:", familyId, "and code:", familyCode);

    // 2️⃣ link user → family
    await connection.query(
      "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
      [userId, familyId, husband_name]
    );
    console.log("👤 Linked user to family");

    // 3️⃣ insert family members
    console.log("🔄 Starting member inserts, members count:", members.length);

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      console.log(`🔄 Processing member ${i + 1}:`, member.name, member.member_type);

      // Handle file uploads - simplified logic
      let photoPath = null;
      if (req.files && req.files.length > 0) {
        // For parents: look for husband_photo or wife_photo
        if (member.member_type === 'parent') {
          if (member.relationship === 'husband') {
            const husbandFile = req.files.find(f => f.fieldname === 'parent[husband_photo]');
            if (husbandFile) photoPath = husbandFile.path.replace(/\\/g, "/");
          } else if (member.relationship === 'wife') {
            const wifeFile = req.files.find(f => f.fieldname === 'parent[wife_photo]');
            if (wifeFile) photoPath = wifeFile.path.replace(/\\/g, "/");
          }
        }
        // For children: look for children[index][photo]
        else if (member.member_type === 'child') {
          const childFile = req.files.find(f => f.fieldname === `children[${i - 2}][photo]`); // Adjust index since parents come first
          if (childFile) photoPath = childFile.path.replace(/\\/g, "/");
        }
      }

      console.log(`📸 Photo path for ${member.name}:`, photoPath);

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
          member.mobile || null,
          member.occupation || null,
          member.dob || null,
          member.gender || null,
          member.door_no || null,
          member.street || null,
          member.district || null,
          member.state || null,
          member.pincode || null,
          photoPath
        ]
      );
      console.log("✅ Inserted member:", member.name, "Type:", member.member_type);
    }

    console.log("✅ All members inserted successfully");

    await connection.commit();
    console.log("✅ Transaction committed successfully");

    // ✅ IMPORTANT: send JSON success with message
    res.json({
      success: true,
      message: "Family details saved successfully"
    });

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
//   const userId = req.session.user.id;

//   const person = await Person.getByUserId(userId);

//   if (!person) {
//     // No family yet
//     return res.render("family-form");
//   }

//   const members = await FamilyMember.getByFamilyId(person.family_id);

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
  res.render("dashboard");
};

/* ================= FAMILY ================= */

// Show family form
exports.showForm = (req, res) => {
  res.render("family-form", { addChildMode: false });
};

// Save family data
exports.saveFamily = async (req, res) => {
  console.log("🟢 /save-family endpoint triggered");

  const connection = await db.getConnection();
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    let { husband_name, members } = req.body;
    if (typeof members === "string") {
      try {
        members = JSON.parse(members);
      } catch {
        members = [];
      }
    }

    await connection.beginTransaction();

    // Create new family
    const [familyResult] = await connection.query(
      "INSERT INTO families (family_code) VALUES (?)",
      [`FAM-${Date.now()}`]
    );
    const familyId = familyResult.insertId;

    // Link person to family
    await connection.query(
      "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
      [userId, familyId, husband_name]
    );

    // Add members
    for (const m of members) {
      await connection.query(
        `INSERT INTO family_members
         (family_id, member_type, name, relationship, mobile, occupation,
          dob, gender, door_no, street, district, state, pincode, photo)
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
          m.photo || null,
        ]
      );
    }

    await connection.commit();
    res.json({ success: true, message: "Family saved successfully ✅" });
  } catch (err) {
    await connection.rollback();
    console.error("🔥 SAVE FAMILY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
};

// My Family page (EJS render)
exports.myFamily = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const person = await Person.getByUserId(userId);

    if (!person) {
      // No family yet
      return res.render("family-form");
    }

    const members = await FamilyMember.getByFamilyId(person.family_id);

    // ✅ FIXED: Pass members to EJS so it’s defined
    res.render("my-family", { family: person[0], members });
  } catch (err) {
    console.error("Error loading family:", err);
    res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
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
    const userId = req.session.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    // Fetch person's family info
    const [personRows] = await db.query(
      "SELECT * FROM persons WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (personRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No family found" });
    }

    const familyId = personRows[0].family_id;

    // Fetch family members
    const [members] = await db.query(
      "SELECT * FROM family_members WHERE family_id = ?",
      [familyId]
    );

    res.json({
      success: true,
      family: personRows[0],
      members,
    });
  } catch (err) {
    console.error("❌ Error fetching family JSON:", err);
    res.status(500).json({
      success: false,
      message: "Server error while loading family details",
    });
  }
};
