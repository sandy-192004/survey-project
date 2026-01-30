const User = require("../models/User");
const FamilyMember = require("../models/FamilyMember");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

// Helper function to get familyId from user email
async function getFamilyId(email) {
  const [rows] = await db.promise().query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  return rows.length > 0 ? rows[0].id : null;
}

// Show login page
exports.showLogin = (req, res) => {
  res.render("family-login");
};

// Show register page
exports.showRegister = (req, res) => {
  res.render("family-login");
};

// Handle login
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required");
  }

  // Check if user exists in database
  User.getByEmail(email, (err, results) => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.status(500).send("Database error");
    }

    if (!results || results.length === 0) {
      return res.status(400).send("Invalid email or password");
    }

    const user = results[0];

    // Compare password with hashed password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.log("Compare Error:", err.message);
        return res.status(500).send("Error verifying password");
      }

      if (!isMatch) {
        return res.status(400).send("Invalid email or password");
      }

      // Set session
      req.session.user = { id: user.id, email: user.email };
      res.redirect("/dashboard");
    });
  });
};

// Handle registration
exports.register = (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // Validate inputs
  if (!email || !password || !confirmPassword) {
    return res.status(400).send("All fields are required");
  }

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  if (password.length < 6) {
    return res.status(400).send("Password must be at least 6 characters");
  }

  // Check if user already exists
  User.getByEmail(email, (err, results) => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.status(500).send("Database error");
    }

    if (results && results.length > 0) {
      return res.status(400).send("User already exists");
    }

    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.log("Hash Error:", err.message);
        return res.status(500).send("Error hashing password");
      }

      // Save user to database
      const userData = {
        email: email,
        password: hashedPassword
      };

      User.create(userData, (err, result) => {
        if (err) {
          console.log("DB Error:", err.message);
          return res.status(500).send("Error registering user");
        }

        // Set session and redirect to dashboard for new users
        req.session.user = { id: result.insertId, email: userData.email };
        res.redirect("/dashboard");
      });
    });
  });
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

exports.checkFamily = async (req, res) => {
  try {
    const email = req.session.user.email;
    const familyId = await getFamilyId(email);

    if (!familyId) {
      return res.render('dashboard', { hasFamily: false });
    }

    // Check if user has family data
    const [rows] = await db.promise().query(
      "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
      [familyId]
    );

    if (rows.length > 0) {
      return res.render('dashboard', { hasFamily: true });
    } else {
      return res.render('dashboard', { hasFamily: false });
    }
  } catch (err) {
    console.error("Check family error:", err);
    return res.render('dashboard', { hasFamily: false });
  }
};

// Logic route for /family - checks if user has family and redirects accordingly
exports.familyLogic = async (req, res) => {
  try {
    const email = req.session.user.email;
    const familyId = await getFamilyId(email);

    if (!familyId) {
      return res.render('dashboard', { noFamily: true });
    }

    // Check if user has family data
    const [rows] = await db.promise().query(
      "SELECT id FROM family_members WHERE family_id = ? LIMIT 1",
      [familyId]
    );

    if (rows.length > 0) {
      // Family exists - redirect to my-family
      return res.redirect('/my-family');
    } else {
      // No family - redirect to dashboard with noFamily flag
      return res.render('dashboard', { noFamily: true });
    }
  } catch (err) {
    console.error("Family logic error:", err);
    return res.render('dashboard', { noFamily: true });
  }
};

exports.showForm = (req, res) => {
  res.render("family-form", { addChildMode: false });
};

exports.viewFamily = (req, res) => {
  const familyId = req.params.familyId;

  FamilyMember.getByFamilyId(familyId, (err, members) => {
    if (err) {
      console.error(err);
      return res.status(500).send("DB Error");
    }

    res.render("family-view", {
      members,
      familyId
    });
  });
};

exports.myFamily = async (req, res) => {
  try {
    const email = req.session.user.email;
    const familyId = await getFamilyId(email);

    if (!familyId) {
      return res.redirect('/family-form');
    }

    // Get family members for the logged-in user
    const [members] = await db.promise().query(
      `SELECT * FROM family_members WHERE family_id = ? ORDER BY member_type, created_at`,
      [familyId]
    );

    if (members.length === 0) {
      return res.redirect('/family-form');
    }

    res.render('my-family', { members });

  } catch (error) {
    console.error('Family fetch error:', error);
    res.redirect('/family-form');
  }
};


