const db = require("../config/db");
const fs = require("fs");
const path = require("path");

exports.getAll = (page, limit, callback) => {
  const offset = (page - 1) * limit;

  const sql = `
    SELECT family_id AS id, husband_name AS name, wife_name, mobile, occupation,
           district, state
    FROM family
    ORDER BY husband_name ASC
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

exports.searchMembers = async (filters, page, limit) => {
  const { input, selectedState, selectedDistrict } = filters;
  const offset = (page - 1) * limit;
  const params = [];

  let sql = `
    SELECT family_id AS id, husband_name AS name, wife_name, mobile, occupation,
           district, state
    FROM family
    WHERE 1=1
  `;

  if (input) {
    sql += " AND (husband_name LIKE ? OR mobile LIKE ? OR occupation LIKE ?)";
    const like = `%${input}%`;
    params.push(like, like, like);
  }

  if (selectedState) {
    sql += " AND state = ?";
    params.push(selectedState);
  }

  if (selectedDistrict) {
    sql += " AND district = ?";
    params.push(selectedDistrict);
  }

  const countSql = `SELECT COUNT(*) AS total FROM (${sql}) x`;

  const [countResult] = await db.query(countSql, params);
  const totalPages = Math.ceil(countResult[0].total / limit);

  sql += " ORDER BY husband_name ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [results] = await db.query(sql, params);
  return { results, totalPages };
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

exports.getMemberById = async (id) => {
  const sql = 'SELECT * FROM family WHERE family_id = ?';
  const [results] = await db.query(sql, [id]);
  if (results.length === 0) return null;
  return results[0];
};

exports.updateMember = (id, data, callback) => {
  const sql = 'UPDATE family SET husband_name = ?, wife_name = ?, mobile = ?, occupation = ?, door_no = ?, street = ?, district = ?, state = ?, pincode = ?, husband_photo = ?, wife_photo = ? WHERE family_id = ?';
  const params = [data.name, data.wife_name, data.mobile, data.occupation, data.door_no, data.street, data.district, data.state, data.pincode, data.husband_photo, data.wife_photo, id];
  db.query(sql, params, callback);
};

exports.getChildrenByParentId = async (parentId) => {
  const sql = 'SELECT * FROM children WHERE family_id = ?';
  const [results] = await db.query(sql, [parentId]);
  return results;
};
