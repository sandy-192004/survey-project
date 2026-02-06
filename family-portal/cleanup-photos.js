const db = require("./config/db");
const fs = require("fs");
const path = require("path");

async function cleanupPhotos() {
  try {
    // Get all family members with photos
    const [members] = await db.query("SELECT id, member_type, photo FROM family_members WHERE photo IS NOT NULL AND photo != ''");

    console.log(`Checking ${members.length} members with photos...`);

    for (const member of members) {
      let photoPath = member.photo;

      // Remove size suffix if present
      const sizeMatch = photoPath.match(/^(.+)\(\d+\)$/);
      if (sizeMatch) {
        photoPath = sizeMatch[1];
      }

      // Remove 'uploads/' prefix to get relative path
      const relativePath = photoPath.replace(/^uploads\//, '');

      // Check if file exists
      const fullPath = path.join(__dirname, 'uploads', relativePath);
      const exists = fs.existsSync(fullPath);

      if (!exists) {
        console.log(`File not found for member ${member.id}: ${fullPath}`);
        // Clear the photo path in database
        await db.query("UPDATE family_members SET photo = NULL WHERE id = ?", [member.id]);
        console.log(`Cleared photo path for member ${member.id}`);
      } else {
        console.log(`File exists for member ${member.id}: ${relativePath}`);
      }
    }

    console.log("Photo cleanup completed");
  } catch (error) {
    console.error("Error cleaning up photos:", error);
  } finally {
    process.exit();
  }
}

cleanupPhotos();
