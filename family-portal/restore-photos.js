const db = require("./config/db");
const fs = require("fs");
const path = require("path");

async function restorePhotos() {
  try {
    // Get all family members
    const [members] = await db.query("SELECT id, member_type, name FROM family_members");

    // Get list of available photo files
    const parentsDir = path.join(__dirname, 'uploads', 'parents');
    const childrenDir = path.join(__dirname, 'uploads', 'children');

    let parentPhotos = [];
    let childPhotos = [];

    if (fs.existsSync(parentsDir)) {
      parentPhotos = fs.readdirSync(parentsDir).filter(file => file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'));
    }

    if (fs.existsSync(childrenDir)) {
      childPhotos = fs.readdirSync(childrenDir).filter(file => file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'));
    }

    console.log(`Found ${parentPhotos.length} parent photos and ${childPhotos.length} child photos`);

    let parentIndex = 0;
    let childIndex = 0;

    for (const member of members) {
      let photoPath = null;

      if (member.member_type === 'parent' && parentPhotos.length > 0) {
        photoPath = `uploads/parents/${parentPhotos[parentIndex % parentPhotos.length]}`;
        parentIndex++;
      } else if (member.member_type === 'child' && childPhotos.length > 0) {
        photoPath = `uploads/children/${childPhotos[childIndex % childPhotos.length]}`;
        childIndex++;
      }

      if (photoPath) {
        await db.query("UPDATE family_members SET photo = ? WHERE id = ?", [photoPath, member.id]);
        console.log(`Restored photo for member ${member.id} (${member.name}): ${photoPath}`);
      }
    }

    console.log("Photo restoration completed");
  } catch (error) {
    console.error("Error restoring photos:", error);
  } finally {
    process.exit();
  }
}

restorePhotos();
