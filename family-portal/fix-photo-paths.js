const db = require("./config/db");

async function fixPhotoPaths() {
  try {
    // Get all family members with photos
    const [members] = await db.query("SELECT id, member_type, photo FROM family_members WHERE photo IS NOT NULL AND photo != ''");

    console.log(`Found ${members.length} members with photos`);

    for (const member of members) {
      let newPhoto = member.photo;

      // Remove size suffix if present (e.g., (12345))
      const sizeMatch = newPhoto.match(/^(.+)\(\d+\)$/);
      if (sizeMatch) {
        newPhoto = sizeMatch[1];
      }

      // Fix paths based on member_type
      if (member.member_type === 'parent') {
        if (newPhoto.startsWith('parents/')) {
          newPhoto = 'uploads/' + newPhoto;
        } else if (newPhoto.startsWith('uploads/') && !newPhoto.includes('/', 8)) {
          // uploads/hash -> uploads/parents/hash
          newPhoto = 'uploads/parents/' + newPhoto.substring(8);
        }
      } else if (member.member_type === 'child') {
        if (newPhoto.startsWith('children/')) {
          newPhoto = 'uploads/' + newPhoto;
        } else if (newPhoto.startsWith('uploads/') && !newPhoto.includes('/', 8)) {
          // uploads/hash -> uploads/children/hash
          newPhoto = 'uploads/children/' + newPhoto.substring(8);
        }
      }

      // Update if changed
      if (newPhoto !== member.photo) {
        await db.query("UPDATE family_members SET photo = ? WHERE id = ?", [newPhoto, member.id]);
        console.log(`Updated member ${member.id}: ${member.photo} -> ${newPhoto}`);
      }
    }

    console.log("Photo path fix completed");
  } catch (error) {
    console.error("Error fixing photo paths:", error);
  } finally {
    process.exit();
  }
}

fixPhotoPaths();
