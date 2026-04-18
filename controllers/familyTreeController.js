function normalizeRelation(value) {
  return String(value || "").trim().toLowerCase();
}

function relationPriority(kind) {
  const priority = {
    father: 1,
    mother: 1,
    spouse: 2,
    brother: 3,
    sister: 3,
    sibling: 3,
    child: 4,
    son: 4,
    daughter: 4
  };
  return priority[kind] || 99;
}

function relationLabel(kind) {
  const labels = {
    father: "Father",
    mother: "Mother",
    spouse: "Spouse",
    brother: "Brother",
    sister: "Sister",
    sibling: "Sibling",
    child: "Child",
    son: "Son",
    daughter: "Daughter"
  };
  return labels[kind] || "Family Member";
}

function isMale(gender) {
  const value = String(gender || "").trim().toLowerCase();
  return value === "male" || value === "m";
}

function isFemale(gender) {
  const value = String(gender || "").trim().toLowerCase();
  return value === "female" || value === "f";
}

function addUnique(list, value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return;
  if (!list.includes(id)) list.push(id);
}

function setRelationship(node, relationKind) {
  if (!node || !relationKind) return;
  const priority = relationPriority(relationKind);
  if (priority < node._relationPriority) {
    node._relationPriority = priority;
    node.relationship = relationLabel(relationKind);
  }
}

function scoreFamilyHead(persons, relationships) {
  if (!Array.isArray(persons) || persons.length === 0) return null;
  const score = new Map();

  for (const rel of relationships || []) {
    const relation = normalizeRelation(rel.relation);
    const sourceId = Number(rel.person_id);
    const targetId = Number(rel.related_person_id);
    if (!Number.isInteger(sourceId) || !Number.isInteger(targetId)) continue;

    if (relation === "father" || relation === "mother") {
      score.set(sourceId, (score.get(sourceId) || 0) + 3);
      score.set(targetId, (score.get(targetId) || 0) + 1);
      continue;
    }

    score.set(sourceId, (score.get(sourceId) || 0) + 2);
    score.set(targetId, (score.get(targetId) || 0) + 1);
  }

  if (score.size === 0) return persons[0];

  const byId = new Map(persons.map((person) => [Number(person.id), person]));
  const ranked = Array.from(score.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] - b[0];
  });

  return byId.get(ranked[0][0]) || persons[0];
}

function buildTreeData(persons, relationships, rootPersonId) {
  const personMap = new Map();

  for (const person of persons) {
    const personId = Number(person.id);
    if (!Number.isInteger(personId) || personId <= 0) continue;
    if (personMap.has(personId)) continue;

    personMap.set(personId, {
      id: personId,
      user_id: Number(person.user_id),
      name: person.name || "Unknown",
      gender: person.gender || "",
      image: person.image ? `/uploads/${person.image}` : null,
      father: null,
      mother: null,
      spouses: [],
      children: [],
      siblings: [],
      relationship: "Family Member",
      _relationPriority: 99
    });
  }

  for (const rel of relationships) {
    const sourceId = Number(rel.person_id);
    const targetId = Number(rel.related_person_id);
    const relation = normalizeRelation(rel.relation);

    if (!personMap.has(sourceId) || !personMap.has(targetId)) continue;

    const source = personMap.get(sourceId);
    const target = personMap.get(targetId);

    if (relation === "father") {
      source.father = targetId;
      addUnique(target.children, sourceId);
      continue;
    }

    if (relation === "mother") {
      source.mother = targetId;
      addUnique(target.children, sourceId);
      continue;
    }

    if (relation === "spouse") {
      addUnique(source.spouses, targetId);
      addUnique(target.spouses, sourceId);
      continue;
    }

    if (relation === "child" || relation === "son" || relation === "daughter") {
      addUnique(source.children, targetId);

      if (isMale(source.gender) && !target.father) target.father = sourceId;
      if (isFemale(source.gender) && !target.mother) target.mother = sourceId;
      continue;
    }

    if (relation === "brother" || relation === "sister" || relation === "sibling") {
      addUnique(source.siblings, targetId);
      addUnique(target.siblings, sourceId);
    }
  }

  const root = personMap.get(Number(rootPersonId));
  if (root) {
    root.relationship = "Self";
    root._relationPriority = 0;

    for (const rel of relationships) {
      const sourceId = Number(rel.person_id);
      const targetId = Number(rel.related_person_id);
      if (sourceId !== root.id || !personMap.has(targetId)) continue;

      const target = personMap.get(targetId);
      const relation = normalizeRelation(rel.relation);
      setRelationship(target, relation);
    }
  }

  for (const node of personMap.values()) {
    node.children = node.children.filter((childId) => childId !== node.father && childId !== node.mother);
    node.children = Array.from(new Set(node.children));
    node.spouses = Array.from(new Set(node.spouses));
    node.siblings = Array.from(new Set(node.siblings));

    delete node._relationPriority;
  }

  const nodes = Array.from(personMap.values());

  const relativesTree = nodes.map((node) => ({
    id: node.id,
    parents: [node.father, node.mother].filter(Boolean),
    spouses: node.spouses,
    children: node.children,
    name: node.name,
    gender: node.gender,
    image: node.image,
    relationship: node.relationship,
    userId: node.user_id,
    father: node.father,
    mother: node.mother,
    siblings: node.siblings
  }));

  return { nodes, relativesTree };
}

