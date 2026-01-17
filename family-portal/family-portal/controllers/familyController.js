const Family = require("../models/FamilyMember");

exports.showForm = (req, res) => {
  res.render("family-form");
};

exports.saveFamily = (req, res) => {
  const parent = { ...req.body.parent, parent_id: null };

  Family.create(parent, (err, result) => {
    if (err) throw err;

    const parentId = result.insertId;

    (req.body.children || []).forEach(child => {
      Family.create(
        { ...child, parent_id: parentId },
        () => {}
      );
    });

    res.redirect("/dashboard");
  });
};

exports.dashboard = (req, res) => {
  const page = parseInt(req.query.page || 1);

  Family.getPaginated(req.query, page, 10, (err, rows) => {
    res.render("dashboard", { families: rows, page });
  });
};

exports.editForm = (req, res) => {
  Family.getFamilyWithChildren(req.params.id, (err, rows) => {
    if (err) throw err;

    if (!rows || rows.length === 0) {
      return res.status(404).send("Family not found");
    }

    // ✅ Parent is the one with parent_id NULL
    const parent = rows.find(r => r.parent_id === null || r.parent_id === undefined);

    if (!parent) {
      return res.status(500).send("Parent record missing");
    }

    const children = rows.filter(r => r.parent_id === parent.id);

    res.render("family-edit", {
      parent,
      children
    });
  });
};


exports.updateFamily = (req, res) => {
  const parentId = req.params.id;
  const parentData = { ...req.body.parent };

  Family.update(parentId, parentData, err => {
    if (err) throw err;

    // delete old children
    Family.deleteChildren(parentId, err => {
      if (err) throw err;

      // insert new children
      (req.body.children || []).forEach(child => {
        Family.create(
          { ...child, parent_id: parentId },
          () => {}
        );
      });

      res.redirect("/dashboard");
    });
  });
};


exports.deleteFamily = (req, res) => {
  Family.delete(req.params.id, () => {
    res.redirect("/dashboard");
  });
};


