const Admin = require("../models/admin");


exports.dashboard = (req, res) => {
  Admin.getDropdownOptions((err, data) => {
    if (err) {
      console.error("Error fetching dropdown options:", err);
      return res.render("admin/dashboard", {
        results: [],
        message: "Error loading data. Please try again.",
        districtOptions: [],
        stateOptions: [],
        selectedDistrict: "",
        selectedState: "",
        searchValue: "",
        currentPage: 1,
        totalPages: 0
      });
    }

    const { districts = [], states = [] } = data || {};

    res.render("admin/dashboard", {
      results: [],
      message: "Please enter or select something to search.",
      districtOptions: districts,
      stateOptions: states,
      selectedDistrict: "",
      selectedState: "",
      searchValue: "",
      currentPage: 1,
      totalPages: 0
    });
  });
};


exports.search = (req, res) => {
  const input = req.query.q ? req.query.q.trim() : "";
  const selectedDistrict = req.query.district || "";
  const selectedState = req.query.state || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  if (!input && !selectedDistrict && !selectedState) {
    Admin.getDropdownOptions((err, data) => {
      if (err) {
        console.error("Error fetching dropdown options:", err);
        return res.render("admin/dashboard", {
          results: [],
          message: "Error loading data. Please try again.",
          districtOptions: [],
          stateOptions: [],
          selectedDistrict,
          selectedState,
          searchValue: "",
          currentPage: 1,
          totalPages: 0
        });
      }

      const { districts = [], states = [] } = data || {};

      return res.render("admin/dashboard", {
        results: [],
        message: "Please enter or select something to search.",
        districtOptions: districts,
        stateOptions: states,
        selectedDistrict,
        selectedState,
        searchValue: "",
        currentPage: 1,
        totalPages: 0
      });
    });
    return;
  }

  Admin.searchMembers({ input, selectedDistrict, selectedState }, page, limit, (err, data) => {
    if (err) {
      console.error("Error searching members:", err);
      return res.render("admin/dashboard", {
        results: [],
        message: "Error searching. Please try again.",
        districtOptions: [],
        stateOptions: [],
        selectedDistrict,
        selectedState,
        searchValue: input,
        currentPage: 1,
        totalPages: 0
      });
    }

    Admin.getDropdownOptions((err2, dropdownData) => {
      if (err2) {
        console.error("Error fetching dropdown options:", err2);
        return res.render("admin/dashboard", {
          results: data.results,
          message: data.results.length === 0 ? `No data found for "${input || "filters"}".` : null,
          districtOptions: [],
          stateOptions: [],
          selectedDistrict,
          selectedState,
          searchValue: input,
          currentPage: page,
          totalPages: data.totalPages
        });
      }

      const { districts = [], states = [] } = dropdownData || {};

      res.render("admin/dashboard", {
        results: data.results,
        message: data.results.length === 0 ? `No data found for "${input || "filters"}".` : null,
        districtOptions: districts,
        stateOptions: states,
        selectedDistrict,
        selectedState,
        searchValue: input,
        currentPage: page,
        totalPages: data.totalPages
      });
    });
  });
};


exports.viewMember = (req, res) => {
  const id = req.params.id;
  Admin.getMemberById(id, (err, member) => {
    if (err) throw err;
    if (!member) return res.send("No member found with that ID.");
    res.render("admin/view", { member });
  });
};


exports.editMember = (req, res) => {
  const id = req.params.id;
  Admin.getMemberById(id, (err, member) => {
    if (err) throw err;
    res.render("admin/edit", { member, message: null });
  });
};


exports.updateMember = (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  Admin.updateMember(id, updatedData, (err) => {
    if (err) throw err;
    res.render("admin/edit", {
      member: { id, ...updatedData },
      message: "Details updated successfully!"
    });
  });
};
