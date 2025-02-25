import { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { utility } from "./utility";

export function UtilityMenu({
  label,
  items,
  kind = "button",
  anchor = "tl",
  style,
}: {
  label: string;
  items: Record<string, () => void>;
  kind?: "button" | "none";
  anchor?: "tl" | "tr";
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
      e.stopPropagation();
    };

    const onMouseUp = (e: MouseEvent) => e.stopPropagation();

    elem.addEventListener("mousedown", onMouseDown, { capture: true });
    elem.addEventListener("mouseup", onMouseUp, { capture: true });
    elem.addEventListener("dblclick", onMouseUp, { capture: true });

    return () => {
      elem.removeEventListener("mousedown", onMouseDown, { capture: true });
      elem.removeEventListener("mouseup", onMouseUp, { capture: true });
      elem.removeEventListener("dblclick", onMouseUp, { capture: true });

      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, []);

  const anchorLeft = anchor.indexOf("l") > -1;

  return (
    <div style={{ position: "relative", ...style }}>
      <button
        ref={buttonRef}
        className={utility.button}
        style={
          kind === "none" ? { background: open ? "rgba(0,0,0,0.1)" : "none", padding: 0, height: "initial" } : undefined
        }
      >
        {label}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            left: anchorLeft ? 0 : undefined,
            right: anchorLeft ? undefined : 0,
            top: "100%",
            background: "var(--control-bg-color)",
            minWidth: 70,
            fontSize: 12,
            borderBottom: "1px solid var(--control-subtle-highlight)",
            zIndex: 10,
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
    whiteSpace: "nowrap",
    color: "var(--control-text-color)",
    "&:hover": {
      background: "#23272D",
      color: "white",
    },
  },
});
