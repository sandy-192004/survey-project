import React from "https://esm.sh/react@18.3.1";
import FamilyNode from "./FamilyNode.js";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 140;
const X_STEP = 300;
const Y_STEP = 190;

function isFemale(gender) {
  const value = String(gender || "").toLowerCase();
  return value === "female" || value === "f";
}

function relationWithGender(relationship, gender) {
  const rel = String(relationship || "").toLowerCase();
  const g = String(gender || "").toLowerCase();

  if (rel === "child") {
    if (g === "male" || g === "m") return "Son";
    if (g === "female" || g === "f") return "Daughter";
    return "Child";
  }

  if (rel === "sibling") {
    if (g === "female" || g === "f") return "Sister";
    if (g === "male" || g === "m") return "Brother";
    return "Sibling";
  }

  if (rel === "brother") return "Brother";
  if (rel === "sister") return "Sister";

  return relationship || "Family Member";
}

function normalizeNodes(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    id: Number(item.id),
    user_id: Number(item.user_id || item.userId || 0),
    name: item.name || "Unknown",
    gender: item.gender || "",
    image: item.image || null,
    relationship: relationWithGender(item.relationship, item.gender),
    father: item.father ? Number(item.father) : null,
    mother: item.mother ? Number(item.mother) : null,
    spouses: (item.spouses || []).map(Number).filter(Boolean),
    children: (item.children || []).map(Number).filter(Boolean)
  }));
}

function connectorPath(start, end) {
  const sx = start.x + NODE_WIDTH / 2;
  const sy = start.y + NODE_HEIGHT;
  const ex = end.x + NODE_WIDTH / 2;
  const ey = end.y;
  const by = (sy + ey) / 2;
  return `M ${sx} ${sy} C ${sx} ${by}, ${ex} ${by}, ${ex} ${ey}`;
}

function nodeCenterX(node) {
  return node.x + NODE_WIDTH / 2;
}

function nodeTopY(node) {
  return node.y;
}

function nodeBottomY(node) {
  return node.y + NODE_HEIGHT;
}

function siblingsOf(root, allNodes) {
  const rootId = Number(root?.id);
  if (!rootId) return [];

  return allNodes.filter((node) => {
    if (Number(node.id) === rootId) return false;
    const sameFather = root.father && node.father && Number(root.father) === Number(node.father);
    const sameMother = root.mother && node.mother && Number(root.mother) === Number(node.mother);
    const rel = String(node.relationship || "").toLowerCase();
    return sameFather || sameMother || rel === "brother" || rel === "sister" || rel === "sibling";
  });
}

function childrenByParent(allNodes) {
  const map = new Map();
  allNodes.forEach((node) => {
    const list = Array.isArray(node.children) ? node.children : [];
    map.set(Number(node.id), list.map(Number).filter(Boolean));
  });
  return map;
}

function mergeUniqueIds(first, second) {
  return Array.from(new Set([...(first || []), ...(second || [])].map(Number).filter(Boolean)));
}

function mergeNodes(baseNodes, extraNodes) {
  const merged = new Map((baseNodes || []).map((node) => [Number(node.id), { ...node }]));

  (extraNodes || []).forEach((node) => {
    const id = Number(node.id);
    if (!id) return;

    if (!merged.has(id)) {
      merged.set(id, { ...node });
      return;
    }

    const current = merged.get(id);
    merged.set(id, {
      ...current,
      ...node,
      father: current.father || node.father || null,
      mother: current.mother || node.mother || null,
      spouses: mergeUniqueIds(current.spouses, node.spouses),
      children: mergeUniqueIds(current.children, node.children)
    });
  });

  return Array.from(merged.values());
}

function mergeNodesWithStats(baseNodes, extraNodes) {
  const beforeIds = new Set((baseNodes || []).map((node) => Number(node.id)).filter(Boolean));
  const merged = mergeNodes(baseNodes, extraNodes);
  const afterIds = new Set((merged || []).map((node) => Number(node.id)).filter(Boolean));
  return {
    merged,
    addedCount: Math.max(afterIds.size - beforeIds.size, 0)
  };
}

