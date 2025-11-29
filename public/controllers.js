  var nodeLibraryEntries = Object.values(blueprintByKind);
  var nodeLibraryGroups = [
    {
      title: "Workflow stages",
      subtitle: "Drag or click to add new stages",
      entries: nodeLibraryEntries.map((entry) => ({ type: "blueprint", blueprint: entry }))
    },
    {
      title: "Field / Symmetry nodes (the \u201Cenergy containers\u201D)",
      subtitle: "These create the basic circle/polygon + radial structure.",
      entries: symmetryNodeSpecs.map((spec) => ({ type: "spec", spec }))
    }
  ];
  var nodeTypes = {
    workflow: WorkflowNode
  };
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        NodeLibrary,
        {
          open: isLibraryOpen,
          groups: nodeLibraryGroups,
          onClose: () => setLibraryOpen(false),
          onAdd: handleAddFromLibrary
        }
      )
  function NodeLibrary({ open, groups, onClose, onAdd: onAdd2 }) {
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "node-library__list", children: groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "node-library__group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "node-library__group-hdr", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "node-library__group-title", children: group.title }),
            group.subtitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "node-library__group-subtitle", children: group.subtitle }) : null
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "node-library__items", children: group.entries.map((entry) => {
            if (entry.type === "blueprint") {
              const node = entry.blueprint;
              return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  className: "node-library__item",
                  draggable: true,
                  onDragStart: (event) => dragStart(event, node.kind),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "node-library__icon", style: { color: node.tint }, children: node.icon }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "node-library__meta", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "node-library__name", children: node.title }),
                      node.subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "node-library__hint", children: node.subtitle })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn btn--small", onClick: () => onAdd2(node.kind), children: "Add" })
                  ]
                },
                node.kind
              );
            }
            const { spec } = entry;
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "node-library__spec", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "node-library__spec-name", children: spec.name }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "node-library__spec-grid", children: [
                spec.inputs?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoList, { title: "Inputs", items: spec.inputs }) : null,
                spec.params?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoList, { title: "Params", items: spec.params }) : null,
                spec.outputs?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoList, { title: "Outputs", items: spec.outputs }) : null
              ] })
            ] }, spec.name);
          }) })
        ] }, group.title)) })
