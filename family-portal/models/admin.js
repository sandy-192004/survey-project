const db = require("../config/db");
const fs = require("fs");
const path = require("path");

exports.getAll = (page, limit, callback) => {
  const offset = (page - 1) * limit;

  const sql = `

    SELECT f.id AS id, fm_husband.name AS name, fm_wife.name AS wife_name, fm_husband.mobile, fm_husband.occupation,
           fm_husband.district, fm_husband.state, COUNT(fm_child.id) AS children_count
    FROM families f
    LEFT JOIN family_members fm_husband ON f.id = fm_husband.family_id AND fm_husband.relationship = 'husband' AND fm_husband.member_type = 'parent'
    LEFT JOIN family_members fm_wife ON f.id = fm_wife.family_id AND fm_wife.relationship = 'wife' AND fm_wife.member_type = 'parent'
    LEFT JOIN family_members fm_child ON f.id = fm_child.family_id AND fm_child.member_type = 'child'
    GROUP BY f.id, fm_husband.name, fm_wife.name, fm_husband.mobile, fm_husband.occupation, fm_husband.district, fm_husband.state
    ORDER BY fm_husband.name ASC

    SELECT family_id AS id, husband_name AS name, wife_name, mobile, occupation,
           district, state
    FROM family
    ORDER BY husband_name ASC

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

exports.searchMembers = (filters, page, limit, callback) => {
  const { input, selectedState, selectedDistrict } = filters;
  const offset = (page - 1) * limit;
  const params = [];

  let sql = `

    SELECT f.id AS id, p.husband_name AS name, fm_wife.name AS wife_name, fm_husband.mobile, fm_husband.occupation,
           fm_husband.district, fm_husband.state, COUNT(fm_child.id) AS children_count
    FROM families f
    JOIN persons p ON f.id = p.family_id
    LEFT JOIN family_members fm_husband ON f.id = fm_husband.family_id AND fm_husband.relationship = 'husband'
    LEFT JOIN family_members fm_wife ON f.id = fm_wife.family_id AND fm_wife.relationship = 'wife'
    LEFT JOIN family_members fm_child ON f.id = fm_child.family_id AND fm_child.member_type = 'child'

    SELECT family_id AS id, husband_name AS name, wife_name, mobile, occupation,
           district, state
    FROM family

    WHERE 1=1
  `;

  if (input) {
    sql += " AND (p.husband_name LIKE ? OR fm_husband.mobile LIKE ? OR fm_husband.occupation LIKE ?)";
    sql += " AND (husband_name LIKE ? OR mobile LIKE ? OR occupation LIKE ?)";
    const like = `%${input}%`;
    params.push(like, like, like);
  }

  if (selectedState) {

    sql += " AND fm_husband.state = ?";

    sql += " AND state = ?";
    params.push(selectedState);
  }

  if (selectedDistrict) {
    sql += " AND fm_husband.district = ?";
    params.push(selectedDistrict);
  }

  sql += " GROUP BY f.id, p.husband_name, fm_wife.name, fm_husband.mobile, fm_husband.occupation, fm_husband.district, fm_husband.state";

    sql += " AND district = ?";
    params.push(selectedDistrict);
  }


  const countSql = `SELECT COUNT(*) AS total FROM (${sql}) x`;

  db.query(countSql, params, (err, countResult) => {
    if (err) return callback(err);

    const totalPages = Math.ceil(countResult[0].total / limit);


    sql += " ORDER BY p.husband_name ASC LIMIT ? OFFSET ?";

    sql += " ORDER BY husband_name ASC LIMIT ? OFFSET ?";

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
  const sql = `
    SELECT f.id AS family_id, p.husband_name, fm_wife.name AS wife_name, fm_husband.mobile, fm_husband.occupation,
           fm_husband.door_no, fm_husband.street, fm_husband.district, fm_husband.state, fm_husband.pincode,
           fm_husband.photo AS husband_photo, fm_wife.photo AS wife_photo
    FROM families f
    JOIN persons p ON f.id = p.family_id
    LEFT JOIN family_members fm_husband ON f.id = fm_husband.family_id AND fm_husband.relationship = 'husband'
    LEFT JOIN family_members fm_wife ON f.id = fm_wife.family_id AND fm_wife.relationship = 'wife'
    WHERE f.id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return callback(err);
    if (results.length === 0) return callback(null, null);
    callback(null, results[0]);
  });
};

exports.updateMember = (id, data, callback) => {
  // Update persons for husband_name
  const sqlPersons = 'UPDATE persons SET husband_name = ? WHERE family_id = ?';
  db.query(sqlPersons, [data.name, id], (err) => {
    if (err) return callback(err);

    // Update husband family_member
    const sqlHusband = 'UPDATE family_members SET name = ?, mobile = ?, occupation = ?, door_no = ?, street = ?, district = ?, state = ?, pincode = ?, photo = ? WHERE family_id = ? AND relationship = ?';
    const husbandParams = [data.name, data.mobile, data.occupation, data.door_no, data.street, data.district, data.state, data.pincode, data.husband_photo, id, 'husband'];
    db.query(sqlHusband, husbandParams, (err2) => {
      if (err2) return callback(err2);

      // Update wife family_member
      const sqlWife = 'UPDATE family_members SET name = ?, photo = ? WHERE family_id = ? AND relationship = ?';
      const wifeParams = [data.wife_name, data.wife_photo, id, 'wife'];
      db.query(sqlWife, wifeParams, callback);
    });
  });
};

exports.getChildrenByParentId = (parentId, callback) => {
  const sql = 'SELECT id AS child_id, name AS child_name, occupation, dob AS date_of_birth, gender, photo FROM family_members WHERE family_id = ? AND member_type = ?';
  db.query(sql, [parentId, 'child'], callback);
};
