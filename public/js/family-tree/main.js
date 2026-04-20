const mountNode = document.getElementById("family-tree-root");
const bootstrap = window.__FAMILY_TREE_BOOTSTRAP__ || {};

function showMessage(html) {
	if (!mountNode) return;
	mountNode.innerHTML = html;
}

window.addEventListener("error", (event) => {
	const text = event?.error?.stack || event?.error?.message || event?.message || "Unknown browser error";
	showMessage(
		`<div class="m-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 whitespace-pre-wrap">Failed to load family tree script: ${text}</div>`
	);
});

window.addEventListener("unhandledrejection", (event) => {
	const reason = event?.reason?.stack || event?.reason?.message || String(event?.reason || "Unknown promise rejection");
	showMessage(
		`<div class="m-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 whitespace-pre-wrap">Failed to render family tree: ${reason}</div>`
	);
});

async function startFamilyTree() {
	if (!mountNode) return;

	if (!bootstrap.rootPersonId) {
		showMessage('<div class="h-[70vh] flex items-center justify-center text-stone-600">No family root found.</div>');
		return;
	}

	showMessage('<div class="h-[70vh] flex items-center justify-center text-stone-600">Loading family tree...</div>');

	try {
		const ReactModule = await import("https://esm.sh/react@18.3.1");
		const ReactDOMModule = await import("https://esm.sh/react-dom@18.3.1/client");
		const FamilyTreeModule = await import("./FamilyTree.js");

		const React = ReactModule.default;
		const { createRoot } = ReactDOMModule;
		const FamilyTree = FamilyTreeModule.default;

		const root = createRoot(mountNode);
		root.render(React.createElement(FamilyTree, { initialRootId: Number(bootstrap.rootPersonId) }));
	} catch (error) {
		showMessage(
			`<div class="m-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 whitespace-pre-wrap">Family tree initialization failed: ${error?.stack || error?.message || error}</div>`
		);
	}
}

startFamilyTree();
