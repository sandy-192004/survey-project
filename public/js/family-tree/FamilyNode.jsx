import React from "https://esm.sh/react@18.3.1";

const FALLBACK_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23efe7dc'/%3E%3Ccircle cx='60' cy='46' r='20' fill='%23c2a98b'/%3E%3Crect x='28' y='72' width='64' height='30' rx='15' fill='%23c2a98b'/%3E%3C/svg%3E";

export default function FamilyNode({ node, width, height, onClick }) {
  const isFemale = String(node.gender || "").toLowerCase() === "female";
  const isClickable = !isFemale;

  const handleClick = () => {
    if (isClickable) {
      onClick(node);
    }
  };

  return React.createElement(
    "button",
    {
      type: "button",
      onClick: handleClick,
      disabled: !isClickable,
      className: isClickable
        ? "group absolute rounded-xl border border-amber-900/20 bg-gradient-to-br from-[#fffaf3] to-[#f3ede4] p-3 shadow-md transition-transform duration-200 hover:scale-[1.03] hover:shadow-lg hover:border-amber-900/40 text-left cursor-pointer"
        : "group absolute rounded-xl border border-amber-900/10 bg-gradient-to-br from-[#faf7f2] to-[#f0e8e0] p-3 shadow-sm text-left cursor-not-allowed opacity-75",
      style: {
        width: `${width}px`,
        minHeight: `${height}px`
      },
      title: isFemale 
        ? "Navigation disabled for female members" 
        : "Click to navigate to this person's family tree"
    },
    React.createElement(
      "div",
      { className: "flex items-start gap-3" },
      React.createElement("img", {
        src: node.image || FALLBACK_AVATAR,
        alt: node.name || "Member",
        className: isFemale
          ? "h-14 w-14 rounded-full border-2 border-amber-200 object-cover bg-amber-50 opacity-80"
          : "h-14 w-14 rounded-full border-2 border-amber-300 object-cover bg-amber-50"
      }),
      React.createElement(
        "div",
        { className: "min-w-0" },
        React.createElement(
          "p",
          {
            className: isFemale
              ? "truncate font-semibold text-[15px] text-stone-600"
              : "truncate font-semibold text-[15px] text-stone-900"
          },
          node.name || "Unknown"
        ),
        React.createElement(
          "p",
          { className: "text-xs text-stone-500 mt-1" },
          node.relationship || "Family Member"
        ),
        React.createElement(
          "span",
          {
            className: isClickable
              ? "inline-flex mt-2 rounded-full border border-blue-400/40 bg-blue-100/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-blue-900 font-medium"
              : "inline-flex mt-2 rounded-full border border-amber-400/30 bg-amber-100/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 font-medium"
          },
          isClickable ? "clickable" : "view only"
        )
      )
    )
  );
}
