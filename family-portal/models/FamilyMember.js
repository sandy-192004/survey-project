const db = require("../config/db");

/**
 * Create a family member (parent or child)
 */

exports.create = async (data) => {
  const sql = `INSERT INTO family_members
     (family_id, member_type, name, relationship, mobile, occupation,
      dob, gender, door_no, street, district, state, pincode, photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    data.family_id,
    data.member_type,
    data.name,
    data.relationship,
    data.mobile,
    data.occupation,
    data.dob,
    data.gender,
    data.door_no,
    data.street,
    data.district,
    data.state,
    data.pincode,
    data.photo
  ];
  await db.promise().query(sql, params);

exports.create = (memberData, callback) => {
  const sql = "INSERT INTO family_members SET ?";
  db.query(sql, memberData, callback);

};

/**
 * Update a family member by ID
 */
exports.update = (memberId, memberData, callback) => {
  const sql = "UPDATE family_members SET ? WHERE id = ?";
  db.query(sql, [memberData, memberId], callback);
};

/**
 * Delete a family member by ID
 */
exports.deleteById = (memberId, callback) => {
  const sql = "DELETE FROM family_members WHERE id = ?";
  db.query(sql, [memberId], callback);
};

/**
 * Get a single member by ID
 */
exports.getById = (memberId, callback) => {
  const sql = "SELECT * FROM family_members WHERE id = ?";
  db.query(sql, [memberId], callback);
};

/**
 * Get ALL members of ONE family
 * (husband + wife + all children)
 */
exports.getByFamilyId = async (familyId) => {
  const sql = `
    SELECT *
    FROM family_members
    WHERE family_id = ?
    ORDER BY
      FIELD(member_type, 'parent', 'child'),
      created_at
  `;
  const [rows] = await db.promise().query(sql, [familyId]);
  return [rows];
};

/**
 * Delete an entire family (all members)
 */
exports.deleteByFamilyId = (familyId, callback) => {
  const sql = "DELETE FROM family_members WHERE family_id = ?";
  db.query(sql, [familyId], callback);
};

/**
 * Get ALL families (admin view)
 */
exports.getAll = (callback) => {
  const sql = `
    SELECT *
    FROM family_members
    ORDER BY family_id, created_at
  `;
  db.query(sql, callback);
};
