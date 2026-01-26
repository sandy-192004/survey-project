const db = require("../config/db");
const fs = require("fs");
const path = require("path");


exports.searchMembers = (filters, page, limit, callback) => {
  const { input, selectedDistrict, selectedState } = filters;
  const offset = (page - 1) * limit;
  const params = [];

  let sql = `
    SELECT id, name, mobile, email, occupation, door_no, street, district, state,
           pincode, parent_id
    FROM parents
    WHERE 1=1
  `;

  const isNumber = /^\d+$/.test(input || "");

  if (input) {
    if (isNumber) {
      sql += " AND (mobile LIKE ? OR door_no LIKE ? OR pincode LIKE ?)";
      const like = `%${input}%`;
      params.push(like, like, like);
    } else {
      const like = `%${input}%`;
      sql += `
        AND (name LIKE ? OR email LIKE ? OR occupation LIKE ? OR
             district LIKE ? OR state LIKE ?)
      `;
      params.push(like, like, like, like, like);
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
  const filePath = path.join(__dirname, "../public/data/india-states-districts.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return callback(err);
    const statesData = JSON.parse(data);
    const states = Object.keys(statesData).sort();
    const districts = [];
    states.forEach(state => {
      districts.push(...statesData[state]);
    });
    const uniqueDistricts = [...new Set(districts)].sort();
    callback(null, { districts: uniqueDistricts, states });
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
