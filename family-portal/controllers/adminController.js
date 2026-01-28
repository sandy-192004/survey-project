const Admin = require("../models/admin");

exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  Admin.getAll(page, limit, (err, data) => {
    if (err) return res.status(500).send("Server Error");

    res.render("admin/dashboard", {
      results: data.results,
      totalPages: data.totalPages,
      currentPage: page,
      searchValue: "",
      selectedState: "",
      selectedDistrict: "",
      states: [],
      districts: []
    });
  });
};

exports.search = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  const filters = {
    input: req.query.q || "",
    selectedState: req.query.state || "",
    selectedDistrict: req.query.district || ""
  };

  Admin.searchMembers(filters, page, limit, (err, data) => {
    if (err) return res.status(500).send("Server Error");

    Admin.getDropdownOptions((err2, dropdowns) => {
      if (err2) return res.status(500).send("Server Error");

      res.render("admin/dashboard", {
        results: data.results,
        totalPages: data.totalPages,
        currentPage: page,
        searchValue: filters.input,
        selectedState: filters.selectedState,
        selectedDistrict: filters.selectedDistrict,
        states: dropdowns.states,
        districts: dropdowns.districts
      });
    });
  });
};
