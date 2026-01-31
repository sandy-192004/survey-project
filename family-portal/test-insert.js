const db = require("./config/db");

async function testInsert() {
  try {
    console.log("Testing data insertion...");

    // Test inserting a user
    const [userResult] = await db.query(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      ["test@example.com", "hashedpassword"]
    );
    console.log("✅ Inserted user with ID:", userResult.insertId);
    const userId = userResult.insertId;

    // Test inserting a family
    const [familyResult] = await db.query(
      "INSERT INTO families (family_code) VALUES (?)",
      ["TEST-FAM-001"]
    );
    console.log("✅ Inserted family with ID:", familyResult.insertId);
    const familyId = familyResult.insertId;

    // Test inserting a person
    const [personResult] = await db.query(
      "INSERT INTO persons (user_id, family_id, husband_name) VALUES (?, ?, ?)",
      [userId, familyId, "John Doe"]
    );
    console.log("✅ Inserted person with ID:", personResult.insertId);

    // Test inserting a family member
    const [memberResult] = await db.query(
      `INSERT INTO family_members
       (family_id, member_type, name, relationship, mobile, occupation,
        dob, gender, door_no, street, district, state, pincode, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        familyId,
        "parent",
        "John Doe",
        "husband",
        "1234567890",
        "Engineer",
        "1980-01-01",
        "Male",
        "123",
        "Main St",
        "District",
        "State",
        "123456",
        "uploads/parents/test.jpg"
      ]
    );
    console.log("✅ Inserted family member with ID:", memberResult.insertId);

    console.log("🎉 All insertions successful!");

  } catch (error) {
    console.error("❌ Insertion failed:", error.message);
    console.error("SQL Error:", error.sqlMessage);
    console.error("Stack:", error.stack);
  } finally {
    process.exit(0);
  }
}

testInsert();
