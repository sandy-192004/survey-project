import React from "https://esm.sh/react@18.3.1";
import ReactFamilyTree from "https://esm.sh/react-family-tree@3.2.0";
import calcTree from "https://esm.sh/relatives-tree@3.2.2";
import FamilyNode from "./FamilyNode.js";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const STEP_X = NODE_WIDTH / 2;
const STEP_Y = NODE_HEIGHT / 2;

function toGenderValue(gender) {
  const value = String(gender || "").toLowerCase();
  if (value === "male" || value === "m") return "male";
  if (value === "female" || value === "f") return "female";
  return "unknown";
}

function normalizeRelativesTree(nodes) {
  return (nodes || []).map((node) => ({
    id: Number(node.id),
    parents: Array.isArray(node.parents) ? node.parents.map(Number).filter(Boolean) : [],
    spouses: Array.isArray(node.spouses) ? node.spouses.map(Number).filter(Boolean) : [],
    children: Array.isArray(node.children) ? node.children.map(Number).filter(Boolean) : [],
    gender: toGenderValue(node.gender),
    name: node.name || "Unknown",
    image: node.image || null,
    relationship: node.relationship || "Family Member",
    father: node.father || null,
    mother: node.mother || null,
    siblings: Array.isArray(node.siblings) ? node.siblings.map(Number).filter(Boolean) : [],
    userId: node.userId || null
  }));
}

function connectorPath(parent, child) {
  const startX = parent.left * STEP_X + NODE_WIDTH / 2;
  const startY = parent.top * STEP_Y + NODE_HEIGHT;
  const endX = child.left * STEP_X + NODE_WIDTH / 2;
  const endY = child.top * STEP_Y;
  const bendY = (startY + endY) / 2;

  return `M ${startX} ${startY} C ${startX} ${bendY}, ${endX} ${bendY}, ${endX} ${endY}`;
}

export default function FamilyTree({ initialRootId }) {
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [rawNodes, setRawNodes] = React.useState([]);
  const [drawNodes, setDrawNodes] = React.useState([]);
  const [rootId, setRootId] = React.useState(Number(initialRootId));
  const [activeRoot, setActiveRoot] = React.useState(null);

  const nodeById = React.useMemo(() => {
    const map = new Map();
    for (const node of rawNodes) map.set(Number(node.id), node);
    return map;
  }, [rawNodes]);

  const loadTree = React.useCallback(async (personId) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/family-tree/${personId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load family tree");
      }

      const normalized = normalizeRelativesTree(data.relativesTree || data.relativesNodes || []);
      const calculatedTree = calcTree(normalized, { rootId: Number(data.rootId) });
      const calculated = Array.isArray(calculatedTree) ? calculatedTree : (calculatedTree?.nodes || []);

      setRawNodes(normalized);
      setDrawNodes(calculated || []);
      setRootId(Number(data.rootId));
      setActiveRoot(normalized.find((node) => Number(node.id) === Number(data.rootId)) || null);
    } catch (error) {
      setErrorMessage(error.message || "Unable to load family tree");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialRootId) loadTree(initialRootId);
  }, [initialRootId, loadTree]);

  const connectors = React.useMemo(() => {
    const byId = new Map(drawNodes.map((node) => [Number(node.id), node]));
    const paths = [];

    for (const node of drawNodes) {
      const current = byId.get(Number(node.id));
      if (!current || !Array.isArray(current.parents)) continue;

      for (const parentId of current.parents) {
        const parent = byId.get(Number(parentId));
        if (!parent) continue;

        paths.push({
          key: `${parent.id}-${current.id}`,
          d: connectorPath(parent, current)
        });
      }
    }

    return paths;
  }, [drawNodes]);

  const canvas = React.useMemo(() => {
    if (!drawNodes.length) return { width: 1600, height: 900 };

    const lefts = drawNodes.map((node) => node.left);
    const tops = drawNodes.map((node) => node.top);
    const maxLeft = Math.max(...lefts, 0);
    const maxTop = Math.max(...tops, 0);

    return {
      width: Math.max((maxLeft + 3) * STEP_X + NODE_WIDTH, 1600),
      height: Math.max((maxTop + 3) * STEP_Y + NODE_HEIGHT, 900)
    };
  }, [drawNodes]);

  const handleNodeClick = React.useCallback(
    (node) => {
      const currentRoot = activeRoot || nodeById.get(Number(rootId));
      const gender = String(node.gender || "").toLowerCase();
      const relation = String(node.relationship || "").toLowerCase();

      if (gender === "female" || gender === "f") {
        setErrorMessage("Navigation is disabled for female members.");
        return;
      }

      if (relation === "brother" || relation === "sibling") {
        const sameFather =
          currentRoot &&
          Number(currentRoot.father || 0) > 0 &&
          Number(node.father || 0) > 0 &&
          Number(currentRoot.father) === Number(node.father);

        if (!sameFather) {
          setErrorMessage("Cannot navigate: sibling verification failed (same father not found).");
          return;
        }
      }

      setErrorMessage("");
      loadTree(Number(node.id));
    },
    [activeRoot, loadTree, nodeById, rootId]
  );

  if (loading && drawNodes.length === 0) {
    return React.createElement(
      "div",
      { className: "h-[70vh] flex items-center justify-center text-stone-600" },
      "Loading family tree..."
    );
  }

  return React.createElement(
    "div",
    { className: "h-[72vh] w-full overflow-auto p-3 md:p-6" },
    errorMessage
      ? React.createElement(
          "div",
          { className: "mb-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800" },
          errorMessage
        )
      : null,
    loading
      ? React.createElement(
          "div",
          { className: "mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs md:text-sm text-amber-900" },
          "Refreshing tree..."
        )
      : null,
    React.createElement(
      "div",
      {
        className: "relative min-w-[1200px] md:min-w-[1500px]",
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
        connectors.map((line) =>
          React.createElement("path", {
            key: line.key,
            d: line.d,
            stroke: "#8f7b67",
            strokeWidth: 1.5,
            strokeOpacity: 0.65,
            strokeLinecap: "round"
          })
        )
      ),
      React.createElement(ReactFamilyTree, {
        nodes: drawNodes,
        rootId,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        renderNode: (node) => {
          const nodeStyle = {
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            transform: `translate(${node.left * STEP_X}px, ${node.top * STEP_Y}px)`
          };

          return (
          React.createElement(FamilyNode, {
            key: node.id,
            node,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            style: nodeStyle,
            onClick: handleNodeClick
          })
          );
        }
      })
    )
  );
}
