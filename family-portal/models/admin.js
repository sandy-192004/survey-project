const db = require("../config/db");
const fs = require("fs");
const path = require("path");


exports.searchMembers = (filters, page, limit, callback) => {
  const { input, selectedDistrict, selectedState } = filters;
  const offset = (page - 1) * limit;
  const params = [];

  let sql = `
    SELECT parent_id as id, name, wife_name, mobile, occupation, door_no, street, district, state,
           pincode
    FROM family
    WHERE 1=1
  `;

  if (input) {
    sql += " AND (name LIKE ? OR wife_name LIKE ? OR mobile LIKE ? OR occupation LIKE ?)";
    const like = `%${input}%`;
    params.push(like, like, like, like);
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
  db.query("SELECT * FROM family WHERE parent_id = ?", [id], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows[0]);
  });
};


exports.updateMember = (id, data, callback) => {
  db.query("UPDATE family SET ? WHERE parent_id = ?", [data, id], callback);
};

exports.getAll = (page, limit, callback) => {
  const offset = (page - 1) * limit;
  const sql = `
    SELECT parent_id as id, name, wife_name, mobile, email, occupation, door_no, street, district, state,
           pincode
    FROM family
    ORDER BY name ASC
    LIMIT ? OFFSET ?
  `;
  const countSql = "SELECT COUNT(*) AS total FROM family";

  db.query(countSql, (err, countResult) => {
    if (err) return callback(err);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    db.query(sql, [limit, offset], (err2, results) => {
      if (err2) return callback(err2);
      callback(null, { results, totalPages });
    });
  });
};
