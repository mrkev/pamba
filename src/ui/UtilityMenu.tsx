import { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { utility } from "./utility";

export function UtilityMenu({
  label,
  items,
  style,
}: {
  label: string;
  items: Record<string, () => void>;
  style?: React.CSSProperties;
}) {
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
    <div style={{ position: "relative", ...style }}>
      <button ref={buttonRef} className={utility.button}>
        {label}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "100%",
            background: "var(--control-bg-color)",
            width: 100,
            fontSize: 12,
            borderBottom: "1px solid #bababa",
            // borderLeft: "1px solid #bababa",
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
