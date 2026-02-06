const db = require("./config/db");

async function checkMembers() {
  try {
    // Get all family members
    const [members] = await db.query("SELECT id, member_type, name, photo FROM family_members");

    console.log(`Found ${members.length} family members:`);
    members.forEach(member => {
      console.log(`Member ${member.id}: ${member.name} (${member.member_type}) - Photo: ${member.photo || 'No photo'}`);
    });
  } catch (error) {
    console.error("Error checking members:", error);
  } finally {
    process.exit();
  }
}

checkMembers();
