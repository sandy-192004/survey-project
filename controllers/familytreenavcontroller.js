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

exports.findRelatedFamilyTree = async (req, res) => {
  try {
    const personName = String(req.body.personName || "").trim();
    const relationType = normalizeRelation(req.body.relationType);
    const currentUserId = Number(req.body.currentUserId);

    if (!personName || !relationType || !Number.isFinite(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: "Missing parameters"
      });
    }

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

    for (const candidate of candidateHeads) {
      if (relationType === "father" || relationType === "mother") {
        const [verificationRows] = await db.query(
          `SELECT child.id
           FROM relationships r
           JOIN persons child ON child.id = r.related_person_id
           WHERE r.user_id = ?
             AND r.person_id = ?
             AND LOWER(r.relation) IN ('son', 'daughter', 'child')
             AND LOWER(TRIM(child.name)) = LOWER(TRIM(?))
           LIMIT 1`,
          [candidate.user_id, candidate.id, currentHead.name]
        );

        if (!verificationRows.length) {
          continue;
        }
      }

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
    console.error("findRelatedFamilyTree error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while searching for the family. Please try again."
    });
  }
};