async function loadFamilyByRootPerson(rootPersonId) {
  const [rootRows] = await db.query(
    `SELECT id, user_id, name, gender, image
     FROM persons
     WHERE id = ?
     LIMIT 1`,
    [rootPersonId]
  );

  if (!Array.isArray(rootRows) || rootRows.length === 0) {
    return null;
  }

  const rootPerson = rootRows[0];
  const userId = Number(rootPerson.user_id);

  const [personsRaw] = await db.query(
    `SELECT id, user_id, name, gender, image
     FROM persons
     WHERE user_id = ?
     ORDER BY id ASC`,
    [userId]
  );

  const [relationshipsRaw] = await db.query(
    `SELECT person_id, related_person_id, relation
     FROM relationships
     WHERE user_id = ?
     ORDER BY person_id ASC, related_person_id ASC`,
    [userId]
  );

  const persons = Array.isArray(personsRaw) ? personsRaw : [];
  const relationships = Array.isArray(relationshipsRaw) ? relationshipsRaw : [];

  const { nodes, relativesTree } = buildTreeData(persons, relationships, Number(rootPerson.id));

  return {
    userId,
    rootId: Number(rootPerson.id),
    rootPerson,
    persons,
    relationships,
    nodes,
    relativesTree
  };
}

exports.renderFamilyTreePage = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).send("Invalid user id");
    }

    const [personsRaw] = await db.query(
      `SELECT id, user_id, name, gender, image
       FROM persons
       WHERE user_id = ?
       ORDER BY id ASC`,
      [userId]
    );

    const persons = Array.isArray(personsRaw) ? personsRaw : [];
    if (persons.length === 0) {
      return res.status(404).send("No family found for this user");
    }

    const [relationshipsRaw] = await db.query(
      `SELECT person_id, related_person_id, relation
       FROM relationships
       WHERE user_id = ?`,
      [userId]
    );

    const relationships = Array.isArray(relationshipsRaw) ? relationshipsRaw : [];
    const familyHead = scoreFamilyHead(persons, relationships) || persons[0];

    res.render("admin/family-tree-react", {
      pageTitle: "Our Family Tree",
      userId,
      rootPersonId: Number(familyHead.id)
    });
  } catch (error) {
    console.error("Failed to render family tree page:", error);
    res.status(500).send("Failed to load family tree page");
  }
};

exports.getFamilyTreeApi = async (req, res) => {
  try {
    const personId = Number(req.params.personId);

    if (!Number.isInteger(personId) || personId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid person id"
      });
    }

    const familyPayload = await loadFamilyByRootPerson(personId);

    if (!familyPayload) {
      return res.status(404).json({
        success: false,
        message: "Person not found"
      });
    }

    res.json({
      success: true,
      userId: familyPayload.userId,
      rootId: familyPayload.rootId,
      nodes: familyPayload.nodes,
      relativesTree: familyPayload.relativesTree,
      count: familyPayload.nodes.length
    });
  } catch (error) {
    console.error("Failed to fetch family tree:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch family tree"
    });
  }
};
const db = require("../config/db");

