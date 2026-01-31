const db = require("../config/db");
const fs = require("fs");
const path = require("path");

exports.getAll = (page, limit, callback) => {
  const offset = (page - 1) * limit;

  const sql = `
    SELECT f.id AS id, p.husband_name AS name, fm_w.name AS wife_name, fm_h.mobile, fm_h.occupation,
           fm_h.district, fm_h.state
    FROM families f
    JOIN persons p ON f.id = p.family_id
    LEFT JOIN family_members fm_h ON f.id = fm_h.family_id AND fm_h.relationship = 'husband'
    LEFT JOIN family_members fm_w ON f.id = fm_w.family_id AND fm_w.relationship = 'wife'
    ORDER BY p.husband_name ASC
    LIMIT ? OFFSET ?
  `;

  const countSql = "SELECT COUNT(*) AS total FROM families";

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
    SELECT f.id AS id, p.husband_name AS name, fm_w.name AS wife_name, fm_h.mobile, fm_h.occupation,
           fm_h.district, fm_h.state
    FROM families f
    JOIN persons p ON f.id = p.family_id
    LEFT JOIN family_members fm_h ON f.id = fm_h.family_id AND fm_h.relationship = 'husband'
    LEFT JOIN family_members fm_w ON f.id = fm_w.family_id AND fm_w.relationship = 'wife'
    WHERE 1=1
  `;

  if (input) {
    sql += " AND (p.husband_name LIKE ? OR fm_h.mobile LIKE ? OR fm_h.occupation LIKE ?)";
    const like = `%${input}%`;
    params.push(like, like, like);
  }

  if (selectedState) {
    sql += " AND fm_h.state = ?";
    params.push(selectedState);
  }

  if (selectedDistrict) {
    sql += " AND fm_h.district = ?";
    params.push(selectedDistrict);
  }

  const countSql = `SELECT COUNT(*) AS total FROM (${sql}) x`;

  const [countResult] = await db.query(countSql, params);
  const totalPages = Math.ceil(countResult[0].total / limit);

  sql += " ORDER BY p.husband_name ASC LIMIT ? OFFSET ?";
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
  const sql = `
    SELECT f.id AS family_id, p.husband_name, fm_w.name AS wife_name, fm_h.mobile, fm_h.occupation,
           fm_h.door_no, fm_h.street, fm_h.district, fm_h.state, fm_h.pincode, fm_h.photo AS husband_photo, fm_w.photo AS wife_photo
    FROM families f
    JOIN persons p ON f.id = p.family_id
    LEFT JOIN family_members fm_h ON f.id = fm_h.family_id AND fm_h.relationship = 'husband'
    LEFT JOIN family_members fm_w ON f.id = fm_w.family_id AND fm_w.relationship = 'wife'
    WHERE f.id = ?
  `;
  const [results] = await db.query(sql, [id]);
  if (results.length === 0) return null;
  return results[0];
};

exports.updateMember = (id, data, callback) => {
  // Update persons table for husband_name
  const updatePersonSql = 'UPDATE persons SET husband_name = ? WHERE family_id = ?';
  db.query(updatePersonSql, [data.name, id], (err) => {
    if (err) return callback(err);

    // Update family_members for husband
    const updateHusbandSql = 'UPDATE family_members SET name = ?, mobile = ?, occupation = ?, door_no = ?, street = ?, district = ?, state = ?, pincode = ?, photo = ? WHERE family_id = ? AND relationship = ?';
    db.query(updateHusbandSql, [data.name, data.mobile, data.occupation, data.door_no, data.street, data.district, data.state, data.pincode, data.husband_photo, id, 'husband'], (err2) => {
      if (err2) return callback(err2);

      // Update family_members for wife
      const updateWifeSql = 'UPDATE family_members SET name = ?, photo = ? WHERE family_id = ? AND relationship = ?';
      db.query(updateWifeSql, [data.wife_name, data.wife_photo, id, 'wife'], callback);
    });
  });
};

exports.getChildrenByParentId = async (parentId) => {
  const sql = 'SELECT * FROM children WHERE family_id = ?';
  const [results] = await db.query(sql, [parentId]);
  return results;
};
