const Child = require("../models/Child");
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
    const [rows] = await db.promise().query(sql, params);
    const [countResult] = await db.promise().query(countSql, countParams);
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
      currentPage: page
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

    const [rows] = await db.promise().query(sql, params);
    const [countResult] = await db.promise().query(countSql, countParams);
    const totalPages = Math.ceil(countResult[0].total / limit);

    res.render("admin/dashboard", {
      results: rows,
      states,
      districts,
      selectedState: state,
      selectedDistrict: district,
      searchValue: q,
      totalPages,
      currentPage: page
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

    const [members] = await FamilyMember.getByFamilyId(familyId);

    const parents = members.filter(m => m.member_type === "parent");
    const children = members.filter(m => m.member_type === "child");

    // Assuming first parent is husband, second is wife if exists
    const husband = parents.find(p => p.relationship === "husband") || parents[0];
    const wife = parents.find(p => p.relationship === "wife") || parents[1];

    const member = {
      family_id: familyId,
      husband_name: husband ? husband.name : "",
      wife_name: wife ? wife.name : "",
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

    const [members] = await FamilyMember.getByFamilyId(familyId);

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
// UPDATE FAMILY (placeholder)
// =======================
exports.updateMember = async (req, res) => {
  try {
    const familyId = req.params.id;

    // Update logic can be added later

    res.redirect(`/admin/edit/${familyId}?message=Family details updated successfully!`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");

exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  // Load dropdown options
  Admin.getDropdownOptions((err, dropdowns) => {
    if (err) {
      console.error("Error loading dropdown options:", err);
      return res.render("admin/dashboard", {
        results: [],
        message: "Error loading data. Please try again.",
        districtOptions: [],
        stateOptions: [],
        selectedDistrict: "",
        selectedState: "",
        searchValue: "",
        currentPage: 1,
        totalPages: 0,
        user: req.user
      });
    }

    // Get all families
    Admin.getAll(page, limit, (err2, data) => {
      if (err2) {
        console.error("Error fetching families:", err2);
        return res.render("admin/dashboard", {
          results: [],
          message: "Error loading data. Please try again.",
          districtOptions: dropdowns.districts,
          stateOptions: dropdowns.states,
          selectedDistrict: "",
          selectedState: "",
          searchValue: "",
          currentPage: 1,
          totalPages: 0,
          user: req.user
        });
      }

      res.render("admin/dashboard", {
        results: data.results,
        message: null,
        districtOptions: dropdowns.districts,
        stateOptions: dropdowns.states,
        selectedDistrict: "",
        selectedState: "",
        searchValue: "",
        currentPage: page,
        totalPages: data.totalPages,
        user: req.user
      });
    });
  });
};

exports.viewMember = (req, res) => {
  const id = req.params.id;
  Admin.getMemberById(id, (err, member) => {
    if (err) {
      console.error("Error fetching member:", err);
      return res.render("admin/view", { member: null, children: [], updated: false });
    }
    if (!member) {
      return res.render("admin/view", { member: null, children: [], updated: false });
    }
    Admin.getChildrenByParentId(id, (err2, children) => {
      if (err2) {
        console.error("Error fetching children:", err2);
        return res.render("admin/view", { member, children: [], updated: false });
      }
      res.render("admin/view", { member, children, updated: false });
    });
  });
};

exports.editMember = (req, res) => {
  const id = req.params.id;
  Admin.getMemberById(id, (err, parent) => {
    if (err) {
      console.error("Error fetching member:", err);
      return res.render("admin/edit", { parent: null, wife: null, children: [], message: null });
    }
    if (!parent) {
      return res.render("admin/edit", { parent: null, wife: null, children: [], message: null });
    }
    Admin.getChildrenByParentId(id, (err2, children) => {
      if (err2) {
        console.error("Error fetching children:", err2);
        return res.render("admin/edit", { parent, wife: null, children: [], message: null });
      }
      // Assuming wife is part of parent or separate query, but for now, set to null or adjust
      res.render("admin/edit", { parent, wife: null, children, message: null });
    });
  });
};

exports.updateMember = (req, res) => {
  const id = req.params.id;
  const data = req.body;
  // Handle file uploads if any
  if (req.files) {
    if (req.files.husband_photo) {
      data.husband_photo = req.files.husband_photo[0].filename;
    }
    if (req.files.wife_photo) {
      data.wife_photo = req.files.wife_photo[0].filename;
    }

  }
  Admin.updateMember(id, data, (err) => {
    if (err) {
      console.error("Error updating member:", err);
      return res.redirect("/admin/edit/" + id);
    }
    res.redirect("/admin/dashboard");
  });
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

    res.redirect(`/admin/edit/${familyId}?message=Child added successfully`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");

exports.addChild = (req, res) => {
  const childData = req.body;
  if (req.files && req.files.photo) {
    childData.photo = req.files.photo[0].filename;

  }
  Child.create(childData, (err) => {
    if (err) {
      console.error("Error adding child:", err);
      return res.redirect("/admin/edit/" + childData.parent_id);
    }
    res.redirect("/admin/edit/" + childData.parent_id);
  });
};
