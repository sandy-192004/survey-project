const Admin = require("../models/admin");

exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  Admin.getAll(page, limit, (err, data) => {
    if (err) return res.status(500).send("Server Error");

    Admin.getDropdownOptions((err2, dropdowns) => {
      if (err2) return res.status(500).send("Server Error");

      res.render("admin/dashboard", {
        results: data.results,
        totalPages: data.totalPages,
        currentPage: page,
        searchValue: "",
        selectedState: "",
        selectedDistrict: "",
        states: dropdowns.states,
        districts: dropdowns.districts
      });
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
  const Child = require("../models/Child");

  Child.create(childData, (err, result) => {
    if (err) {
      console.error("Error adding child:", err);
      return res.status(500).send("Error adding child");
    }
    res.redirect("/admin/edit/" + childData.parent_id);
  });
};


exports.addChild = (req, res) => {
  const childData = {
    parent_id: req.body.parent_id,
    name: req.body.name,
    dob: req.body.dob,
    gender: req.body.gender,
     occupation: req.body.occupation
  };
  const Child = require("../models/Child");
  Child.create(childData, (err) => {
    if (err) throw err;
    res.redirect(`/admin/edit/${req.body.parent_id}`);
  });
};



function loadDropdownOptions() {
  try {
    const filePath = path.join(__dirname, "../public/data/india-states-districts.json");
    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);

    const states = Object.keys(jsonData);
    const districts = [];
    Object.keys(jsonData).forEach(state => {
      districts.push(...jsonData[state]);
    });
    const uniqueDistricts = [...new Set(districts)];

    console.log("States loaded:", states.slice(0, 5)); // Log first 5 states
    console.log("Districts loaded:", uniqueDistricts.slice(0, 5)); // Log first 5 districts

    return { states, districts: uniqueDistricts };
  } catch (error) {
    console.error("Error loading dropdown options from JSON:", error);
    return { states: [], districts: [] };
  }
}