function extractBranchData(anchorId, branchNodes, fallbackRootId) {
  const list = Array.isArray(branchNodes) ? branchNodes : [];
  const byId = new Map(list.map((node) => [Number(node.id), node]));

  const resolvedAnchorId = byId.has(Number(anchorId))
    ? Number(anchorId)
    : (Number(fallbackRootId) > 0 && byId.has(Number(fallbackRootId)) ? Number(fallbackRootId) : null);

  if (!resolvedAnchorId) return null;

  const anchor = byId.get(resolvedAnchorId);
  const fatherId = anchor?.father ? Number(anchor.father) : null;
  const motherId = anchor?.mother ? Number(anchor.mother) : null;

  const siblingIds = list
    .filter((node) => Number(node.id) !== resolvedAnchorId)
    .filter((node) => {
      const sameFather = fatherId && node.father && Number(node.father) === fatherId;
      const sameMother = motherId && node.mother && Number(node.mother) === motherId;
      const rel = String(node.relationship || "").toLowerCase();
      return sameFather || sameMother || rel === "brother" || rel === "sister" || rel === "sibling";
    })
    .map((node) => Number(node.id));

  return {
    anchorId: resolvedAnchorId,
    fatherId,
    motherId,
    siblingIds
  };
}

function calculateCustomLayout(allNodes, rootId, expandedBranches) {
  const root = allNodes.find((node) => Number(node.id) === Number(rootId));
  if (!root) return { positionedNodes: [], connectors: [], root: null };

  const byId = new Map(allNodes.map((node) => [Number(node.id), node]));
  const positions = new Map();
  const descendants = childrenByParent(allNodes);
  const connectors = [];

  const place = (id, x, y) => {
    if (!byId.has(Number(id))) return;
    if (!positions.has(Number(id))) {
      positions.set(Number(id), { x, y });
    }
  };

  place(root.id, 0, 0);

  const spouseId = (root.spouses || []).find((id) => byId.has(Number(id)));
  if (spouseId) {
    place(spouseId, -X_STEP, 0);
  }

  const siblings = siblingsOf(root, allNodes);
  let leftCount = 0;
  let rightCount = 0;
  siblings.forEach((sibling, idx) => {
    const putRight = idx % 2 === 0;
    if (putRight) {
      place(sibling.id, (rightCount + 1) * X_STEP, 0);
      rightCount += 1;
    } else {
      const offset = spouseId ? 2 : 1;
      place(sibling.id, -(leftCount + offset) * X_STEP, 0);
      leftCount += 1;
    }
  });

  if (root.father && byId.has(Number(root.father))) {
    place(root.father, -X_STEP * 0.6, -Y_STEP);
  }
  if (root.mother && byId.has(Number(root.mother))) {
    place(root.mother, X_STEP * 0.6, -Y_STEP);
  }

  const rootChildren = new Set((descendants.get(Number(root.id)) || []).filter((id) => byId.has(Number(id))));
  if (spouseId) {
    (descendants.get(Number(spouseId)) || []).forEach((id) => {
      if (byId.has(Number(id))) rootChildren.add(Number(id));
    });
  }

  let level = Array.from(rootChildren);
  let depth = 1;
  const seen = new Set([Number(root.id)]);
  if (spouseId) seen.add(Number(spouseId));

  while (level.length) {
    const uniqueLevel = Array.from(new Set(level)).filter((id) => !seen.has(Number(id)));
    const startX = -((uniqueLevel.length - 1) * X_STEP) / 2;

    uniqueLevel.forEach((personId, index) => {
      const nodeX = startX + index * X_STEP;
      const nodeY = depth * Y_STEP;
      place(personId, nodeX, nodeY);
      seen.add(Number(personId));
    });

    const nextLevel = [];
    uniqueLevel.forEach((parentId) => {
      (descendants.get(Number(parentId)) || []).forEach((childId) => {
        if (byId.has(Number(childId))) {
          nextLevel.push(Number(childId));
        }
      });
    });

    level = nextLevel;
    depth += 1;
  }

  Object.values(expandedBranches || {}).forEach((branch) => {
    if (!branch || !branch.anchorId) return;

    const anchorPos = positions.get(Number(branch.anchorId));
    if (!anchorPos) return;

    if (branch.fatherId && byId.has(Number(branch.fatherId))) {
      place(Number(branch.fatherId), anchorPos.x - X_STEP * 0.6, anchorPos.y - Y_STEP);
    }
    if (branch.motherId && byId.has(Number(branch.motherId))) {
      place(Number(branch.motherId), anchorPos.x + X_STEP * 0.6, anchorPos.y - Y_STEP);
    }

    let left = 0;
    let right = 0;
    (branch.siblingIds || []).forEach((siblingId, index) => {
      if (!byId.has(Number(siblingId))) return;

      if (index % 2 === 0) {
        right += 1;
        place(Number(siblingId), anchorPos.x + right * X_STEP, anchorPos.y);
      } else {
        left += 1;
        place(Number(siblingId), anchorPos.x - left * X_STEP, anchorPos.y);
      }
    });
  });

  const positionedNodes = Array.from(positions.entries()).map(([id, pos]) => ({
    ...byId.get(id),
    x: pos.x,
    y: pos.y
  }));

  const posById = new Map(positionedNodes.map((node) => [Number(node.id), node]));

  const fatherNode = root.father ? posById.get(Number(root.father)) : null;
  const motherNode = root.mother ? posById.get(Number(root.mother)) : null;
  const rootNode = posById.get(Number(root.id));
  const spouseNode = spouseId ? posById.get(Number(spouseId)) : null;
  const siblingNodes = siblings.map((s) => posById.get(Number(s.id))).filter(Boolean);
  const firstGenChildren = Array.from(rootChildren)
    .map((id) => posById.get(Number(id)))
    .filter(Boolean);

  if (fatherNode && motherNode) {
    const fy = nodeBottomY(fatherNode) + 10;
    connectors.push({
      key: `parents-couple-${fatherNode.id}-${motherNode.id}`,
      d: `M ${nodeCenterX(fatherNode)} ${fy} L ${nodeCenterX(motherNode)} ${fy}`
    });

    const parentMidX = (nodeCenterX(fatherNode) + nodeCenterX(motherNode)) / 2;
    const siblingRailY = rootNode.y - 40;
    const siblingTargets = [rootNode, ...siblingNodes];
    const minSiblingX = Math.min(...siblingTargets.map(nodeCenterX));
    const maxSiblingX = Math.max(...siblingTargets.map(nodeCenterX));

    connectors.push({
      key: `parents-down-${rootNode.id}`,
      d: `M ${parentMidX} ${fy} L ${parentMidX} ${siblingRailY}`
    });
    connectors.push({
      key: `parents-sibling-rail-${rootNode.id}`,
      d: `M ${minSiblingX} ${siblingRailY} L ${maxSiblingX} ${siblingRailY}`
    });

    siblingTargets.forEach((target) => {
      connectors.push({
        key: `parents-to-${target.id}`,
        d: `M ${nodeCenterX(target)} ${siblingRailY} L ${nodeCenterX(target)} ${nodeTopY(target)}`
      });
    });
  } else if (fatherNode || motherNode) {
    const parentNode = fatherNode || motherNode;
    connectors.push({ key: `single-parent-${parentNode.id}-${rootNode.id}`, d: connectorPath(parentNode, rootNode) });
  }

  const drawnSpouseLines = new Set();

  if (spouseNode && rootNode) {
    const y = rootNode.y + NODE_HEIGHT / 2;
    const minX = Math.min(nodeCenterX(spouseNode), nodeCenterX(rootNode));
    const maxX = Math.max(nodeCenterX(spouseNode), nodeCenterX(rootNode));
    drawnSpouseLines.add([Number(rootNode.id), Number(spouseNode.id)].sort((a, b) => a - b).join("-"));
    connectors.push({
      key: `self-spouse-${rootNode.id}-${spouseNode.id}`,
      d: `M ${minX} ${y} L ${maxX} ${y}`
    });
  }

  if (firstGenChildren.length) {
    const coupleCenterX = spouseNode
      ? (nodeCenterX(rootNode) + nodeCenterX(spouseNode)) / 2
      : nodeCenterX(rootNode);
    const coupleAnchorY = spouseNode
      ? Math.max(nodeBottomY(rootNode), nodeBottomY(spouseNode))
      : nodeBottomY(rootNode);
    const topChildY = Math.min(...firstGenChildren.map(nodeTopY));
    const childRailY = topChildY - 40;
    const minChildX = Math.min(...firstGenChildren.map(nodeCenterX));
    const maxChildX = Math.max(...firstGenChildren.map(nodeCenterX));

    connectors.push({
      key: `couple-down-${rootNode.id}`,
      d: `M ${coupleCenterX} ${coupleAnchorY} L ${coupleCenterX} ${childRailY}`
    });
    connectors.push({
      key: `couple-child-rail-${rootNode.id}`,
      d: `M ${minChildX} ${childRailY} L ${maxChildX} ${childRailY}`
    });

    firstGenChildren.forEach((child) => {
      connectors.push({
        key: `rail-to-child-${child.id}`,
        d: `M ${nodeCenterX(child)} ${childRailY} L ${nodeCenterX(child)} ${nodeTopY(child)}`
      });
    });
  }

  const drawnCoupleChildren = new Set();

  positionedNodes.forEach((parent) => {
    const spouseIds = (parent.spouses || []).map(Number).filter(Boolean);
    spouseIds.forEach((spouseId) => {
      const spouse = posById.get(Number(spouseId));
      if (!spouse) return;

      const coupleKey = [Number(parent.id), Number(spouse.id)].sort((a, b) => a - b).join("-");

      if (!drawnSpouseLines.has(coupleKey) && Math.abs(parent.y - spouse.y) < Y_STEP) {
        const lineY = Math.min(parent.y, spouse.y) + NODE_HEIGHT / 2;
        connectors.push({
          key: `couple-line-${coupleKey}`,
          d: `M ${Math.min(nodeCenterX(parent), nodeCenterX(spouse))} ${lineY} L ${Math.max(nodeCenterX(parent), nodeCenterX(spouse))} ${lineY}`
        });
        drawnSpouseLines.add(coupleKey);
      }

      const parentChildren = new Set((descendants.get(Number(parent.id)) || []).map(Number).filter(Boolean));
      const spouseChildren = new Set((descendants.get(Number(spouse.id)) || []).map(Number).filter(Boolean));
      const sharedChildIds = Array.from(parentChildren).filter((id) => spouseChildren.has(id));
      const sharedChildren = sharedChildIds
        .map((id) => posById.get(Number(id)))
        .filter(Boolean)
        .filter((child) => child.y > Math.max(parent.y, spouse.y));

      if (!sharedChildren.length) return;

      const childKey = `${coupleKey}|${sharedChildren.map((child) => child.id).sort((a, b) => a - b).join(",")}`;
      if (drawnCoupleChildren.has(childKey)) return;
      drawnCoupleChildren.add(childKey);

      const coupleCenterX = (nodeCenterX(parent) + nodeCenterX(spouse)) / 2;
      const coupleAnchorY = Math.max(nodeBottomY(parent), nodeBottomY(spouse));
      const childRailY = Math.min(...sharedChildren.map((child) => nodeTopY(child))) - 40;
      const minChildX = Math.min(...sharedChildren.map((child) => nodeCenterX(child)));
      const maxChildX = Math.max(...sharedChildren.map((child) => nodeCenterX(child)));

      connectors.push({
        key: `couple-shared-down-${childKey}`,
        d: `M ${coupleCenterX} ${coupleAnchorY} L ${coupleCenterX} ${childRailY}`
      });
      connectors.push({
        key: `couple-shared-rail-${childKey}`,
        d: `M ${minChildX} ${childRailY} L ${maxChildX} ${childRailY}`
      });
      sharedChildren.forEach((child) => {
        connectors.push({
          key: `couple-shared-to-${childKey}-${child.id}`,
          d: `M ${nodeCenterX(child)} ${childRailY} L ${nodeCenterX(child)} ${nodeTopY(child)}`
        });
      });
    });
  });

  positionedNodes.forEach((parent) => {
    const childIds = (descendants.get(Number(parent.id)) || []).map(Number).filter(Boolean);
    childIds.forEach((childId) => {
      const child = posById.get(childId);
      if (!child) return;

      const isFirstGenChild = firstGenChildren.some((node) => Number(node.id) === Number(child.id));
      const parentIsRootOrSpouse = Number(parent.id) === Number(root.id) || (spouseId && Number(parent.id) === Number(spouseId));
      if (isFirstGenChild && parentIsRootOrSpouse) return;

      const spouseIds = (parent.spouses || []).map(Number).filter(Boolean);
      const isSharedCoupleChild = spouseIds.some((sid) => {
        const spouseKids = (descendants.get(Number(sid)) || []).map(Number);
        return spouseKids.includes(Number(child.id));
      });
      if (isSharedCoupleChild) return;

      if (child.y > parent.y) {
        connectors.push({ key: `gen-${parent.id}-${child.id}`, d: connectorPath(parent, child) });
      }
    });
  });

  Object.values(expandedBranches || {}).forEach((branch) => {
    if (!branch || !branch.anchorId) return;

    const anchor = posById.get(Number(branch.anchorId));
    if (!anchor) return;

    const father = branch.fatherId ? posById.get(Number(branch.fatherId)) : null;
    const mother = branch.motherId ? posById.get(Number(branch.motherId)) : null;
    const branchSiblings = (branch.siblingIds || []).map((id) => posById.get(Number(id))).filter(Boolean);

    if (father && mother) {
      const fy = nodeBottomY(father) + 10;
      connectors.push({
        key: `branch-parents-couple-${anchor.id}`,
        d: `M ${nodeCenterX(father)} ${fy} L ${nodeCenterX(mother)} ${fy}`
      });

      const midX = (nodeCenterX(father) + nodeCenterX(mother)) / 2;
      const railY = anchor.y - 40;
      const targets = [anchor, ...branchSiblings];
      const minX = Math.min(...targets.map(nodeCenterX));
      const maxX = Math.max(...targets.map(nodeCenterX));

      connectors.push({ key: `branch-down-${anchor.id}`, d: `M ${midX} ${fy} L ${midX} ${railY}` });
      connectors.push({ key: `branch-rail-${anchor.id}`, d: `M ${minX} ${railY} L ${maxX} ${railY}` });

      targets.forEach((target) => {
        connectors.push({
          key: `branch-to-${anchor.id}-${target.id}`,
          d: `M ${nodeCenterX(target)} ${railY} L ${nodeCenterX(target)} ${nodeTopY(target)}`
        });
      });
    } else if (father || mother) {
      const parent = father || mother;
      connectors.push({ key: `branch-single-${anchor.id}-${parent.id}`, d: connectorPath(parent, anchor) });
    }
  });

  return {
    root,
    positionedNodes,
    connectors
  };
}