function normalizeRelation(value) {
  return String(value || "").trim().toLowerCase();
}

function imagePath(image) {
  return image ? `/uploads/${image}` : "/images/placeholder.png";
}

function pushUnique(list, value) {
  if (!Array.isArray(list)) return;
  if (!list.includes(value)) {
    list.push(value);
  }
}

function relationLabel(kind, gender) {
  const normalized = normalizeRelation(kind);
  if (normalized === "father") return "Father";
  if (normalized === "mother") return "Mother";
  if (normalized === "spouse") return "Spouse";
  if (normalized === "son") return "Son";
  if (normalized === "daughter") return "Daughter";
  if (normalized === "child") return "Child";
  if (normalized === "brother") return "Brother";
  if (normalized === "sister") return "Sister";
  if (normalized === "sibling") {
    return String(gender || "").toLowerCase() === "female" ? "Sister" : "Brother";
  }
  return "Family Member";
}

function findHeadPersonId(persons, relationships, preferredId) {
  const personIds = new Set((persons || []).map((person) => Number(person.id)));
  if (Number.isFinite(Number(preferredId)) && personIds.has(Number(preferredId))) {
    return Number(preferredId);
  }

  const score = new Map();
  const relationWeight = new Map([
    ["father", 4],
    ["mother", 4],
    ["spouse", 3],
    ["brother", 2],
    ["sister", 2],
    ["sibling", 2],
    ["child", 1],
    ["son", 1],
    ["daughter", 1]
  ]);

  (relationships || []).forEach((link) => {
    const sourceId = Number(link.person_id);
    const targetId = Number(link.related_person_id);
    const relation = normalizeRelation(link.relation);
    const weight = relationWeight.get(relation) || 1;

    if (!personIds.has(sourceId) || !personIds.has(targetId)) {
      return;
    }

    score.set(sourceId, (score.get(sourceId) || 0) + weight);
    score.set(targetId, (score.get(targetId) || 0) + 1);
  });

  if (score.size === 0 && persons.length > 0) {
    return Number(persons[0].id);
  }

  const ranked = Array.from(score.entries()).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0] - right[0];
  });

  return ranked.length ? ranked[0][0] : null;
}

function buildStructuredData(persons, relationships, rootId) {
  const nodeMap = new Map();

  (persons || []).forEach((person) => {
    const id = Number(person.id);
    nodeMap.set(id, {
      id,
      user_id: Number(person.user_id),
      name: person.name || "Unknown",
      gender: person.gender || "",
      image: imagePath(person.image),
      father: null,
      mother: null,
      spouses: [],
      children: [],
      relationship: id === Number(rootId) ? "Self" : "Family Member",
      _priority: 0
    });
  });

  (relationships || []).forEach((link) => {
    const sourceId = Number(link.person_id);
    const targetId = Number(link.related_person_id);
    const relation = normalizeRelation(link.relation);

    if (!nodeMap.has(sourceId) || !nodeMap.has(targetId) || sourceId === targetId) {
      return;
    }

    const source = nodeMap.get(sourceId);
    const target = nodeMap.get(targetId);

    if (relation === "father") {
      source.father = targetId;
      if (target._priority < 5) {
        target.relationship = "Father";
        target._priority = 5;
      }
      return;
    }

    if (relation === "mother") {
      source.mother = targetId;
      if (target._priority < 5) {
        target.relationship = "Mother";
        target._priority = 5;
      }
      return;
    }

    if (relation === "spouse") {
      pushUnique(source.spouses, targetId);
      pushUnique(target.spouses, sourceId);
      if (target._priority < 4) {
        target.relationship = "Spouse";
        target._priority = 4;
      }
      return;
    }

    if (relation === "brother" || relation === "sister" || relation === "sibling") {
      if (target._priority < 3) {
        target.relationship = relationLabel(relation, target.gender);
        target._priority = 3;
      }
      return;
    }

    if (relation === "child" || relation === "son" || relation === "daughter") {
      if (source.father !== targetId && source.mother !== targetId) {
        pushUnique(source.children, targetId);
      }

      const sourceGender = String(source.gender || "").toLowerCase();
      if (sourceGender === "male" && !target.father) {
        target.father = sourceId;
      }
      if (sourceGender === "female" && !target.mother) {
        target.mother = sourceId;
      }

      if (target._priority < 2) {
        target.relationship = relationLabel(relation, target.gender);
        target._priority = 2;
      }
    }
  });

  const nodes = Array.from(nodeMap.values()).map((node) => {
    const parentSet = new Set();
    if (node.father) parentSet.add(node.father);
    if (node.mother) parentSet.add(node.mother);

    return {
      id: node.id,
      user_id: node.user_id,
      name: node.name,
      gender: node.gender,
      image: node.image,
      father: node.father,
      mother: node.mother,
      spouses: Array.from(new Set(node.spouses)),
      children: node.children.filter((childId) => !parentSet.has(childId)),
      relationship: node.relationship
    };
  });

  const relativesNodes = nodes.map((node) => {
    const parents = [];
    if (node.father) parents.push(node.father);
    if (node.mother) parents.push(node.mother);

    return {
      id: node.id,
      parents: Array.from(new Set(parents)),
      spouses: Array.from(new Set(node.spouses)),
      children: Array.from(new Set(node.children))
    };
  });

  return {
    nodeMap,
    nodes,
    relativesNodes
  };
}

