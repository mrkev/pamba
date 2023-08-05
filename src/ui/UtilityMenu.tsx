import { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { utility } from "./utility";

export function UtilityMenu({ label, items }: { label: string; items: Record<string, () => void> }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const styles = useStyles();

  useEffect(() => {
    const elem = buttonRef.current;
    if (elem == null) {
      return;
    }

    const onDocumentMouseDown = () => {
      setOpen(false);
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };

    const onMouseDown = (e: MouseEvent) => {
      console.log("CLICK");
      setOpen((prev) => !prev);
      setTimeout(() => document.addEventListener("mousedown", onDocumentMouseDown), 0);
      e.stopImmediatePropagation();
    };

    elem.addEventListener("mousedown", onMouseDown, { capture: true });
    return () => {
      elem.removeEventListener("mousedown", onMouseDown, { capture: true });
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button ref={buttonRef} className={utility.button}>
        {label}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "100%",
            background: "#D3D3D3",
            width: 100,
            fontSize: 12,
          }}
        >
          {Object.entries(items).map(([label, cb]) => (
            <div key={label} className={styles.menuItem} onMouseDown={cb}>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const useStyles = createUseStyles({
  menuItem: {
    cursor: "pointer",
    fontWeight: "bold",
    padding: "1px 6px",
    "&:hover": {
      background: "#23272D",
      color: "white",
    },
  },
});
