const db = require("../config/db");


exports.searchMembers = (filters, page, limit, callback) => {
  const { input, selectedDistrict, selectedState } = filters;
  const offset = (page - 1) * limit;
  const params = [];

  let sql = `
    SELECT id, name, mobile, email, occupation, door_no, street, district, state,
           pincode, dob, gender, parent_id
    FROM parents
    WHERE 1=1
  `;

  const isNumber = /^\d+$/.test(input || "");
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(input || "");

  if (input) {
    if (isNumber) {
      sql += " AND (mobile LIKE ? OR door_no LIKE ? OR pincode LIKE ?)";
      const like = `%${input}%`;
      params.push(like, like, like);
    } else if (isDate) {
      sql += " AND DATE_FORMAT(dob, '%Y-%m-%d') = ?";
      params.push(input);
    } else {
      const like = `%${input}%`;
      sql += `
        AND (name LIKE ? OR email LIKE ? OR occupation LIKE ? OR
             district LIKE ? OR state LIKE ? OR gender LIKE ?)
      `;
      params.push(like, like, like, like, like, like);
    }
  }

  if (selectedDistrict) {
    sql += " AND district = ?";
    params.push(selectedDistrict);
  }

  if (selectedState) {
    sql += " AND state = ?";
    params.push(selectedState);
  }

  const countSql = `SELECT COUNT(*) AS total FROM (${sql}) AS countTable`;
  db.query(countSql, params, (err, countResult) => {
    if (err) return callback(err);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    sql += " ORDER BY name ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    db.query(sql, params, (err2, results) => {
      if (err2) return callback(err2);
      callback(null, { results, totalPages });
    });
  });
};


exports.getDropdownOptions = (callback) => {
  db.query("SELECT DISTINCT district FROM family_members ORDER BY district ASC", (err1, districts) => {
    if (err1) return callback(err1);
    db.query("SELECT DISTINCT state FROM family_members ORDER BY state ASC", (err2, states) => {
      if (err2) return callback(err2);
      callback(null, { districts, states });
    });
  });
};


exports.getMemberById = (id, callback) => {
  db.query("SELECT * FROM parents WHERE id = ?", [id], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows[0]);
  });
};


exports.updateMember = (id, data, callback) => {
  db.query("UPDATE parents SET ? WHERE id = ?", [data, id], callback);
};
