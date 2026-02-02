const Child = require("../models/Child");
const fs = require("fs");
const path = require("path");
const Admin = require("../models/admin");



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