async function resolveUserAndRoot(personIdOrUserId) {
  const id = Number(personIdOrUserId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  const [exactPersonRows] = await db.query(
    `SELECT id, user_id
     FROM persons
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  if (exactPersonRows.length > 0) {
    return {
      userId: Number(exactPersonRows[0].user_id),
      preferredRootId: Number(exactPersonRows[0].id)
    };
  }

  const [familyRows] = await db.query(
    `SELECT id, user_id
     FROM persons
     WHERE user_id = ?
     ORDER BY id ASC
     LIMIT 1`,
    [id]
  );

  if (familyRows.length > 0) {
    return {
      userId: Number(familyRows[0].user_id),
      preferredRootId: Number(familyRows[0].id)
    };
  }

  return null;
}

async function getFamilyData(personIdOrUserId) {
  const resolved = await resolveUserAndRoot(personIdOrUserId);
  if (!resolved) return null;

  const [persons] = await db.query(
    `SELECT id, user_id, name, gender, image
     FROM persons
     WHERE user_id = ?
     ORDER BY id ASC`,
    [resolved.userId]
  );

  if (!persons.length) {
    return null;
  }

  const [relationships] = await db.query(
    `SELECT person_id, related_person_id, relation
     FROM relationships
     WHERE user_id = ?
     ORDER BY person_id ASC, related_person_id ASC`,
    [resolved.userId]
  );

  const rootId = findHeadPersonId(persons, relationships, resolved.preferredRootId);
  const structured = buildStructuredData(persons, relationships, rootId);
  const root = structured.nodeMap.get(Number(rootId)) || null;

  return {
    userId: resolved.userId,
    rootId: Number(rootId),
    root,
    nodes: structured.nodes,
    relativesNodes: structured.relativesNodes,
    relationships
  };
}

exports.renderFamilyTreePage = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).send("Invalid family id");
  }

  try {
    const data = await getFamilyData(userId);
    if (!data) {
      return res.status(404).send("Family not found");
    }

    return res.render("admin/family-tree-react", {
      pageTitle: "Our Family Tree",
      userId: data.userId,
      rootPersonId: data.rootId
    });
  } catch (error) {
    console.error("renderFamilyTreePage error:", error);
    return res.status(500).send("Failed to load family tree page");
  }
};

exports.getFamilyTreeApi = async (req, res) => {
  try {
    const data = await getFamilyData(req.params.personId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Family not found"
      });
    }

    return res.json({
      success: true,
      userId: data.userId,
      rootId: data.rootId,
      tree: data.root,
      nodes: data.nodes,
      relativesTree: data.relativesNodes,
      relativesNodes: data.relativesNodes,
      relationships: data.relationships,
      count: Array.isArray(data.nodes) ? data.nodes.length : 0
    });
  } catch (error) {
    console.error("getFamilyTreeApi error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load family tree"
    });
  }
};

exports.getFamilyTree = exports.renderFamilyTreePage;

exports._private = {
  normalizeRelation,
  findHeadPersonId,
  buildStructuredData,
  getFamilyData
};
