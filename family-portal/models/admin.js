const db = require("../config/db");
const fs = require("fs");
const path = require("path");

exports.getAll = (page, limit, callback) => {
  const offset = (page - 1) * limit;

  const sql = `
    SELECT f.family_id AS id, f.husband_name AS name, f.wife_name, f.mobile, f.occupation,
           f.district, f.state, COUNT(c.child_id) AS children_count
    FROM family f
    LEFT JOIN children c ON f.family_id = c.family_id
    GROUP BY f.family_id, f.husband_name, f.wife_name, f.mobile, f.occupation, f.district, f.state
    ORDER BY f.husband_name ASC
    LIMIT ? OFFSET ?
  `;

  const countSql = "SELECT COUNT(*) AS total FROM family";

  db.query(countSql, (err, countResult) => {
    if (err) return callback(err);

    const totalPages = Math.ceil(countResult[0].total / limit);

    db.query(sql, [limit, offset], (err2, results) => {
      if (err2) return callback(err2);
      callback(null, { results, totalPages });
    });
  });
};

exports.searchMembers = (filters, page, limit, callback) => {
  const { input, selectedState, selectedDistrict } = filters;
  const offset = (page - 1) * limit;
  const params = [];

  let sql = `
    SELECT f.family_id AS id, f.husband_name AS name, f.wife_name, f.mobile, f.occupation,
           f.district, f.state, COUNT(c.child_id) AS children_count
    FROM family f
    LEFT JOIN children c ON f.family_id = c.family_id
    WHERE 1=1
  `;

  if (input) {
    sql += " AND (f.husband_name LIKE ? OR f.mobile LIKE ? OR f.occupation LIKE ?)";
    const like = `%${input}%`;
    params.push(like, like, like);
  }

  if (selectedState) {
    sql += " AND f.state = ?";
    params.push(selectedState);
  }

  if (selectedDistrict) {
    sql += " AND f.district = ?";
    params.push(selectedDistrict);
  }

  sql += " GROUP BY f.family_id, f.husband_name, f.wife_name, f.mobile, f.occupation, f.district, f.state";

  const countSql = `SELECT COUNT(*) AS total FROM (${sql}) x`;

  db.query(countSql, params, (err, countResult) => {
    if (err) return callback(err);

    const totalPages = Math.ceil(countResult[0].total / limit);

    sql += " ORDER BY f.husband_name ASC LIMIT ? OFFSET ?";
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
    const json = JSON.parse(data);
    const states = Object.keys(json).sort();
    const districts = [...new Set(states.flatMap(s => json[s]))].sort();
    callback(null, { states, districts });
  });
};

exports.getMemberById = (id, callback) => {
  const sql = 'SELECT * FROM family WHERE family_id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return callback(err);
    if (results.length === 0) return callback(null, null);
    callback(null, results[0]);
  });
};

exports.updateMember = (id, data, callback) => {
  const sql = 'UPDATE family SET husband_name = ?, wife_name = ?, mobile = ?, occupation = ?, door_no = ?, street = ?, district = ?, state = ?, pincode = ?, husband_photo = ?, wife_photo = ? WHERE family_id = ?';
  const params = [data.name, data.wife_name, data.mobile, data.occupation, data.door_no, data.street, data.district, data.state, data.pincode, data.husband_photo, data.wife_photo, id];
  db.query(sql, params, callback);
};

exports.getChildrenByParentId = (parentId, callback) => {
  const sql = 'SELECT * FROM children WHERE family_id = ?';
  db.query(sql, [parentId], callback);
};
