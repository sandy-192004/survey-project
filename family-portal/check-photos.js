const db = require("./config/db");

async function checkPhotos() {
  try {
    // Get all family members with photos
    const [members] = await db.query("SELECT id, member_type, photo FROM family_members WHERE photo IS NOT NULL AND photo != ''");

    console.log(`Found ${members.length} members with photos:`);
    members.forEach(member => {
      console.log(`Member ${member.id} (${member.member_type}): ${member.photo}`);
    });
  } catch (error) {
    console.error("Error checking photos:", error);
  } finally {
    process.exit();
  }
}

checkPhotos();
