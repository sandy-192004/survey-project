const db = require("../config/db");

function normalizeRelation(value) {
  return String(value || "").trim().toLowerCase();
}

async function getFatherId(userId, personId) {
  const [rows] = await db.query(
    `SELECT related_person_id
     FROM relationships
     WHERE user_id = ?
       AND person_id = ?
       AND LOWER(relation) = 'father'
     LIMIT 1`,
    [userId, personId]
  );

  return rows.length ? Number(rows[0].related_person_id) : null;
}

async function resolvePersonAndUser(personId) {
  const [rows] = await db.query(
    `SELECT id, user_id, name, gender
     FROM persons
     WHERE id = ?
     LIMIT 1`,
    [personId]
  );

  if (!rows.length) return null;
  return rows[0];
}

exports.validateTreeNavigation = async (req, res) => {
  try {
    const currentRootId = Number(req.body.currentRootId);
    const clickedPersonId = Number(req.body.clickedPersonId);

    if (!Number.isFinite(currentRootId) || !Number.isFinite(clickedPersonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid navigation payload"
      });
    }

    const currentRoot = await resolvePersonAndUser(currentRootId);
    const clickedPerson = await resolvePersonAndUser(clickedPersonId);

    if (!currentRoot || !clickedPerson) {
      return res.status(404).json({
        success: false,
        message: "Selected person not found"
      });
    }

    if (String(clickedPerson.gender || "").toLowerCase() === "female") {
      return res.json({
        success: false,
        message: "Navigation is disabled for female members"
      });
    }

    const [relationRows] = await db.query(
      `SELECT relation
       FROM relationships
       WHERE user_id = ?
         AND person_id = ?
         AND related_person_id = ?
       LIMIT 1`,
      [currentRoot.user_id, currentRootId, clickedPersonId]
    );

    const relation = relationRows.length ? normalizeRelation(relationRows[0].relation) : "";

    if (relation === "brother" || relation === "sister" || relation === "sibling") {
      const currentFatherId = await getFatherId(currentRoot.user_id, currentRootId);
      const clickedFatherId = await getFatherId(currentRoot.user_id, clickedPersonId);

      if (!currentFatherId || !clickedFatherId || currentFatherId !== clickedFatherId) {
        return res.json({
          success: false,
          message: "Sibling navigation blocked because the same father could not be verified"
        });
      }
    }

    return res.json({
      success: true,
      navigatePersonId: clickedPersonId,
      message: "Navigation validated"
    });
  } catch (error) {
    console.error("validateTreeNavigation error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while searching for the family. Please try again."
    });
  }
};

/**
 * Find if clicked person (male) has their own family
 * Supports both GET (personId) and POST (personName) methods
 */
exports.findRelatedFamilyTree = async (req, res) => {
  try {
    let personId;
    let personName;
    let currentUserId;

    // Handle both GET and POST requests
    if (req.method === "GET") {
      personId = Number(req.query.personId);
      personName = String(req.query.personName || "").trim();
    } else {
      // POST request
      personName = String(req.body.personName || "").trim();
      const relationType = normalizeRelation(req.body.relationType);
      currentUserId = Number(req.body.currentUserId);
    }

    // If we have personId (GET request), use it directly
    if (personId && Number.isFinite(personId) && personId > 0) {
      console.log("[findRelatedFamilyTree] GET - personId:", personId);
      
      const [personRows] = await db.query(
        `SELECT id, user_id, name, gender
         FROM persons
         WHERE id = ?
         LIMIT 1`,
        [personId]
      );

      if (!Array.isArray(personRows) || personRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Person not found"
        });
      }

      const person = personRows[0];
      const personGender = String(person.gender || "").toLowerCase();

      if (personGender !== "male" && personGender !== "m") {
        return res.status(403).json({
          success: false,
          message: "Navigation is only available for male members"
        });
      }

      const personUserId = Number(person.user_id);

      if (!Number.isFinite(personUserId) || personUserId <= 0) {
        return res.status(404).json({
          success: false,
          message: `${person.name || "This person"} does not have their own family yet`
        });
      }

      const [familyCheckRows] = await db.query(
        `SELECT id FROM persons
         WHERE user_id = ?
         LIMIT 1`,
        [personUserId]
      );

      if (!Array.isArray(familyCheckRows) || familyCheckRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `${person.name || "This person"} does not have their own family yet`
        });
      }

      console.log("[findRelatedFamilyTree] GET SUCCESS - personUserId:", personUserId);
      return res.json({
        success: true,
        personUserId: personUserId,
        userId: personUserId,
        personName: person.name,
        message: `Redirecting to ${person.name}'s family tree`
      });
    }

    // POST request with personName
    if (!personName || !currentUserId || !Number.isFinite(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: "Missing parameters"
      });
    }

    console.log("[findRelatedFamilyTree] POST - personName:", personName, "currentUserId:", currentUserId);

    const [currentFamilyRows] = await db.query(
      `SELECT id, name
       FROM persons
       WHERE user_id = ?
       ORDER BY id ASC`,
      [currentUserId]
    );

    if (!currentFamilyRows.length) {
      return res.json({
        success: false,
        message: "Current family not found"
      });
    }

    const currentHead = currentFamilyRows[0];

    const [candidateHeads] = await db.query(
      `SELECT p.id, p.user_id, p.name
       FROM persons p
       WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(?))
         AND p.user_id <> ?
         AND p.id = (
           SELECT MIN(p2.id)
           FROM persons p2
           WHERE p2.user_id = p.user_id
         )
       ORDER BY p.id ASC`,
      [personName, currentUserId]
    );

    if (candidateHeads.length > 0) {
      const candidate = candidateHeads[0];
      console.log("[findRelatedFamilyTree] POST SUCCESS - userId:", candidate.user_id);
      return res.json({
        success: true,
        message: "Family found",
        userId: candidate.user_id,
        personName: candidate.name
      });
    }

    return res.json({
      success: false,
      message: "Matching related family was not found"
    });

  } catch (error) {
    console.error("[findRelatedFamilyTree] ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to find person's family"
    });
  }
};
