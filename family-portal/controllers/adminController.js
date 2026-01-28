const Admin = require("../models/admin");
const fs = require("fs");
const path = require("path");

/* =========================
   DASHBOARD – LOAD ALL FAMILIES
========================= */
exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  Admin.getAll(page, limit, (err, data) => {
    if (err) {
      console.error("Error fetching families:", err);
      return res.render("admin/dashboard", {
        results: [],
        message: "Error loading data",
        ...loadDropdownOptions(),
        selectedDistrict: "",
        selectedState: "",
        searchValue: "",
        currentPage: 1,
        totalPages: 0
      });
    }

    const families = data.results;
    const Child = require("../models/Child");

    const promises = families.map(family => {
      return new Promise((resolve, reject) => {
        Child.getByParent(family.id, (err, children) => {
          if (err) reject(err);
          family.children = children || [];
          resolve();
        });
      });
    });

    Promise.all(promises).then(() => {
      res.render("admin/dashboard", {
        results: families,
        message: families.length === 0 ? "No families found." : null,
        ...loadDropdownOptions(),
        selectedDistrict: "",
        selectedState: "",
        searchValue: "",
        currentPage: page,
        totalPages: data.totalPages
      });
    }).catch(err => {
      console.error("Error fetching children:", err);
      res.render("admin/dashboard", {
        results: [],
        message: "Error loading data",
        ...loadDropdownOptions(),
        selectedDistrict: "",
        selectedState: "",
        searchValue: "",
        currentPage: 1,
        totalPages: 0
      });
    });
  });
};

/* =========================
   SEARCH + FILTER
========================= */
exports.search = (req, res) => {
  const input = (req.query.q || "").trim();
  const selectedDistrict = req.query.district || "";
  const selectedState = req.query.state || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 9;

  Admin.searchMembers(
    { input, selectedDistrict, selectedState },
    page,
    limit,
    (err, data) => {
      if (err) {
        console.error("Search error:", err);
        return res.render("admin/dashboard", {
          results: [],
          message: "Search failed",
          ...loadDropdownOptions(),
          selectedDistrict,
          selectedState,
          searchValue: input,
          currentPage: 1,
          totalPages: 0
        });
      }

      const families = data.results;
      const Child = require("../models/Child");

      const promises = families.map(family => {
        return new Promise((resolve, reject) => {
          Child.getByParent(family.id, (err, children) => {
            if (err) reject(err);
            family.children = children || [];
            resolve();
          });
        });
      });

      Promise.all(promises).then(() => {
        res.render("admin/dashboard", {
          results: families,
          message:
            families.length === 0
              ? "No matching families found."
              : null,
          ...loadDropdownOptions(),
          selectedDistrict,
          selectedState,
          searchValue: input,
          currentPage: page,
          totalPages: data.totalPages
        });
      }).catch(err => {
        console.error("Error fetching children:", err);
        res.render("admin/dashboard", {
          results: [],
          message: "Error loading data",
          ...loadDropdownOptions(),
          selectedDistrict,
          selectedState,
          searchValue: input,
          currentPage: 1,
          totalPages: 0
        });
      });
    }
  );
};

/* =========================
   VIEW FAMILY
========================= */
exports.viewMember = (req, res) => {
  Admin.getMemberById(req.params.id, (err, member) => {
    if (err || !member) return res.send("Family not found");
    res.render("admin/view", { member });
  });
};

/* =========================
   EDIT FAMILY
========================= */
exports.editMember = (req, res) => {
  Admin.getMemberById(req.params.id, (err, member) => {
    if (err || !member) return res.send("Family not found");
    res.render("admin/edit", { member });
  });
};

/* =========================
   UPDATE FAMILY
========================= */
exports.updateMember = (req, res) => {
  Admin.updateMember(req.params.id, req.body, err => {
    if (err) throw err;
    res.redirect("/admin/dashboard");
  });
};


/* =========================
   LOAD DROPDOWN OPTIONS
========================= */
function loadDropdownOptions() {
  const filePath = path.join(
    __dirname,
    "../public/data/india-states-districts.json"
  );

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    return {
      stateOptions: Object.keys(data).sort(),
      districtOptions: [...new Set(Object.values(data).flat())].sort(),
      stateDistrictMap: data
    };
  } catch (err) {
    console.error("Dropdown JSON error:", err);
    return {
      stateOptions: [],
      districtOptions: [],
      stateDistrictMap: {}
    };
  }
}