exports.saveFamily = async (req, res) => {
  try {
    // ✅ STEP 1: GUARANTEE USER ID (NO MORE CRASHES)
    const userId = req.session?.user?.id;
    if (!userId) {
      console.error("USER SESSION MISSING");
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    // DEBUG: Log received data
    console.log('=== SAVE FAMILY DEBUG ===');
    console.log('USER ID:', userId);
    console.log('FILES COUNT:', req.files?.length || 0);
    console.log('BODY OK:', !!req.body.parent);
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.files:', req.files ? req.files.map(f => ({
      fieldname: f.fieldname,
      filename: f.filename
    })) : 'undefined');
    console.log('========================');

    // Get user email from session
    const email = req.session.user.email;

    // Extract form data (nested structure from form)
    const parent = req.body.parent || {};
    const children = req.body.children || [];

    const {
      name: husband_name,
      wife_name,
      mobile: husband_mobile,
      occupation: husband_occupation,
      mobile_wife: wife_mobile,
      occupation_wife: wife_occupation,
      door_no,
      street,
      district,
      state,
      pincode
    } = parent;

    // 1️⃣ Use user ID as family ID
    const familyId = userId;

    // 2️⃣ Get parent photos (multer.any() creates array structure)
    const husbandPhoto = req.files?.find(f => f.fieldname === 'parent[husband_photo]')?.filename || null;
    const wifePhoto = req.files?.find(f => f.fieldname === 'parent[wife_photo]')?.filename || null;

    // 3️⃣ Insert husband
    await db.promise().query(
      `INSERT INTO family_members
       (family_id, member_type, relationship, name, mobile, occupation,
        door_no, street, district, state, pincode, photo)
       VALUES (?, 'parent', 'husband', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        familyId,
        husband_name,
        husband_mobile,
        husband_occupation,
        door_no,
        street,
        district,
        state,
        pincode,
        husbandPhoto
      ]
    );

    // 4️⃣ Insert wife (if provided)
    if (wife_name) {
      await db.promise().query(
        `INSERT INTO family_members
         (family_id, member_type, relationship, name, mobile, occupation, door_no, street,
          district, state, pincode, photo)
         VALUES (?, 'parent', 'wife', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          familyId,
          wife_name,
          wife_mobile,
          wife_occupation,
          door_no,
          street,
          district,
          state,
          pincode,
          wifePhoto
        ]
      );
    }

    // 5️⃣ Insert children
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.name) {
        const childPhoto = req.files?.find(f => f.fieldname === `children[${i}][photo]`)?.filename || null;

        await db.promise().query(
          `INSERT INTO family_members
           (family_id, member_type, relationship, name, dob, gender, occupation, mobile, photo)
           VALUES (?, 'child', ?, ?, ?, ?, ?, ?, ?)`,
          [
            familyId,
            child.relationship || 'son',
            child.name,
            child.dob,
            child.gender,
            child.occupation,
            child.mobile,
            childPhoto
          ]
        );
      }
    }

    // ✅ Success
    res.redirect('/my-family');

  } catch (err) {
    console.error('=== SAVE FAMILY ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('Error code:', err.code);
    console.error('=======================');
    res.status(500).json({
      message: 'Failed to save family data',
      error: err.message,
      code: err.code,
      stack: err.stack
    });
  }
};


exports.dashboard = async (req, res) => {
  try {
    // Check if there's any family data in the database
    const [rows] = await db.promise().query(
      "SELECT id FROM family_members LIMIT 1"
    );

    if (rows.length > 0) {
      return res.redirect('/my-family');
    } else {
      return res.render('dashboard', { hasFamily: false });
    }
  } catch (err) {
    console.error("Dashboard check error:", err);
    return res.render('dashboard', { hasFamily: false });
  }
};



exports.editForm = async (req, res) => {
  try {
    const memberId = req.params.id;

    // Get the member to edit
    const [memberRows] = await db.promise().query(
      'SELECT * FROM family_members WHERE id = ?',
      [memberId]
    );

    if (!memberRows || memberRows.length === 0) {
      return res.status(404).send("Family member not found");
    }

    const member = memberRows[0];

    // Check if user owns this family member
    const email = req.session.user.email;
    const familyId = await getFamilyId(email);

    if (member.family_id !== familyId) {
      return res.status(403).send("You don't have permission to edit this member");
    }

    res.render("family-edit", {
      member,
      memberId
    });

  } catch (error) {
    console.error('Edit form error:', error);
    res.status(500).send("Database error");
  }
};


