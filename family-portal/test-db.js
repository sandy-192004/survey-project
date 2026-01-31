const db = require("./config/db");

async function testConnection() {
  try {
    console.log("Testing MySQL connection...");

    // Test basic connection
    const connection = await db.getConnection();
    console.log("✅ MySQL connection successful");

    // Test a simple query
    const [rows] = await connection.query("SELECT 1 as test");
    console.log("✅ Query execution successful:", rows);

    // Release connection
    connection.release();
    console.log("✅ Connection released successfully");

    // Test pool query
    const [result] = await db.query("SELECT VERSION() as version");
    console.log("✅ Pool query successful. MySQL version:", result[0].version);

    console.log("🎉 All database tests passed!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Database test failed:", error.message);
    process.exit(1);
  }
}

testConnection();
