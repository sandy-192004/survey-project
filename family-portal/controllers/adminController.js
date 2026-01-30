const Admin = require("../models/admin");
const fs = require("fs");
const path = require("path");



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
  const updated = req.query.updated === 'true';
  Admin.getMemberById(id, (err, member) => {
    if (err) throw err;
    if (!member) return res.send("No member found with that ID.");

    Admin.getChildrenByParentId(id, (err2, children) => {
      if (err2) throw err2;
      res.render("admin/view", { member, children: children || [], updated });
    });
  });
};


exports.editMember = (req, res) => {
  const id = req.params.id;
  Admin.getMemberById(id, (err, member) => {
    if (err) throw err;
    if (!member) return res.send("No member found with that ID.");

    Admin.getChildrenByParentId(id, (err2, children) => {
      if (err2) throw err2;


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

      res.render("admin/edit", { parent: member, wife, children: children || [], message: null });

    // Fetch children
    Child.getByParentId(id, (err, children) => {
      if (err) {
        console.error("Error fetching children:", err);
        children = [];
      }
      const message = req.query.message || null;
      res.render("admin/edit", { parent: member, wife, children, message });

    });
  });
};


exports.updateMember = (req, res) => {
  const id = req.params.id;

  // Handle photo uploads
  const husbandPhoto = req.files ? req.files.find(file => file.fieldname === 'husband_photo') : null;
  const wifePhoto = req.files ? req.files.find(file => file.fieldname === 'wife_photo') : null;
  const childPhotos = req.files ? req.files.filter(file => file.fieldname.startsWith('children[') && file.fieldname.endsWith('][photo]')) : [];

  const parentData = { ...req.body };

  // Update photo filenames if new photos uploaded
  if (husbandPhoto) {
    parentData.husband_photo = husbandPhoto.filename;
  }
  if (wifePhoto) {
    parentData.wife_photo = wifePhoto.filename;
  }

  Admin.updateMember(id, parentData, err => {
    if (err) {
      console.error("DB Error updating parent:", err.message);
      return res.redirect("/admin/dashboard");
    }

    const Child = require("../models/Child");

    // Get existing children to know which to delete
    Child.getByParent(id, (err, existingChildren) => {
      if (err) {
        console.error("DB Error getting children:", err.message);
        return res.redirect("/admin/dashboard");
      }

      const existingIds = existingChildren.map(c => c.child_id);

      // Parse children data from flat req.body keys
      const childrenData = {};
      for (const key in req.body) {
        if (key.startsWith('children[')) {
          const match = key.match(/children\[(\d+)\]\[(\w+)\]/);
          if (match) {
            const index = match[1];
            const field = match[2];
            if (!childrenData[index]) childrenData[index] = {};
            childrenData[index][field] = req.body[key];
          }
        }
      }

      const childKeys = Object.keys(childrenData).sort((a, b) => parseInt(a) - parseInt(b));

      let processed = 0;
      const total = childKeys.length;

      if (total === 0) {
        // No children in form, delete all existing
        deleteRemoved(existingIds, () => {
          res.redirect("/admin/view/" + id + "?updated=true");
        });
      } else {
        childKeys.forEach((key) => {
          const child = childrenData[key];
          const childId = child.id;
          const childPhoto = childPhotos.find(photo => {
            const match = photo.fieldname.match(/children\[(\d+)\]\[photo\]/);
            return match && match[1] === key;
          });
          const childData = {
            name: child.name,
            occupation: child.occupation,
            photo: childPhoto ? childPhoto.filename : null
          };

          if (childId) {
            // Update existing child
            Child.update(childId, childData, (err) => {
              if (err) console.error("Update child error:", err);
              processed++;
              if (processed === total) {
                const formIds = childKeys.map(k => childrenData[k].id).filter(id => id);
                const toDelete = existingIds.filter(id => !formIds.includes(id));
                deleteRemoved(toDelete, () => {
                  res.redirect("/admin/view/" + id + "?updated=true");
                });
              }
            });
          } else {
            // Insert new child
            childData.parent_id = id;
            Child.create(childData, (err) => {
              if (err) console.error("Create child error:", err);
              processed++;
              if (processed === total) {
                const formIds = childKeys.map(k => childrenData[k].id).filter(id => id);
                const toDelete = existingIds.filter(id => !formIds.includes(id));
                deleteRemoved(toDelete, () => {
                  res.redirect("/admin/view/" + id + "?updated=true");
                });
              }
            });
          }
        });
      }
    });
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


exports.addChild = (req, res) => {
  const childData = req.body;
  if (req.files && req.files.photo) {
    childData.photo = req.files.photo[0].filename;
  }
  Child.create(childData, (err, result) => {
    if (err) {
      console.error("Error adding child:", err);
      return res.status(500).send("Error adding child");
    }
    res.redirect("/admin/edit/" + childData.parent_id + "?message=Child added successfully");
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