exports.updateFamily = async (req, res) => {
  try {
    const memberId = req.params.id;

    // Check if user owns this family member
    const email = req.session.user.email;
    const familyId = await getFamilyId(email);

    const [memberCheck] = await db.promise().query(
      'SELECT family_id FROM family_members WHERE id = ?',
      [memberId]
    );

    if (!memberCheck || memberCheck[0].family_id !== familyId) {
      return res.status(403).send("You don't have permission to edit this member");
    }

    // Handle photo upload
    const photoFile = req.files?.find(f => f.fieldname === 'photo');
    const photo = photoFile ? photoFile.filename : req.body.current_photo;

    // Prepare update data
    const updateData = {
      name: req.body.name,
      mobile: req.body.mobile || null,
      occupation: req.body.occupation || null,
      door_no: req.body.door_no || null,
      street: req.body.street || null,
      district: req.body.district || null,
      state: req.body.state || null,
      pincode: req.body.pincode || null,
      photo: photo || null
    };

    // Add child-specific fields if it's a child
    if (req.body.dob) {
      updateData.dob = req.body.dob;
    }
    if (req.body.gender) {
      updateData.gender = req.body.gender;
    }
    if (req.body.relationship) {
      updateData.relationship = req.body.relationship;
    }

    // Update the member
    await db.promise().query(
      'UPDATE family_members SET ? WHERE id = ?',
      [updateData, memberId]
    );

    res.redirect('/my-family');

  } catch (error) {
    console.error('Update family error:', error);
    res.status(500).send("Database error");
  }
};


exports.deleteFamily = async (req, res) => {
  try {
    const memberId = req.params.id;

    // Check if user owns this family member
    const email = req.session.user.email;
    const familyId = await getFamilyId(email);

    const [memberCheck] = await db.promise().query(
      'SELECT family_id, photo FROM family_members WHERE id = ?',
      [memberId]
    );

    if (!memberCheck || memberCheck[0].family_id !== familyId) {
      return res.status(403).send("You don't have permission to delete this member");
    }

    // Delete the member
    await db.promise().query(
      'DELETE FROM family_members WHERE id = ?',
      [memberId]
    );

    // Optionally delete the photo file if it exists
    if (memberCheck[0].photo) {
      const fs = require('fs');
      const path = require('path');
      const photoPath = path.join(__dirname, '../public/uploads', memberCheck[0].photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    res.redirect('/my-family');

  } catch (error) {
    console.error('Delete family error:', error);
    res.status(500).send("Database error");
  }
};

exports.getMyFamily = async (req, res) => {
  try {
    // Get all family members from the database
    const [members] = await db.promise().query(
      `SELECT * FROM family_members ORDER BY member_type, created_at`
    );

    if (members.length === 0) {
      return res.render("my-family", { members: [], hasData: false });
    }

    res.render("my-family", {
      members: members || [],
      hasData: true
    });
  } catch (error) {
    console.error('Get my family error:', error);
    return res.render("my-family", { members: [], hasData: false });
  }
};

exports.getMyFamilyJson = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user || !req.session.user.email) {
      return res.json({ success: false, message: "Not logged in" });
    }

    const email = req.session.user.email;
    const familyId = await getFamilyId(email);

    if (!familyId) {
      return res.json({ success: false, message: "No family data found" });
    }

    // Get family members for the logged-in user
    FamilyMember.getByFamilyId(familyId, (err, members) => {
      if (err) {
        console.log("DB Error:", err.message);
        return res.json({ success: false, message: "Database error" });
      }

      if (!members || members.length === 0) {
        return res.json({ success: false, message: "No family data found" });
      }

      // Separate parents and children
      const parents = members.filter(m => m.member_type === 'parent');
      const children = members.filter(m => m.member_type === 'child');

      res.json({
        success: true,
        parents: parents || [],
        children: children || []
      });
    });
  } catch (error) {
    console.error('Get my family JSON error:', error);
    res.json({ success: false, message: "Database error" });
  }
};

exports.showAddChild = (req, res) => {
  res.render("family-form", { addChildMode: true });
};

exports.addChild = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      console.error("USER SESSION MISSING");
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const {
      name,
      dob,
      gender,
      occupation
    } = req.body;

    // Get photo
    const childPhoto = req.files?.find(f => f.fieldname === 'photo')?.filename || null;

    // Use user ID as family ID
    const familyId = userId;

    await db.promise().query(
      `INSERT INTO family_members
       (family_id, member_type, relationship, name, dob, gender, occupation, mobile, photo)
       VALUES (?, 'child', 'child', ?, ?, ?, ?, null, ?)`,
      [
        familyId,
        name,
        dob || null,
        gender || null,
        occupation || null,
        childPhoto
      ]
    );

    res.redirect('/my-family');

  } catch (err) {
    console.error('=== ADD CHILD ERROR ===');
    console.error('Error message:', err.message);
    console.error('=======================');
    res.status(500).json({
      message: 'Failed to add child',
      error: err.message
    });
  }
};