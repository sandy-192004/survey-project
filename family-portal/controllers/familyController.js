const User = require("../models/User");
const FamilyMember = require("../models/FamilyMember");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

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
      req.session.user = {
        id: user.id,
        email: user.email
      };
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

        // Redirect to login page after successful registration
        res.redirect("/login");
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

exports.checkFamily = (req, res) => {
  const { mobile } = req.query;

  if (!mobile) {
    return res.json({ success: false, message: "Mobile number is required" });
  }

  // Check if any family member has this mobile number
  const sql = "SELECT fm.*, u.email FROM family_members fm JOIN users u ON fm.user_id = u.id WHERE fm.mobile = ?";
  db.query(sql, [mobile], (err, results) => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.json({ success: false, message: "Database error" });
    }

    if (!results || results.length === 0) {
      return res.json({ success: false, message: "No data found" });
    }

    // Family found
    res.json({ success: true, message: "Family found", data: results[0] });
  });
};

exports.showForm = (req, res) => {
  res.render("family-form");
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

    if (!req.session.user || !req.session.user.email) {
      return res.redirect('/login');
    }

    const email = req.session.user.email;

    // 🔎 Find family_id linked to this email
    const [familyRows] = await db.query(
      `SELECT id FROM families WHERE email = ?`,
      [email]
    );

    // ❌ No family found
    if (familyRows.length === 0) {
      return res.render('my-family', {
        hasData: false,
        parent: null,
        children: []
      });
    }

    const familyId = familyRows[0].id;

    // 👨‍👩‍👧 Parent details
    const [parents] = await db.query(
      `SELECT * FROM family_members
       WHERE family_id = ? AND member_type = 'parent'`,
      [familyId]
    );

    // 👶 Children details
    const [children] = await db.query(
      `SELECT * FROM family_members
       WHERE family_id = ? AND member_type = 'child'`,
      [familyId]
    );

    if (parents.length === 0) {
      return res.render('my-family', {
        hasData: false,
        parent: null,
        children: []
      });
    }

    res.render('my-family', {
      hasData: true,
      parent: parents[0],
      children
    });

  } catch (error) {
    console.error('Family fetch error:', error);
    res.status(500).render('my-family', {
      hasData: false,
      parent: null,
      children: []
    });
  }
};


