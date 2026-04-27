import React from "https://esm.sh/react@18.3.1";

const FALLBACK_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23efe7dc'/%3E%3Ccircle cx='60' cy='46' r='20' fill='%23c2a98b'/%3E%3Crect x='28' y='72' width='64' height='30' rx='15' fill='%23c2a98b'/%3E%3C/svg%3E";

export default function FamilyNode({ node, width, height, style, isClickable, onClick }) {
  const clickable = Boolean(isClickable);

  return React.createElement(
    "button",
    {
      type: "button",
      onClick: () => clickable && onClick(node),
      className:
        `group absolute rounded-xl p-3 shadow-md transition-transform duration-200 text-left ${clickable
          ? "border border-sky-400 bg-gradient-to-br from-sky-50 to-blue-50 hover:scale-[1.03] hover:shadow-lg cursor-pointer"
          : "border border-stone-300 bg-gradient-to-br from-stone-100 to-stone-200 opacity-80 cursor-not-allowed"}`,
      style: {
        ...(style || {}),
        width: `${width}px`,
        minHeight: `${height}px`
      },
      title: clickable ? "Click to navigate" : "Navigation disabled for female members"
    },
    React.createElement(
      "div",
      { className: "flex items-start gap-3" },
      React.createElement("img", {
        src: node.image || FALLBACK_AVATAR,
        alt: node.name || "Member",
        className: "h-14 w-14 rounded-full border-2 border-amber-300 object-cover bg-amber-50"
      }),
      React.createElement(
        "div",
        { className: "min-w-0" },
        React.createElement(
          "p",
          { className: "truncate font-semibold text-[15px] text-stone-900" },
          node.name || "Unknown"
        ),
        React.createElement(
          "p",
          { className: "text-xs text-stone-600 mt-1" },
          node.relationship || "Family Member"
        ),
        React.createElement(
          "span",
          {
            className:
              "inline-flex mt-2 rounded-full border border-amber-400/40 bg-amber-100/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-900"
          },
          clickable ? "clickable" : "disabled"
        )
      )
    )
  );
}
