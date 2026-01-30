const Admin = require("../models/admin");
const fs = require("fs");
const path = require("path");

exports.searchFamilies = (req, res) => {
  const q = req.query.q ? req.query.q.trim() : "";
  const state = req.query.state || "";
  const district = req.query.district || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  // ALWAYS load dropdown data
  const { states, districts } = loadDropdownOptions();

  // Case 1: No search, no filter
  if (!q && !state && !district) {
    return res.render("admin/dashboard", {
      results: [],
      message: "Please enter a search term or select filters.",
      districtOptions: districts,
      stateOptions: states,
      selectedDistrict: "",
      selectedState: "",
      searchValue: "",
      currentPage: 1,
      totalPages: 0,
      user: req.user
    });
  }

  // Case 2: Search / filter applied
  Admin.searchMembers(
    { input: q, selectedDistrict: district, selectedState: state },
    page,
    limit,
    (err, data) => {
      if (err) {
        console.error("Error searching families:", err);
        return res.render("admin/dashboard", {
          results: [],
          message: "Error searching. Please try again.",
          districtOptions: districts,
          stateOptions: states,
          selectedDistrict: district,
          selectedState: state,
          searchValue: q,
          currentPage: 1,
          totalPages: 0,
          user: req.user
        });
      }

      res.render("admin/dashboard", {
        results: data.results,
        message:
          data.results.length === 0
            ? "No families found for the search criteria."
            : null,
        districtOptions: districts,
        stateOptions: states,
        selectedDistrict: district,
        selectedState: state,
        searchValue: q,
        currentPage: page,
        totalPages: data.totalPages,
        user: req.user
      });
    }
  );
};

function loadDropdownOptions() {
  try {
    const filePath = path.join(
      __dirname,
      "../public/data/india-states-districts.json"
    );
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