exports.saveFamily = async (req, res) => {
  try {
    // 🔐 Auth check
    if (!req.session.user || !req.session.user.email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const email = req.session.user.email;

    const {
      husband_name,
      wife_name,
      mobile,
      occupation,
      door_no,
      street,
      district,
      state,
      pincode,
      child_name,
      child_dob,
      child_gender
    } = req.body;

    // 1️⃣ Create family (or reuse)
    let familyId;
    const [existing] = await db.query(
      'SELECT id FROM families WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      familyId = existing[0].id;
    } else {
      const [result] = await db.query(
        'INSERT INTO families (email) VALUES (?)',
        [email]
      );
      familyId = result.insertId;
    }

    // 2️⃣ Parent photo
    const parentPhoto = req.files?.parent_photo
      ? req.files.parent_photo[0].filename
      : null;

    // 3️⃣ Insert husband
    await db.query(
      `INSERT INTO family_members
       (family_id, member_type, relationship, name, mobile, occupation,
        door_no, street, district, state, pincode, photo)
       VALUES (?, 'parent', 'husband', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        familyId,
        husband_name,
        mobile,
        occupation,
        door_no,
        street,
        district,
        state,
        pincode,
        parentPhoto
      ]
    );

    // 4️⃣ Insert wife
    await db.query(
      `INSERT INTO family_members
       (family_id, member_type, relationship, name, door_no, street,
        district, state, pincode, photo)
       VALUES (?, 'parent', 'wife', ?, ?, ?, ?, ?, ?, ?)`,
      [
        familyId,
        wife_name,
        door_no,
        street,
        district,
        state,
        pincode,
        parentPhoto
      ]
    );

    // 5️⃣ Insert child (if exists)
    if (child_name) {
      const childPhoto = req.files?.child_photo
        ? req.files.child_photo[0].filename
        : null;

      await db.query(
        `INSERT INTO family_members
         (family_id, member_type, relationship, name, dob, gender, photo)
         VALUES (?, 'child', 'son', ?, ?, ?, ?)`,
        [familyId, child_name, child_dob, child_gender, childPhoto]
      );
    }

    // ✅ Success
    res.redirect('/dashboard');

  } catch (err) {
    console.error('Save family error:', err);
    res.status(500).json({ message: 'Failed to save family data' });
  }
};


exports.dashboard = async (req, res) => {
  const userId = req.session.user?.id;

  try {
    const [rows] = await db.promise().query(
      "SELECT DISTINCT family_id FROM family_members WHERE family_id = ?",
      [userId]
    );

    const hasFamily = rows.length > 0;
    return res.render('dashboard', { hasFamily });
  } catch (err) {
    console.error("Dashboard check error:", err);
    return res.render('dashboard', { hasFamily: false });
  }
};



exports.editForm = (req, res) => {
  const parentId = req.params.id;

  Parent.getById(parentId, (err, parentRows) => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.render("family-edit", { parent: null, children: [] });
    }

    if (!parentRows || parentRows.length === 0) {
      return res.status(404).send("Parent not found");
    }

    const parent = parentRows[0];

    Child.getByParent(parentId, (err, children) => {
      if (err) {
        console.log("DB Error:", err.message);
        children = [];
      }

      res.render("family-edit", {
        parent,
        children: children || []
      });
    });
  });
};


exports.updateFamily = (req, res) => {
  const parentId = req.params.id;

  // Handle photo uploads
  const husbandPhoto = req.files ? req.files.find(file => file.fieldname === 'husband_photo') : null;
  const wifePhoto = req.files ? req.files.find(file => file.fieldname === 'wife_photo') : null;
  const childPhotos = req.files ? req.files.filter(file => file.fieldname.startsWith('children[') && file.fieldname.endsWith('][photo]')) : [];

  const parentData = { ...req.body.parent };

  // Update photo filenames if new photos uploaded
  if (husbandPhoto) {
    parentData.husband_photo = husbandPhoto.filename;
  }
  if (wifePhoto) {
    parentData.wife_photo = wifePhoto.filename;
  }

  Parent.update(parentId, parentData, err => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.redirect("/dashboard");
    }


    Child.deleteByParent(parentId, err => {
      if (err) {
        console.log("DB Error:", err.message);
        return res.redirect("/dashboard");
      }


      (req.body.children || []).forEach((child, index) => {
        const childPhoto = childPhotos.find(photo => {
          const match = photo.fieldname.match(/children\[(\d+)\]\[photo\]/);
          return match && parseInt(match[1]) === index;
        });
        const childData = {
          parent_id: parentId,
          name: child.name,
          occupation: child.occupation,
          dob: child.dob,
          gender: child.gender,
          photo: childPhoto ? childPhoto.filename : null
        };
        Child.create(childData, () => {});
      });

      res.redirect("/dashboard");
    });
  });
};


exports.deleteFamily = (req, res) => {
  const parentId = req.params.id;


  Parent.delete(parentId, (err) => {
    if (err) {
      console.log("DB Error:", err.message);
    }
    res.redirect("/dashboard");
  });
};

exports.getMyFamily = (req, res) => {
  // Check if user is logged in
  if (!req.session.user?.id) {
    return res.redirect("/login");
  }

  // Get family members for the logged-in user
  FamilyMember.getByUserId(req.session.user.id, (err, members) => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.render("my-family", { parents: [], children: [], hasData: false });
    }

    if (!members || members.length === 0) {
      return res.render("my-family", { parents: [], children: [], hasData: false });
    }

    // Separate parents and children
    const parents = members.filter(m => m.member_type === 'parent');
    const children = members.filter(m => m.member_type === 'child');

    res.render("my-family", {
      parents: parents || [],
      children: children || [],
      hasData: true
    });
  });
};

exports.getMyFamilyJson = (req, res) => {
  // Check if user is logged in
  if (!req.session.userId) {
    return res.json({ success: false, message: "Not logged in" });
  }

  // Get family members for the logged-in user
  FamilyMember.getByFamilyId(req.session.userId, (err, members) => {
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
};
