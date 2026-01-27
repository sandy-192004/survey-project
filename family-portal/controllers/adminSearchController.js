const Admin = require("../models/admin");

exports.searchFamilies = (req, res) => {
  const q = req.query.q ? req.query.q.trim() : "";
  const state = req.query.state || "";
  const district = req.query.district || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  if (!q && !state && !district) {
    return res.render("admin/dashboard", {
      results: [],
      message: "Please enter a search term or select filters.",
      districtOptions: [],
      stateOptions: [],
      selectedDistrict: district,
      selectedState: state,
      searchValue: q,
      currentPage: 1,
      totalPages: 0,
      user: req.user
    });
  }

  Admin.searchMembers({ input: q, selectedDistrict: district, selectedState: state }, page, limit, (err, data) => {
    if (err) {
      console.error("Error searching families:", err);
      return res.render("admin/dashboard", {
        results: [],
        message: "Error searching. Please try again.",
        districtOptions: [],
        stateOptions: [],
        selectedDistrict: district,
        selectedState: state,
        searchValue: q,
        currentPage: 1,
        totalPages: 0,
        user: req.user
      });
    }

    // Load static dropdown options
    const { states, districts } = loadDropdownOptions();

    res.render("admin/dashboard", {
      results: data.results,
      message: data.results.length === 0 ? `No families found for the search criteria.` : null,
      districtOptions: districts,
      stateOptions: states,
      selectedDistrict: district,
      selectedState: state,
      searchValue: q,
      currentPage: page,
      totalPages: data.totalPages,
      user: req.user
    });
  });
};

function loadDropdownOptions() {
  try {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "../public/data/india-states-districts.json");
    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);

    const states = Object.keys(jsonData);
    const districts = [];
    Object.keys(jsonData).forEach(state => {
      districts.push(...jsonData[state]);
    });
    const uniqueDistricts = [...new Set(districts)];

    return { states, districts: uniqueDistricts };
  } catch (error) {
    console.error("Error loading dropdown options:", error);
    return { states: [], districts: [] };
  }
}
