

const Parent = require("../models/Parent");
const Child = require("../models/Child");
const User = require("../models/User");


exports.showForm = (req, res) => {
  res.render("family-form");
};


exports.saveFamily = (req, res) => {
  const parentData = {
    name: req.body.parent.name,
    mobile: req.body.parent.mobile,
    email: req.body.parent.email,
    occupation: req.body.parent.occupation,
    door_no: req.body.parent.door_no,
    street: req.body.parent.street,
    district: req.body.parent.district,
    state: req.body.parent.state,
    pincode: req.body.parent.pincode
  };

  
  Parent.create(parentData, (err, result) => {
    if (err) throw err;

    const parentId = result.insertId;

   
    (req.body.children || []).forEach(child => {
      const childData = {
        parent_id: parentId,
        name: child.name,
        occupation: child.occupation
      };
      Child.create(childData, () => {});
    });

    
    const userData = {
      parent_id: parentId,
      email: req.body.parent.email,
      password: req.body.parent.password || "default123"
    };
    User.create(userData, () => {});

    res.redirect("/dashboard");
  });
};


exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page || 1); // default page = 1

  Parent.getAll((err, parents) => {
    if (err) throw err;

    if (!parents || parents.length === 0) {
      return res.render("dashboard", { families: [], page });
    }

    let count = 0;
    const families = [];

    parents.forEach(parent => {
      Child.getByParent(parent.id, (err, children) => {
        if (err) throw err;

        families.push({
          parent,
          children
        });

        count++;
        if (count === parents.length) {
          res.render("dashboard", { families, page }); // pass page here!
        }
      });
    });
  });
};



exports.editForm = (req, res) => {
  const parentId = req.params.id;

  Parent.getById(parentId, (err, parentRows) => {
    if (err) throw err;

    if (!parentRows || parentRows.length === 0) {
      return res.status(404).send("Parent not found");
    }

    const parent = parentRows[0];

    Child.getByParent(parentId, (err, children) => {
      if (err) throw err;

      res.render("family-edit", {
        parent,
        children
      });
    });
  });
};


exports.updateFamily = (req, res) => {
  const parentId = req.params.id;
  const parentData = { ...req.body.parent };


  Parent.update(parentId, parentData, err => {
    if (err) throw err;

   
    Child.deleteByParent(parentId, err => {
      if (err) throw err;

      
      (req.body.children || []).forEach(child => {
        const childData = {
          parent_id: parentId,
          name: child.name,
          occupation: child.occupation
        };
        Child.create(childData, () => {});
      });

      res.redirect("/dashboard");
    });
  });
};


exports.deleteFamily = (req, res) => {
  const parentId = req.params.id;


  Parent.delete(parentId, () => {
    res.redirect("/dashboard");
  });
};
