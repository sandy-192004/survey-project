const Admin = require("../models/admin");
const Child = require("../models/Child");
const fs = require("fs");
const path = require("path");



exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  Admin.getAll(page, limit, (err, data) => {
    if (err) {
      console.error("Error fetching all members:", err);
      const { states, districts } = loadDropdownOptions();
      return res.render("admin/dashboard", {
        results: [],
        message: "Error loading data. Please try again.",
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

    const { states, districts } = loadDropdownOptions();

    res.render("admin/dashboard", {
      results: data.results,
      message: data.results.length === 0 ? "No data found." : null,
      districtOptions: districts,
      stateOptions: states,
      selectedDistrict: "",
      selectedState: "",
      searchValue: "",
      currentPage: page,
      totalPages: data.totalPages,
      user: req.user
    });
  });
};


exports.dashboard = (req, res) => {
  res.render("admin/dashboard");
};

exports.search = (req, res) => {
  const input = req.query.q ? req.query.q.trim() : "";
  const selectedDistrict = req.query.district || "";
  const selectedState = req.query.state || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  if (!input && !selectedDistrict && !selectedState) {
    const { states, districts } = loadDropdownOptions();

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

    res.render("admin/edit", { parent: member, wife, children: [], message: null });
  });
};


exports.updateMember = (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  Admin.updateMember(id, updatedData, (err) => {
    if (err) throw err;
    res.redirect("/admin/dashboard");
  });
};

exports.addChild = (req, res) => {
  const childData = req.body;
  Child.create(childData, (err, result) => {
    if (err) {
      console.error("Error adding child:", err);
      return res.status(500).send("Error adding child");
    }
    res.redirect("/admin/edit/" + childData.parent_id);
  });
};

function loadDropdownOptions() {
  try {
    const filePath = path.join(__dirname, "../public/data/india-states-districts.json");
    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);

    const states = Object.keys(jsonData).map(state => ({ state }));
    const districts = [];
    Object.keys(jsonData).forEach(state => {
      jsonData[state].forEach(district => {
        districts.push({ district });
      });
    });

    return { states, districts };
  } catch (error) {
    console.error("Error loading dropdown options from JSON:", error);
    return { states: [], districts: [] };
  }
}
