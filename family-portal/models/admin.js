const db = require("../config/db");
const fs = require("fs");
const path = require("path");

/* =========================
   SEARCH + FILTER + PAGINATION
========================= */
exports.searchMembers = (filters, page, limit, callback) => {
  const { input, selectedDistrict, selectedState } = filters;
  const offset = (page - 1) * limit;
  const params = [];

  let sql = `
    SELECT p.id, p.name as husband_name, p.wife_name, p.mobile, p.occupation,
           p.door_no, p.street, p.district, p.state, p.pincode,
           GROUP_CONCAT(c.child_name SEPARATOR ', ') AS children_names,
           GROUP_CONCAT(c.date_of_birth SEPARATOR ', ') AS children_dobs,
           GROUP_CONCAT(c.occupation SEPARATOR ', ') AS children_occupations
    FROM parents p
    LEFT JOIN children c ON c.family_id = p.id
    WHERE 1=1
  `;

  const isNumber = /^\d+$/.test(input || "");

  if (input) {
    const like = `%${input}%`;

    if (isNumber) {
      sql += " AND (mobile LIKE ? OR door_no LIKE ? OR pincode LIKE ?)";
      params.push(like, like, like);
    } else {
      sql += `
        AND (
          p.name LIKE ? OR
          p.wife_name LIKE ? OR
          p.occupation LIKE ? OR
          p.district LIKE ? OR
          p.state LIKE ?
        )
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

    sql += " ORDER BY husband_name ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    db.query(sql, params, (err2, results) => {
      if (err2) return callback(err2);

      console.log("Families fetched (search):", results.length);

      callback(null, { results, totalPages });
    });
  });
};

/* =========================
   DROPDOWN OPTIONS
========================= */
exports.getDropdownOptions = (callback) => {
  const filePath = path.join(
    __dirname,
    "../public/data/india-states-districts.json"
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return callback(err);

    const statesData = JSON.parse(data);
    const states = Object.keys(statesData).sort();

    const districts = [];
    states.forEach(state => {
      districts.push(...statesData[state]);
    });

    callback(null, {
      states,
      districts: [...new Set(districts)].sort()
    });
  });
};

/* =========================
   GET FAMILY BY ID
========================= */
exports.getMemberById = (id, callback) => {
  db.query(
    "SELECT * FROM parents WHERE id = ?",
    [id],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, rows[0]);
    }
  );
};

/* =========================
   UPDATE FAMILY
========================= */
exports.updateMember = (id, data, callback) => {
  db.query(
    "UPDATE parents SET ? WHERE id = ?",
    [data, id],
    callback
  );
};

/* =========================
   GET ALL FAMILIES (DASHBOARD LOAD)
========================= */
exports.getAll = (page, limit, callback) => {
  const offset = (page - 1) * limit;

  const sql = `
    SELECT p.id, p.name as husband_name, p.wife_name, p.mobile, p.occupation,
           p.door_no, p.street, p.district, p.state, p.pincode,
           GROUP_CONCAT(c.child_name SEPARATOR ', ') AS children_names,
           GROUP_CONCAT(c.date_of_birth SEPARATOR ', ') AS children_dobs,
           GROUP_CONCAT(c.occupation SEPARATOR ', ') AS children_occupations
    FROM parents p
    LEFT JOIN children c ON c.family_id = p.id
    GROUP BY p.id
    ORDER BY husband_name ASC
    LIMIT ? OFFSET ?
  `;

  const countSql = "SELECT COUNT(*) AS total FROM parents";

  db.query(countSql, (err, countResult) => {
    if (err) return callback(err);

    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    db.query(sql, [limit, offset], (err2, results) => {
      if (err2) return callback(err2);

      console.log("Families fetched (all):", results.length);

      callback(null, { results, totalPages });
    });
  });
};
