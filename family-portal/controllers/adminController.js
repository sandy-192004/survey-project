const db = require("../config/db");
const fs = require("fs");
const path = require("path");

exports.dashboard = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.id AS family_id, fm.*
      FROM families f
      JOIN family_members fm ON fm.family_id = f.id
      ORDER BY f.id
    `);

    res.render("admin/dashboard", { families: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


exports.editMember = (req, res) => {
  const id = req.params.id;
  const message = req.query.message;
  Admin.getMemberById(id, (err, member) => {
    if (err) throw err;
    if (!member) return res.send("No member found with that ID.");

    // For the sample data structure, wife info is in the same record
    // Create a wife object from the member data
    const wife = member.wife_name ? {
      id: member.id + '_wife', // Temporary ID for wife
      name: member.wife_name,
      mobile: member.mobile,
      email: member.email,
      occupation: '',
      door_no: member.door_no,
      street: member.street,
      district: member.district,
      state: member.state,
      pincode: member.pincode
    } : null;

    Child.getByParent(id, (err, children) => {
      if (err) {
        console.error("Error fetching children:", err);
        children = [];
      }
      const message = req.query.message || null;
      res.render("admin/edit", { parent: member, wife, children, message });
    });
  });


// Admin views all families - no search needed for now
exports.search = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.id AS family_id, fm.*
      FROM families f
      JOIN family_members fm ON fm.family_id = f.id
      ORDER BY f.id
    `);

    res.render("admin/dashboard", { families: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


// View family members by family_id
exports.viewMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");

    const [members] = await FamilyMember.getByFamilyId(familyId);

    res.render("admin/view", { members, updated: req.query.updated === 'true' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Edit family members
exports.editMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");

    const [members] = await FamilyMember.getByFamilyId(familyId);

    // Separate parents and children
    const parents = members.filter(m => m.member_type === 'parent');
    const children = members.filter(m => m.member_type === 'child');

    res.render("admin/edit", {
      familyId,
      parents,
      children,
      message: req.query.message || null
    });

  });
};

exports.addChild = (req, res) => {
  const childData = req.body;

  if (req.files && req.files.photo) {
    childData.photo = req.files.photo[0].filename;

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Update family members
exports.updateMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const FamilyMember = require("../models/FamilyMember");

    // Get existing members
    const [existingMembers] = await FamilyMember.getByFamilyId(familyId);

    // Update logic here - simplified for now
    // In a real app, you'd handle updates, inserts, deletes

    res.redirect("/admin/edit/" + familyId + "?message=Family details updated successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");

  }
};

// Add child to family
exports.addChild = async (req, res) => {
  try {
    const familyId = req.params.id || req.body.family_id;
    const FamilyMember = require("../models/FamilyMember");

    await FamilyMember.create({
      family_id: familyId,
      member_type: 'child',
      name: req.body.name,
      relationship: 'child',
      mobile: req.body.mobile || '',
      occupation: req.body.occupation || '',
      dob: req.body.dob,
      gender: req.body.gender,
      door_no: '',
      street: '',
      district: '',
      state: '',
      pincode: '',
      photo: req.files && req.files.photo ? req.files.photo[0].filename : null
    });

    res.redirect("/admin/edit/" + familyId + "?message=Child added successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
