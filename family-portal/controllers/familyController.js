const Parent = require("../models/Parent");
const Child = require("../models/Child");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

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
  const { mobile } = req.body;

  if (!mobile) {
    return res.json({ success: false, message: "Mobile number is required" });
  }

  Parent.getByMobile(mobile, (err, results) => {
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


exports.saveFamily = (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const userEmail = req.session.user.email;

  // Handle photo uploads
  const husbandPhoto = req.files ? req.files.find(file => file.fieldname === 'parent[husband_photo]') : null;
  const wifePhoto = req.files ? req.files.find(file => file.fieldname === 'parent[wife_photo]') : null;
  const childPhotos = req.files ? req.files.filter(file => file.fieldname === 'children[][photo]') : [];

  const parentData = {
    name: req.body.parent.name,
    wife_name: req.body.parent.wife_name,
    mobile: req.body.parent.mobile,
    email: userEmail,
    occupation: req.body.parent.occupation,
    door_no: req.body.parent.door_no,
    street: req.body.parent.street,
    district: req.body.parent.district,
    state: req.body.parent.state,
    pincode: req.body.parent.pincode,
    husband_photo: husbandPhoto ? husbandPhoto.filename : null,
    wife_photo: wifePhoto ? wifePhoto.filename : null
  };

  // Get user by email
  User.getByEmail(userEmail, (err, userResults) => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.redirect("/dashboard");
    }

    if (!userResults || userResults.length === 0) {
      return res.redirect("/dashboard");
    }

    const user = userResults[0];

    if (user.parent_id) {
      // Update existing parent
      Parent.update(user.parent_id, parentData, (err) => {
        if (err) {
          console.log("DB Error:", err.message);
          return res.redirect("/dashboard");
        }

        // Delete existing children
        Child.deleteByParent(user.parent_id, (err) => {
          if (err) {
            console.log("DB Error:", err.message);
          }

          // Add new children
          (req.body.children || []).forEach((child, index) => {
            const childPhoto = childPhotos[index];
            const childData = {
              parent_id: user.parent_id,
              name: child.name,
              occupation: child.occupation,
              dob: child.dob,
              gender: child.gender,
              photo: childPhoto ? childPhoto.filename : null
            };
            Child.create(childData, () => {});
          });

          res.redirect("/dashboard?success=1");
        });
      });
    } else {
      // Create new parent
      Parent.create(parentData, (err, result) => {
        if (err) {
          console.log("DB Error:", err.message);
          return res.redirect("/dashboard");
        }

        const parentId = result.insertId;

        // Update user with parent_id
        User.updateParentId(user.id, parentId, (err) => {
          if (err) {
            console.log("DB Error:", err.message);
          }

          // Add children
          (req.body.children || []).forEach((child, index) => {
            const childPhoto = childPhotos[index];
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
    }
  });
};


exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page || 1); // default page = 1

  // Check if user is logged in and fetch their family data
  let userFamily = null;
  if (req.session.user && req.session.user.parent_id) {
    Parent.getById(req.session.user.parent_id, (err, parentRows) => {
      if (err) {
        console.log("DB Error:", err.message);
      } else if (parentRows && parentRows.length > 0) {
        const parent = parentRows[0];
        Child.getByParent(parent.id, (err, children) => {
          if (err) {
            console.log("DB Error:", err.message);
            children = [];
          }
          userFamily = { parent, children: children || [] };
          renderDashboard();
        });
      } else {
        renderDashboard();
      }
    });
  } else {
    renderDashboard();
  }

  function renderDashboard() {
    Parent.getAll((err, parents) => {
      if (err) {
        // If database error, still render dashboard with empty data
        console.log("DB Error:", err.message);
        return res.render("dashboard", { families: [], page, userFamily });
      }

      if (!parents || parents.length === 0) {
        return res.render("dashboard", { families: [], page, userFamily });
      }

      let count = 0;
      const families = [];

      parents.forEach(parent => {
        Child.getByParent(parent.id, (err, children) => {
          if (err) {
            console.log("DB Error:", err.message);
            children = [];
          }

          families.push({
            parent,
            children: children || []
          });

          count++;
          if (count === parents.length) {
            res.render("dashboard", { families, page, userFamily }); // pass page here!
          }
        });
      });
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

  const userEmail = req.session.user.email;

  // Find parent by email
  Parent.getByEmail(userEmail, (err, parentRows) => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.render("my-family", { parent: null, children: [], hasData: false });
    }

    if (!parentRows || parentRows.length === 0) {
      return res.render("my-family", { parent: null, children: [], hasData: false });
    }

    const parent = parentRows[0];

    Child.getByParent(parent.id, (err, children) => {
      if (err) {
        console.log("DB Error:", err.message);
        children = [];
      }

      res.render("my-family", {
        parent,
        children: children || [],
        hasData: true
      });
    });
  });
};

exports.getMyFamilyJson = (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.json({ success: false, message: "Not logged in" });
  }

  const userEmail = req.session.user.email;

  // Find parent by email
  Parent.getByEmail(userEmail, (err, parentRows) => {
    if (err) {
      console.log("DB Error:", err.message);
      return res.json({ success: false, message: "Database error" });
    }

    if (!parentRows || parentRows.length === 0) {
      return res.json({ success: false, message: "No family data found" });
    }

    const parent = parentRows[0];

    Child.getByParent(parent.id, (err, children) => {
      if (err) {
        console.log("DB Error:", err.message);
        children = [];
      }

      res.json({
        success: true,
        parent,
        children: children || []
      });
    });
  });
};
