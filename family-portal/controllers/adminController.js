const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const Admin = require("../models/admin");
const Child = require("../models/Child");

function loadDropdownOptions() {
  try {
    const filePath = path.join(__dirname, "../public/data/india-states-districts.json");
    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);
    const states = Object.keys(jsonData);
    const districts = [];
    states.forEach(state => {
      districts.push(...jsonData[state]);
    });
    return {
      states,
      districts: [...new Set(districts)]
    };
  } catch (error) {
    console.error("Error loading dropdown options:", error);
    return { states: [], districts: [] };
  }
}

// =======================
// ADMIN DASHBOARD
// =======================
exports.dashboard = async (req, res) => {
  try {
    const q = req.query.q || "";
    const state = req.query.state || "";
    const district = req.query.district || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const offset = (page - 1) * limit;

    const { states, districts } = loadDropdownOptions();

    // Calculate stats with optimized single query
    const [statsResult] = await db.query(`
      SELECT
        (SELECT COUNT(DISTINCT family_id) FROM family_members WHERE member_type = 'parent') AS totalFamilies,
        (SELECT COUNT(*) FROM family_members) AS totalMembers,
        (SELECT COUNT(*) FROM family_members WHERE member_type = 'child') AS totalChildren,
        (SELECT COUNT(DISTINCT family_id) FROM family_members WHERE member_type = 'parent' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS recentFamilies
    `);

    const stats = {
      totalFamilies: statsResult[0].totalFamilies,
      totalMembers: statsResult[0].totalMembers,
      totalChildren: statsResult[0].totalChildren,
      recentFamilies: statsResult[0].recentFamilies
    };

    let sql = `
      SELECT
        fm.family_id AS id,
        fm.name,
        fm.district,
        fm.state,
        fm.occupation,
        (
          SELECT COUNT(*)
          FROM family_members c
          WHERE c.family_id = fm.family_id AND c.member_type = 'child'
        ) AS children_count
      FROM family_members fm
      WHERE fm.member_type = 'parent'
      AND fm.id = (
        SELECT MIN(id)
        FROM family_members
        WHERE family_id = fm.family_id AND member_type = 'parent'
      )
    `;
    const params = [];
    const countParams = [];

    if (q) {
      sql += " AND (fm.name LIKE ? OR fm.mobile LIKE ? OR fm.occupation LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
      countParams.push(like, like, like);
    }

    if (state) {
      sql += " AND fm.state = ?";
      params.push(state);
      countParams.push(state);
    }

    if (district) {
      sql += " AND fm.district = ?";
      params.push(district);
      countParams.push(district);
    }

    let countSql = `SELECT COUNT(DISTINCT fm.family_id) AS total FROM family_members fm WHERE fm.member_type = 'parent' AND fm.id = (SELECT MIN(id) FROM family_members WHERE family_id = fm.family_id AND member_type = 'parent')`;

    if (q) {
      countSql += " AND (fm.name LIKE ? OR fm.mobile LIKE ? OR fm.occupation LIKE ?)";
    }

    if (state) {
      countSql += " AND fm.state = ?";
    }

    if (district) {
      countSql += " AND fm.district = ?";
    }

    sql += " ORDER BY fm.family_id LIMIT ? OFFSET ?";
    params.push(limit, offset);

    console.log('Dashboard: About to execute query');
    const [rows] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const totalPages = Math.ceil(countResult[0].total / limit);

    console.log('Dashboard query results:', rows.length, 'rows');
    console.log('Total pages:', totalPages);
    console.log('First row:', rows[0]);

    res.render("admin/dashboard", {
      results: rows,
      states,
      districts,
      selectedState: state,
      selectedDistrict: district,
      searchValue: q,
      totalPages,
      currentPage: page,
      updated: req.query.updated === "true",
      deleted: req.query.deleted === "true",
      stats: stats,
      message: req.query.message || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// SEARCH (same view, safe)
// =======================
exports.search = async (req, res) => {
  try {
    const q = req.query.q || "";
    const state = req.query.state || "";
    const district = req.query.district || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const offset = (page - 1) * limit;

    const { states, districts } = loadDropdownOptions();

    let sql = `
      SELECT
        fm.family_id AS id,
        fm.name,
        fm.district,
        fm.state,
        fm.occupation,
        (
          SELECT COUNT(*)
          FROM family_members c
          WHERE c.family_id = fm.family_id AND c.member_type = 'child'
        ) AS children_count
      FROM family_members fm
      WHERE fm.member_type = 'parent'
      AND fm.id = (
        SELECT MIN(id)
        FROM family_members
        WHERE family_id = fm.family_id AND member_type = 'parent'
      )
    `;
    const params = [];
    const countParams = [];

    if (q) {
      sql += " AND (fm.name LIKE ? OR fm.mobile LIKE ? OR fm.occupation LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
      countParams.push(like, like, like);
    }

    if (state) {
      sql += " AND fm.state = ?";
      params.push(state);
      countParams.push(state);
    }

    if (district) {
      sql += " AND fm.district = ?";
      params.push(district);
      countParams.push(district);
    }

    let countSql = `SELECT COUNT(DISTINCT fm.family_id) AS total FROM family_members fm WHERE fm.member_type = 'parent' AND fm.id = (SELECT MIN(id) FROM family_members WHERE family_id = fm.family_id AND member_type = 'parent')`;

    if (q) {
      countSql += " AND (fm.name LIKE ? OR fm.mobile LIKE ? OR fm.occupation LIKE ?)";
    }

    if (state) {
      countSql += " AND fm.state = ?";
    }

    if (district) {
      countSql += " AND fm.district = ?";
    }

    sql += " ORDER BY fm.family_id LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const totalPages = Math.ceil(countResult[0].total / limit);

    // Calculate stats for search as well with optimized single query
    const [statsResult] = await db.query(`
      SELECT
        (SELECT COUNT(DISTINCT family_id) FROM family_members WHERE member_type = 'parent') AS totalFamilies,
        (SELECT COUNT(*) FROM family_members) AS totalMembers,
        (SELECT COUNT(*) FROM family_members WHERE member_type = 'child') AS totalChildren,
        (SELECT COUNT(DISTINCT family_id) FROM family_members WHERE member_type = 'parent' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS recentFamilies
    `);

    const stats = {
      totalFamilies: statsResult[0].totalFamilies,
      totalMembers: statsResult[0].totalMembers,
      totalChildren: statsResult[0].totalChildren,
      recentFamilies: statsResult[0].recentFamilies
    };

    res.render("admin/dashboard", {
      results: rows,
      states,
      districts,
      selectedState: state,
      selectedDistrict: district,
      searchValue: q,
      totalPages,
      currentPage: page,

      stats: stats,
      message: req.query.message || null,

      updated: false

    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


// VIEW FAMILY MEMBERS

exports.viewMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");

    const members = await FamilyMember.getByFamilyId(familyId);

    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    // Assuming first parent is husband, second is wife if exists
    const husband = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    const member = {
      family_id: familyId,
      husband_name: husband ? husband.name : "",
      wife_name: wife ? wife.name : "",
      husband_gender: husband ? husband.gender : "",
      wife_gender: wife ? wife.gender : "",
      mobile: husband ? husband.mobile : "",
      occupation: husband ? husband.occupation : "",
      door_no: husband ? husband.door_no : "",
      street: husband ? husband.street : "",
      district: husband ? husband.district : "",
      state: husband ? husband.state : "",
      pincode: husband ? husband.pincode : "",
      husband_photo: husband ? husband.photo : "",
      wife_photo: wife ? wife.photo : ""
    };

    res.render("admin/view", {
      member,
      children,
      updated: req.query.updated === "true"
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// EDIT FAMILY MEMBERS
// =======================
exports.editMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");

    const members = await FamilyMember.getByFamilyId(familyId);

    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    // Assuming first parent is husband, second is wife if exists
    const parent = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    // Format children for the view
    const formattedChildren = children.map(c => ({
      child_id: c.id,
      child_name: c.name,
      occupation: c.occupation,
      date_of_birth: c.dob,
      photo: c.photo
    }));

    res.render("admin/edit", {
      familyId,
      parent: parent ? {
        id: parent.id,
        husband_name: parent.name,
        mobile: parent.mobile,
        occupation: parent.occupation,
        door_no: parent.door_no,
        street: parent.street,
        district: parent.district,
        state: parent.state,
        pincode: parent.pincode,
        husband_photo: parent.photo
      } : null,
      wife: wife ? {
        name: wife.name,
        mobile: wife.mobile,
        occupation: wife.occupation,
        door_no: wife.door_no,
        street: wife.street,
        district: wife.district,
        state: wife.state,
        pincode: wife.pincode,
        photo: wife.photo
      } : null,
      children: formattedChildren,
      message: req.query.message || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// UPDATE FAMILY
// =======================
exports.updateMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");

    // Get existing members
    const members = await FamilyMember.getByFamilyId(familyId);
    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    // Find husband and wife
    const husband = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    // Handle photo uploads
    const uploadedFiles = {};
    if (req.files) {
      req.files.forEach(file => {
        uploadedFiles[file.fieldname] = file.filename;
      });
    }

    // Update husband
    if (husband) {
      const husbandData = {
        name: req.body.name,
        mobile: req.body.mobile,
        occupation: req.body.occupation,
        door_no: req.body.door_no,
        street: req.body.street,
        district: req.body.district,
        state: req.body.state,
        pincode: req.body.pincode,
        photo: uploadedFiles.husband_photo || husband.photo
      };
      await FamilyMember.update(husband.id, husbandData);
    }

    // Handle wife
    if (req.body.wife_name) {
      const wifeData = {
        family_id: familyId,
        member_type: "parent",
        name: req.body.wife_name,
        relationship: "wife",
        mobile: req.body.wife_mobile || "",
        occupation: req.body.wife_occupation || "",
        door_no: req.body.wife_door_no || "",
        street: req.body.wife_street || "",
        district: req.body.wife_district || "",
        state: req.body.wife_state || "",
        pincode: req.body.wife_pincode || "",
        photo: uploadedFiles.wife_photo || (wife ? wife.photo : null)
      };

      if (wife) {
        // Update existing wife
        await FamilyMember.update(wife.id, wifeData);
      } else {
        // Insert new wife
        await FamilyMember.create(wifeData);
      }
    }

    // Handle children updates and inserts
    if (req.body.children) {
      const childKeys = Object.keys(req.body.children).sort();

      for (const key of childKeys) {
        const child = req.body.children[key];
        if (child.name) { // Process any child with a name
          const childPhotoKey = `children[${key}][photo]`;
          const childPhoto = uploadedFiles[childPhotoKey] || null;

          if (child.id) {
            // Update existing child
            const childData = {
              name: child.name,
              occupation: child.occupation || "",
              dob: child.dob,
              gender: child.gender || ""
            };
            if (childPhoto) {
              childData.photo = childPhoto;
            }

            const sql = "UPDATE family_members SET name = ?, occupation = ?, dob = ?, gender = ?" + (childData.photo ? ", photo = ?" : "") + " WHERE id = ?";
            const params = [childData.name, childData.occupation, childData.dob, childData.gender];
            if (childData.photo) params.push(childData.photo);
            params.push(child.id);
            await db.query(sql, params);
          } else {
            // Insert new child (added via + Add Child button)
            const fullChildData = {
              family_id: familyId,
              member_type: "child",
              name: child.name,
              relationship: "child",
              mobile: "",
              occupation: child.occupation || "",
              dob: child.dob,
              gender: child.gender || "",
              door_no: "",
              street: "",
              district: "",
              state: "",
              pincode: "",
              photo: childPhoto
            };

            await FamilyMember.create(fullChildData);
          }
        }
      }
    }

    // Redirect to dashboard with success message
    res.redirect("/admin/dashboard?updated=true");

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// ADD CHILD
// =======================
exports.addChild = async (req, res) => {
  try {
    const familyId = req.body.family_id;
    const FamilyMember = require("../models/FamilyMember");

    await FamilyMember.create({
      family_id: familyId,
      member_type: "child",
      name: req.body.name,
      relationship: "child",
      mobile: req.body.mobile || "",
      occupation: req.body.occupation || "",
      dob: req.body.dob,
      gender: req.body.gender,
      door_no: "",
      street: "",
      district: "",
      state: "",
      pincode: "",
      photo: req.files && req.files.photo
        ? req.files.photo[0].filename
        : null
    });

    res.redirect("/admin/dashboard?updated=true");

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// DELETE FAMILY
// =======================
exports.deleteFamily = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");

    // Delete all members of the family
    await db.query("DELETE FROM family_members WHERE family_id = ?", [familyId]);

    res.redirect("/admin/dashboard?deleted=true");

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// CREATE FAMILY (ADMIN)
// =======================
exports.createFamily = async (req, res) => {
  const connection = await db.getConnection();

  try {
    console.log("📥 Admin Create Family Body:", req.body);
    console.log("📎 Admin Create Family Files:", req.files);

    await connection.beginTransaction();

    // Step 1: Insert into families
    const familyCode = req.body.family_code || `FAM-${Date.now()}`;
    const [familyResult] = await connection.query(
      "INSERT INTO families (user_id, family_code, created_by_admin) VALUES (?, ?, ?)",
      [null, familyCode, 1]
    );
    const familyId = familyResult.insertId;

    // Step 2: Insert husband (father)
    await connection.query(
      `INSERT INTO family_members
       (family_id, member_type, name, relationship, mobile, occupation, gender, door_no, street, district, state, pincode, photo)
       VALUES (?, 'parent', ?, 'husband', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        familyId,
        req.body.husband_name,
        req.body.mobile || null,
        req.body.occupation || null,
        req.body.husband_gender || 'Male',
        req.body.door_no || null,
        req.body.street || null,
        req.body.district || null,
        req.body.state || null,
        req.body.pincode || null,
        req.files && req.files['husband_photo'] ? `parents/${req.files['husband_photo'][0].filename}` : null
      ]
    );

    // Step 3: Insert wife (mother) if provided
    if (req.body.wife_name) {
      await connection.query(
        `INSERT INTO family_members
         (family_id, member_type, name, relationship, mobile, occupation, gender, door_no, street, district, state, pincode, photo)
         VALUES (?, 'parent', ?, 'wife', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          familyId,
          req.body.wife_name,
          req.body.wife_mobile || null,
          req.body.wife_occupation || null,
          req.body.wife_gender || 'Female',
          req.body.door_no || null,
          req.body.street || null,
          req.body.district || null,
          req.body.state || null,
          req.body.pincode || null,
          req.files && req.files['wife_photo'] ? `parents/${req.files['wife_photo'][0].filename}` : null
        ]
      );
    }

    // Step 4: Insert children
    if (req.body.children && typeof req.body.children === 'object') {
      const childKeys = Object.keys(req.body.children).sort();
      for (const key of childKeys) {
        const child = req.body.children[key];
        if (child.name) {
          const childPhoto = req.files && req.files[`children[${key}][photo]`] ? req.files[`children[${key}][photo]`][0] : null;
          await connection.query(
            `INSERT INTO family_members
             (family_id, member_type, name, relationship, mobile, occupation, dob, gender, door_no, street, district, state, pincode, photo)
             VALUES (?, 'child', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              familyId,
              child.name,
              child.relationship || 'child',
              child.mobile || null,
              child.occupation || null,
              child.dob || null,
              child.gender || null,
              req.body.door_no || null,
              req.body.street || null,
              req.body.district || null,
              req.body.state || null,
              req.body.pincode || null,
              childPhoto ? `children/${childPhoto.filename}` : null
            ]
          );
        }
      }
    }

    await connection.commit();

    res.json({ success: true });

  } catch (err) {
    await connection.rollback();
    console.error("ADMIN CREATE FAMILY ERROR");
    console.error("Message:", err.message);
    console.error("SQL:", err.sqlMessage);
    console.error("Stack:", err.stack);

    res.json({ success: false, message: "Database error" });
  } finally {
    connection.release();
  }
};
