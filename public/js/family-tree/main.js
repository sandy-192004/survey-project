import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import FamilyTree from "./FamilyTree.js";

const mountNode = document.getElementById("family-tree-root");
const bootstrap = window.__FAMILY_TREE_BOOTSTRAP__ || {};

if (mountNode && bootstrap.rootPersonId) {
  const root = createRoot(mountNode);
  root.render(React.createElement(FamilyTree, { initialRootId: Number(bootstrap.rootPersonId) }));
} else if (mountNode) {
  mountNode.innerHTML =
    '<div class="h-[70vh] flex items-center justify-center text-stone-600">No family root found.</div>';
}
