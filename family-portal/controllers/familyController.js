const Parent = require("../models/Parent");
const Child = require("../models/Child");
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
        email: user.email,
        parent_id: user.parent_id,
        loginTime: new Date()
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


exports.saveFamily = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const p = req.body.parent || {};
    const children = req.body.children || {};
    const files = req.files || [];

    const getFile = (field) => {
      const f = files.find(file => file.fieldname === field);
      return f ? f.filename : null;
    };

    const husbandPhoto = getFile("parent[husband_photo]");
    const wifePhoto = getFile("parent[wife_photo]");

    const conn = await db.promise().getConnection();
    await conn.beginTransaction();

    // Delete existing family (overwrite)
    await conn.query("DELETE FROM family_members WHERE user_id = ?", [userId]);

    // Insert husband
    await conn.query(
      `INSERT INTO family_members
       (user_id, member_type, relationship, name, mobile, occupation, dob, gender, door_no, street, district, state, pincode, photo)
       VALUES (?, 'parent', 'husband', ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        p.name,
        p.mobile,
        p.occupation,
        p.door_no,
        p.street,
        p.district,
        p.state,
        p.pincode,
        husbandPhoto
      ]
    );

    // Insert wife
    if (p.wife_name) {
      await conn.query(
        `INSERT INTO family_members
         (user_id, member_type, relationship, name, door_no, street, district, state, pincode, photo)
         VALUES (?, 'parent', 'wife', ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          p.wife_name,
          p.door_no,
          p.street,
          p.district,
          p.state,
          p.pincode,
          wifePhoto
        ]
      );
    }

    // Insert children
    for (const key of Object.keys(children)) {
      const c = children[key];
      if (!c || !c.name) continue;

      const childPhoto = getFile(`children[${key}][photo]`);

      await conn.query(
        `INSERT INTO family_members
         (user_id, member_type, relationship, name, dob, gender, occupation, photo)
         VALUES (?, 'child', ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          c.relationship,
          c.name,
          c.dob || null,
          c.gender || null,
          c.occupation || null,
          childPhoto
        ]
      );
    }

    await conn.commit();
    conn.release();

    // Success popup + redirect
    res.send(`
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      <script>
        Swal.fire({
          icon: "success",
          title: "Saved!",
          text: "Family saved successfully",
          confirmButtonText: "OK"
        }).then(() => {
          window.location.href = "/dashboard";
        });
      </script>
    `);

  } catch (err) {
    console.error("Save family error:", err);

    res.send(`
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      <script>
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to save family",
          confirmButtonText: "OK"
        }).then(() => {
          window.location.href = "/family-form";
        });
      </script>
    `);
  }
};


exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page || 1); // default page = 1

  // Check if user is logged in and fetch their family data
  let userFamily = null;
  if (req.session.user) {
    FamilyMember.getByUserId(req.session.user.id, (err, members) => {
      if (err) {
        console.log("DB Error:", err.message);
        members = [];
      }

      // Separate parents and children
      const parents = members.filter(m => m.member_type === 'parent');
      const children = members.filter(m => m.member_type === 'child');

      userFamily = {
        parents: parents || [],
        children: children || []
      };
      renderDashboard();
    });
  } else {
    renderDashboard();
  }

  function renderDashboard() {
    FamilyMember.getAll((err, allMembers) => {
      if (err) {
        // If database error, still render dashboard with empty data
        console.log("DB Error:", err.message);
        return res.render("dashboard", { families: [], page, userFamily });
      }

      if (!allMembers || allMembers.length === 0) {
        return res.render("dashboard", { families: [], page, userFamily });
      }

      // Group members by user_id
      const familiesMap = {};
      allMembers.forEach(member => {
        if (!familiesMap[member.user_id]) {
          familiesMap[member.user_id] = {
            user_email: member.user_email,
            parents: [],
            children: []
          };
        }

        if (member.member_type === 'parent') {
          familiesMap[member.user_id].parents.push(member);
        } else if (member.member_type === 'child') {
          familiesMap[member.user_id].children.push(member);
        }
      });

      const families = Object.values(familiesMap);
      res.render("dashboard", { families, page, userFamily });
    });
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
  if (!req.session.user) {
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
  if (!req.session.user) {
    return res.json({ success: false, message: "Not logged in" });
  }

  // Get family members for the logged-in user
  FamilyMember.getByUserId(req.session.user.id, (err, members) => {
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
