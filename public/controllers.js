      return () => {
        mounted = false;
      };
    }, []);
    (0, import_react7.useEffect)(() => {
      return () => dispose?.();
              onShiftSnap: (value) => snapRotationToSymmetry(value, params.flow.polygonSides, params.flow.radialMultiplier, 0, 90),
    format,
    onShiftSnap
    const [shiftPressed, setShiftPressed] = (0, import_react7.useState)(false);
    (0, import_react7.useEffect)(() => {
      if (!onShiftSnap) {
        return void 0;
      }
      const handleKeyDown = (event) => {
        if (event.key === "Shift") {
          setShiftPressed(true);
        }
      };
      const handleKeyUp = (event) => {
        if (event.key === "Shift") {
          setShiftPressed(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [!!onShiftSnap]);
    const handleChange = (event) => {
      const rawValue = parseFloat(event.target.value);
      const nextValue = onShiftSnap && shiftPressed ? onShiftSnap(rawValue) : rawValue;
      onChange(nextValue);
    };
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "range", value, min, max, step, onChange: handleChange })
  function snapRotationToSymmetry(value, sides, radialMultiplier, min, max) {
    const axisCount = Math.max(1, Math.round(sides * radialMultiplier));
    const increment = 360 / axisCount;
    const snapped = Math.round(value / increment) * increment;
    return clamp2(snapped, min, max);
  }
  function clamp2(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
