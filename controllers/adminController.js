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

    // Stats
    const [statsResult] = await db.query(`
      SELECT
        (SELECT COUNT(DISTINCT family_id) FROM family_members WHERE member_type = 'parent') AS totalFamilies,
        (SELECT COUNT(*) FROM family_members) AS totalMembers,
        (SELECT COUNT(*) FROM family_members WHERE member_type = 'child') AS totalChildren,
        (SELECT COUNT(DISTINCT family_id) FROM family_members WHERE member_type = 'parent' 
          AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS recentFamilies
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

    let countSql = `
      SELECT COUNT(DISTINCT fm.family_id) AS total
      FROM family_members fm
      WHERE fm.member_type = 'parent'
      AND fm.id = (
        SELECT MIN(id)
        FROM family_members
        WHERE family_id = fm.family_id AND member_type = 'parent'
      )
    `;

    if (q) countSql += " AND (fm.name LIKE ? OR fm.mobile LIKE ? OR fm.occupation LIKE ?)";
    if (state) countSql += " AND fm.state = ?";
    if (district) countSql += " AND fm.district = ?";

    sql += " ORDER BY fm.family_id LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const totalPages = Math.ceil(countResult[0].total / limit);

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
      stats,
      message: req.query.message || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// VIEW FAMILY MEMBERS
// =======================
exports.viewMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");
    const members = await FamilyMember.getByFamilyId(familyId);

    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    const husband = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    const member = {
      family_id: familyId,
      husband_name: husband?.name || "",
      wife_name: wife?.name || "",
      mobile: husband?.mobile || "",
      occupation: husband?.occupation || "",
      door_no: husband?.door_no || "",
      street: husband?.street || "",
      district: husband?.district || "",
      state: husband?.state || "",
      pincode: husband?.pincode || "",
      husband_photo: husband?.photo || "",
      wife_photo: wife?.photo || ""
    };

    res.render("admin/view", { member, children, updated: req.query.updated === "true" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// EDIT FAMILY
// =======================
exports.editMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");
    const members = await FamilyMember.getByFamilyId(familyId);

    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    const parent = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    const formattedChildren = children.map(c => ({
      child_id: c.id,
      child_name: c.name,
      gender: c.gender,
      occupation: c.occupation,
      date_of_birth: c.dob,
      photo: c.photo,
      door_no: c.door_no || parent?.door_no || "",
      street: c.street || parent?.street || "",
      district: c.district || parent?.district || "",
      state: c.state || parent?.state || "",
      pincode: c.pincode || parent?.pincode || ""
    }));

    const { states, districts } = loadDropdownOptions();

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
      states: states,
      districts: districts,
      message: req.query.message || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// UPDATE FAMILY (INCLUDING PHOTOS)
// =======================
exports.updateMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");
    const members = await FamilyMember.getByFamilyId(familyId);
    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    const husband = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    const uploadedFiles = {};
    if (req.files) {
      req.files.forEach(file => {
        uploadedFiles[file.fieldname] = file.filename;
      });
    }

    // Update Husband
    if (husband) {
      const husbandData = {
        name: req.body.name || husband.name, // Use existing value if undefined/null
        mobile: req.body.mobile || "",
        occupation: req.body.occupation || "",
        door_no: req.body.door_no || "",
        street: req.body.street || "",
        district: req.body.district || "",
        state: req.body.state || "",
        pincode: req.body.pincode || "",
        photo: uploadedFiles.husband_photo ? `parent/${uploadedFiles.husband_photo}` : husband.photo
      };

      // Only update if name has a valid value
      if (husbandData.name) {
        if (uploadedFiles.husband_photo && husband.photo) {
          const oldPath = path.join(__dirname, '../uploads', husband.photo);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        await FamilyMember.update(husband.id, husbandData);
      }
    }

    // Update Wife
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
        photo: uploadedFiles.wife_photo ? `parent/${uploadedFiles.wife_photo}` : (wife ? wife.photo : null)
      };
      if (wife) await FamilyMember.update(wife.id, wifeData);
      else await FamilyMember.create(wifeData);
    }

    // Children Updates
    if (req.body.children) {
      const childKeys = Object.keys(req.body.children).sort();
      for (const key of childKeys) {
        const child = req.body.children[key];
        if (child.name) {
          const childPhotoKey = `children[${key}][photo]`;
          const childPhoto = uploadedFiles[childPhotoKey] || null;
          
          // Validate gender - only accept 'Male' or 'Female'
          const validGender = (child.gender === 'Male' || child.gender === 'Female') ? child.gender : null;

          if (child.id) {
            const childData = {
              name: child.name,
              occupation: child.occupation || "",
              dob: child.dob,
              gender: validGender,
              door_no: child.door_no || "",
              street: child.street || "",
              district: child.district || "",
              state: child.state || "",
              pincode: child.pincode || ""
            };
            if (childPhoto) childData.photo = `children/${childPhoto}`;
            await FamilyMember.update(child.id, childData);
          } else {
            const rel = validGender === 'Male' ? 'son' : validGender === 'Female' ? 'daughter' : 'other';
            await FamilyMember.create({
              family_id: familyId,
              member_type: "child",
              name: child.name,
              relationship: rel,
              occupation: child.occupation || "",
              dob: child.dob,
              gender: validGender,
              door_no: child.door_no || "",
              street: child.street || "",
              district: child.district || "",
              state: child.state || "",
              pincode: child.pincode || "",
              photo: childPhoto ? `children/${childPhoto}` : null
            });
          }
        }
      }
    }

    res.redirect("/admin/dashboard?updated=true");

  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).send("Server Error");
  }
};

// =======================
// AJAX PHOTO UPLOAD (LIVE UPDATE)
// =======================
exports.uploadPhoto = async (req, res) => {
  try {
    const familyId = req.params.familyId;
    const file = req.files[0];
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const field = file.fieldname;
    const folder = field.includes("child") ? "children" : "parent";
    const photoPath = `${folder}/${file.filename}`;

    if (field === "husband_photo") {
      await db.query(
        "UPDATE family_members SET photo = ? WHERE family_id = ? AND relationship = 'husband'",
        [photoPath, familyId]
      );
    } else if (field === "wife_photo") {
      await db.query(
        "UPDATE family_members SET photo = ? WHERE family_id = ? AND relationship = 'wife'",
        [photoPath, familyId]
      );
    }

    res.json({ success: true, path: photoPath });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

// =======================
// LOGOUT
// =======================
exports.logout = async (req, res) => {
  try {
    req.session.destroy(() => res.redirect("/login"));
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
    await db.query("DELETE FROM family_members WHERE family_id = ?", [familyId]);
    res.redirect("/admin/dashboard?deleted=true");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// SEARCH (ADMIN)
// =======================
exports.search = async (req, res) => {
  try {
    const { q, state, district } = req.query;
    const { states, districts } = loadDropdownOptions();
    
    let sql = `
      SELECT DISTINCT fm.family_id AS id, fm.name, fm.district, fm.state, fm.occupation
      FROM family_members fm
      WHERE fm.member_type = 'parent'
      AND fm.id = (
        SELECT MIN(id)
        FROM family_members
        WHERE family_id = fm.family_id AND member_type = 'parent'
      )
    `;
    const params = [];

    if (q) {
      sql += " AND (fm.name LIKE ? OR fm.mobile LIKE ? OR fm.occupation LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (state) {
      sql += " AND fm.state = ?";
      params.push(state);
    }
    if (district) {
      sql += " AND fm.district = ?";
      params.push(district);
    }

    sql += " ORDER BY fm.family_id";

    const [rows] = await db.query(sql, params);

    res.render("admin/dashboard", {
      results: rows,
      states,
      districts,
      selectedState: state || "",
      selectedDistrict: district || "",
      searchValue: q || "",
      totalPages: 1,
      currentPage: 1,
      stats: {},
      message: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// =======================
// CREATE FAMILY (ADMIN)
// =======================
exports.createFamily = async (req, res) => {
  try {
    const FamilyMember = require("../models/FamilyMember");
    const { husband_name, husband_mobile, husband_occupation, husband_door_no, husband_street, husband_district, husband_state, husband_pincode, wife_name, wife_mobile, wife_occupation, wife_door_no, wife_street, wife_district, wife_state, wife_pincode } = req.body;

    // Get next family_id
    const [maxFamily] = await db.query("SELECT MAX(family_id) as maxId FROM family_members");
    const newFamilyId = (maxFamily[0].maxId || 0) + 1;

    // Create husband
    if (husband_name) {
      await FamilyMember.create({
        family_id: newFamilyId,
        member_type: "parent",
        name: husband_name,
        relationship: "husband",
        mobile: husband_mobile || "",
        occupation: husband_occupation || "",
        door_no: husband_door_no || "",
        street: husband_street || "",
        district: husband_district || "",
        state: husband_state || "",
        pincode: husband_pincode || "",
        photo: req.files?.find(f => f.fieldname === "husband_photo") ? `parent/${req.files.find(f => f.fieldname === "husband_photo").filename}` : null
      });
    }

    // Create wife
    if (wife_name) {
      await FamilyMember.create({
        family_id: newFamilyId,
        member_type: "parent",
        name: wife_name,
        relationship: "wife",
        mobile: wife_mobile || "",
        occupation: wife_occupation || "",
        door_no: wife_door_no || "",
        street: wife_street || "",
        district: wife_district || "",
        state: wife_state || "",
        pincode: wife_pincode || "",
        photo: req.files?.find(f => f.fieldname === "wife_photo") ? `parent/${req.files.find(f => f.fieldname === "wife_photo").filename}` : null
      });
    }

    res.redirect("/admin/dashboard?message=Family created successfully");
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
    const FamilyMember = require("../models/FamilyMember");
    const { family_id, name, gender, dob, occupation, door_no, street, district, state, pincode } = req.body;

    if (!family_id || !name) {
      return res.status(400).send("Family ID and name are required");
    }

    const relationship = gender === 'Male' ? 'son' : gender === 'Female' ? 'daughter' : 'other';

    await FamilyMember.create({
      family_id: family_id,
      member_type: "child",
      name: name,
      relationship: relationship,
      gender: gender,
      dob: dob,
      occupation: occupation || "",
      door_no: door_no || "",
      street: street || "",
      district: district || "",
      state: state || "",
      pincode: pincode || "",
      photo: req.files?.find(f => f.fieldname === "photo") ? `children/${req.files.find(f => f.fieldname === "photo").filename}` : null
    });

    res.redirect(`/admin/edit/${family_id}?message=Child added successfully`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};





