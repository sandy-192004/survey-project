const db = require("../config/db");

exports.create = (childData, callback) => {
  const sql = "INSERT INTO children (family_id, child_name, occupation, photo) VALUES (?, ?, ?, ?)";
  const values = [childData.parent_id, childData.name, childData.occupation, childData.photo];
  db.query(sql, values, callback);
};

exports.deleteByParent = (parentId, callback) => {
  const sql = "DELETE FROM children WHERE parent_id = ?";
  db.query(sql, [parentId], callback);
};

exports.getByParent = (parentId, callback) => {
  const sql = "SELECT * FROM children WHERE parent_id = ?";
  db.query(sql, [parentId], callback);
};

exports.update = (childId, childData, callback) => {
  let sql = "UPDATE children SET child_name = ?, occupation = ? WHERE child_id = ?";
  let values = [childData.name, childData.occupation, childId];
  if (childData.photo !== undefined && childData.photo !== null) {
    sql = "UPDATE children SET child_name = ?, occupation = ?, photo = ? WHERE child_id = ?";
    values = [childData.name, childData.occupation, childData.photo, childId];
  }
  db.query(sql, values, callback);
};

exports.deleteById = (childId, callback) => {
  const sql = "DELETE FROM children WHERE child_id = ?";
  db.query(sql, [childId], callback);
};

