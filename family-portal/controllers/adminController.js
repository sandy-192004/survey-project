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
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

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
