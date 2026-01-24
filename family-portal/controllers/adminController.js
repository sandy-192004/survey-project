const db = require("../config/db");

exports.search = (req, res) => {
  const input = req.query.q ? req.query.q.trim() : "";
  const selectedDistrict = req.query.district || "";
  const selectedState = req.query.state || "";
  const page = parseInt(req.query.page) || 1; 
  const limit = 9; 
  const offset = (page - 1) * limit;

 
  if (!input && !selectedDistrict && !selectedState) {
    db.query("SELECT DISTINCT district FROM family_members ORDER BY district ASC", (err1, districtOptions) => {
      if (err1) throw err1;
      db.query("SELECT DISTINCT state FROM family_members ORDER BY state ASC", (err2, stateOptions) => {
        if (err2) throw err2;
        return res.render("admin/search", {
          results: [],
          message: "Please enter or select something to search.",
          districtOptions,
          stateOptions,
          selectedDistrict,
          selectedState,
          currentPage: 1,
          totalPages: 0,
          searchValue: "",
        });
      });
    });
    return;
  }

  const isNumber = /^\d+$/.test(input);
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(input);

  let sql = `
    SELECT id, name, mobile, area, district, state, door_no, category,
           gender, date_of_birth, age, image_path
    FROM family_members
    WHERE 1=1
  `;
  const params = [];


  if (input) {
    if (isNumber) {
      sql += " AND (mobile LIKE ? OR door_no LIKE ?)";
      const like = `%${input}%`;
      params.push(like, like);
    } else if (isDate) {
      sql += " AND DATE_FORMAT(date_of_birth, '%Y-%m-%d') = ?";
      params.push(input);
    } else {
      const like = `%${input}%`;
      sql += `
        AND (
          name LIKE ? OR district LIKE ? OR area LIKE ? OR
          state LIKE ? OR category LIKE ?
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


  const countSql = `SELECT COUNT(*) as total FROM (${sql}) as countTable`;
  db.query(countSql, params, (errCount, countResult) => {
    if (errCount) throw errCount;
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

  
    sql += " ORDER BY name ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);


    db.query(sql, params, (err, results) => {
      if (err) {
        console.error("Search/Filter error:", err);
        return res.status(500).send("Server error");
      }

  
      db.query("SELECT DISTINCT district FROM family_members ORDER BY district ASC", (err1, districtOptions) => {
        if (err1) throw err1;
        db.query("SELECT DISTINCT state FROM family_members ORDER BY state ASC", (err2, stateOptions) => {
          if (err2) throw err2;

      
          res.render("admin/search", {
            results,
            message:
              results.length === 0
                ? `No data found for "${input || "filters"}".`
                : null,
            districtOptions,
            stateOptions,
            selectedDistrict,
            selectedState,
            searchValue: input,
            currentPage: page,
            totalPages,
          });
        });
      });
    });
  });
};
