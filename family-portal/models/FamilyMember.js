// const db = require("../config/db");

// exports.create = (data, callback) => {
//   db.query("INSERT INTO family_members SET ?", data, callback);
// };


// exports.getPaginated = (filters, page = 1, limit = 10, cb) => {
//   const offset = (page - 1) * limit;
//   let sql = `
//     SELECT p.*, GROUP_CONCAT(c.name SEPARATOR ', ') AS children
//     FROM family_members p
//     LEFT JOIN family_members c ON c.parent_id = p.id
//     WHERE p.parent_id IS NULL
//   `;
//   const params = [];

//   if (filters.name) {
//     sql += " AND p.name LIKE ?";
//     params.push(`%${filters.name}%`);
//   }

//   if (filters.mobile) {
//     sql += " AND p.mobile LIKE ?";
//     params.push(`%${filters.mobile}%`);
//   }

//   if (filters.district) {
//     sql += " AND p.district = ?";
//     params.push(filters.district);
//   }

//   sql += " GROUP BY p.id LIMIT ? OFFSET ?";
//   params.push(limit, offset);

//   db.query(sql, params, cb);
// };

// exports.getById = (id, cb) => {
//   db.query("SELECT * FROM family_members WHERE id = ?", [id], cb);
// };

// exports.update = (id, data, cb) => {
//   db.query("UPDATE family_members SET ? WHERE id = ?", [data, id], cb);
// };

// exports.delete = (id, cb) => {
//   db.query(
//     "DELETE FROM family_members WHERE id = ? OR parent_id = ?",
//     [id, id],
//     cb
//   );
// };

// exports.getFamilyWithChildren = (parentId, cb) => {
//   db.query(
//     `
//     SELECT * FROM family_members
//     WHERE id = ? OR parent_id = ?
//     ORDER BY parent_id IS NOT NULL
//     `,
//     [parentId, parentId],
//     cb
//   );
// };

// exports.deleteChildren = (parentId, cb) => {
//   db.query(
//     "DELETE FROM family_members WHERE parent_id = ?",
//     [parentId],
//     cb
//   );
// };