export default function FamilyTree({ initialRootId }) {
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [infoMessage, setInfoMessage] = React.useState("");
  const [allNodes, setAllNodes] = React.useState([]);
  const [expandedBranches, setExpandedBranches] = React.useState({});
  const [rootId, setRootId] = React.useState(Number(initialRootId));
  const [familyUserId, setFamilyUserId] = React.useState(Number(window.__FAMILY_TREE_BOOTSTRAP__?.userId || 0));

  const nodeById = React.useMemo(() => new Map(allNodes.map((node) => [Number(node.id), node])), [allNodes]);

  const loadTree = React.useCallback(async (personId) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/family-tree/${personId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load family tree");
      }

      const normalized = normalizeNodes(data.nodes || []);
      setAllNodes(normalized);
      setExpandedBranches({});
      setRootId(Number(data.rootId));
      setFamilyUserId(Number(data.userId || 0));
    } catch (error) {
      setErrorMessage(error.message || "Unable to load family tree");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTreeData = React.useCallback(async (personId) => {
    const response = await fetch(`/api/family-tree/${personId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load family tree");
    }

    return {
      nodes: normalizeNodes(data.nodes || []),
      userId: Number(data.userId || 0),
      rootId: Number(data.rootId || personId)
    };
  }, []);

  const fetchTreeDataByUser = React.useCallback(async (userId) => {
    const response = await fetch(`/api/family-tree-user/${userId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load family tree");
    }

    return {
      nodes: normalizeNodes(data.nodes || []),
      userId: Number(data.userId || userId),
      rootId: Number(data.rootId || 0)
    };
  }, []);

  React.useEffect(() => {
    if (initialRootId) {
      loadTree(initialRootId);
    }
  }, [initialRootId, loadTree]);

  const layout = React.useMemo(() => calculateCustomLayout(allNodes, rootId, expandedBranches), [allNodes, rootId, expandedBranches]);

  const canvas = React.useMemo(() => {
    if (!layout.positionedNodes.length) return { width: 1600, height: 1000, offsetX: 700, offsetY: 120 };

    const xs = layout.positionedNodes.map((node) => node.x);
    const ys = layout.positionedNodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = Math.max(maxX - minX + NODE_WIDTH + 400, 1600);
    const height = Math.max(maxY - minY + NODE_HEIGHT + 300, 1000);

    return {
      width,
      height,
      offsetX: Math.abs(minX) + 160,
      offsetY: Math.abs(minY) + 80
    };
  }, [layout.positionedNodes]);

  const navigateToRelatedFamily = React.useCallback(async (node) => {
    const relationType = String(node.relationship || "").toLowerCase();

    try {
      const response = await fetch("/admin/family-tree/navigate/find-related", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personName: node.name,
          relationType,
          currentUserId: familyUserId
        })
      });

      const data = await response.json();
      if (data && data.success && Number(data.userId) > 0) {
        return { userId: Number(data.userId), message: data.message || "" };
      }
      return {
        userId: null,
        message: (data && data.message) || `No tree found for ${node.name || "this member"}.`
      };
    } catch {
      return {
        userId: null,
        message: `No tree found for ${node.name || "this member"}.`
      };
    }
  }, [familyUserId]);

  const handleNodeClick = React.useCallback(async (node) => {
    const selected = nodeById.get(Number(node.id));
    if (!selected) return;

    if (isFemale(selected.gender)) {
      setErrorMessage("Navigation is disabled for female members.");
      return;
    }

    const relation = String(selected.relationship || "").toLowerCase();
    const currentRoot = nodeById.get(Number(rootId));

    if (relation === "brother" || relation === "sister" || relation === "sibling") {
      const validSibling =
        currentRoot &&
        Number(currentRoot.father || 0) > 0 &&
        Number(selected.father || 0) > 0 &&
        Number(currentRoot.father) === Number(selected.father);

      if (!validSibling) {
        setErrorMessage("Brother/Sibling navigation blocked: same father could not be verified.");
        return;
      }
    }

    setErrorMessage("");

    setInfoMessage("Checking related family...");

    const navigation = await navigateToRelatedFamily(selected);
    if (navigation && navigation.userId && Number(navigation.userId) > 0) {
      // Redirect to the target person's family tree
      console.log(`Redirecting to family tree of user ${navigation.userId}`);
      window.location.href = `/family-tree/${navigation.userId}`;
      return;
    }

    setInfoMessage("");
    setErrorMessage((navigation && navigation.message) || `No tree found for ${selected.name}.`);
  }, [fetchTreeData, fetchTreeDataByUser, navigateToRelatedFamily, nodeById, rootId]);

  if (loading && allNodes.length === 0) {
    return React.createElement(
      "div",
      { className: "h-[70vh] flex items-center justify-center text-stone-600" },
      "Loading family tree..."
    );
  }

  if (!loading && allNodes.length === 0) {
    return React.createElement(
      "div",
      { className: "h-[70vh] flex items-center justify-center" },
      React.createElement(
        "div",
        { className: "rounded-lg border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900" },
        "No family data available for this selection."
      )
    );
  }

  return React.createElement(
    "div",
    { className: "h-[74vh] w-full overflow-auto p-3 md:p-6" },
    errorMessage
      ? React.createElement(
          "div",
          { className: "mb-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800" },
          errorMessage
        )
      : null,
    infoMessage
      ? React.createElement(
          "div",
          { className: "mb-3 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-800" },
          infoMessage
        )
      : null,
    React.createElement(
      "div",
      {
        className: "relative min-w-[1200px]",
        style: { width: `${canvas.width}px`, height: `${canvas.height}px` }
      },
      React.createElement(
        "svg",
        {
          className: "absolute inset-0 pointer-events-none",
          width: canvas.width,
          height: canvas.height,
          viewBox: `0 0 ${canvas.width} ${canvas.height}`,
          fill: "none"
        },
        layout.connectors.map((line) => {
          return React.createElement("path", {
            key: line.key,
            d: line.d,
            transform: `translate(${canvas.offsetX}, ${canvas.offsetY})`,
            stroke: "#8f7b67",
            strokeWidth: 1.4,
            strokeOpacity: 0.6,
            strokeLinecap: "round"
          });
        })
      ),
      layout.positionedNodes.map((node) => {
        const clickable = !isFemale(node.gender);
        return React.createElement(FamilyNode, {
          key: node.id,
          node,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          style: {
            position: "absolute",
            transform: `translate(${node.x + canvas.offsetX}px, ${node.y + canvas.offsetY}px)`
          },
          isClickable: clickable,
          onClick: handleNodeClick
        });
      })
    )
  );
}
