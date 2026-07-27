import { useRef, useState } from "react";
import { cn } from "../utils/cn";

// Pixels the mouse must travel to move the value by one `step`.
const PIXELS_PER_STEP = 4;

/**
 * A number that looks like a utility button. Two ways to change it:
 * - Click and drag: up or right increases, down or left decreases.
 * - Double click: type a value and press Enter to commit (Escape cancels).
 *
 * It's a controlled component: changes are reported through `onChange`.
 */
export function UtilityNumber({
  value,
  onChange,
  decimals = 0,
  style,
  className,
  min,
  max,
  step,
}: {
  value: number;
  onChange?: (v: number) => void;
  decimals?: number;
  style?: React.CSSProperties;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  // While dragging or editing we freeze the control's width so that changing
  // digit counts (e.g. "9" -> "100") don't make it jump around. `null` lets it
  // size to its content again once the interaction ends.
  const [lockedWidth, setLockedWidth] = useState<number | null>(null);
  // When we programmatically leave edit mode (Enter/Escape) we don't want the
  // trailing blur to re-run commit logic.
  const skipBlur = useRef(false);

  const effectiveStep = step ?? Math.pow(10, -decimals);
  const display = value.toFixed(decimals);

  function clampRound(n: number): number {
    let v = n;
    if (min != null) {
      v = Math.max(min, v);
    }
    if (max != null) {
      v = Math.min(max, v);
    }
    // toFixed to avoid floating point drift accumulating across drag steps.
    return parseFloat(v.toFixed(decimals));
  }

  function beginEdit() {
    if (onChange == null) {
      return;
    }
    // Freeze the width to what the number occupied so the input doesn't balloon
    // to its default intrinsic size.
    setLockedWidth(divRef.current?.offsetWidth ?? null);
    setEditValue(display);
    setEditing(true);
  }

  function stopEditing() {
    setEditing(false);
    setLockedWidth(null);
  }

  function commit() {
    const parsed = parseFloat(editValue);
    if (!Number.isNaN(parsed)) {
      onChange?.(clampRound(parsed));
    }
    stopEditing();
  }

  function onMouseDown(e: React.MouseEvent) {
    // Only the primary button scrubs, and never while typing.
    if (editing || onChange == null || e.button !== 0) {
      return;
    }
    // Prevent text selection while dragging (double click to edit still fires).
    e.preventDefault();
    // Hold the width steady for the whole drag so the digit count changing
    // doesn't resize the control under the cursor.
    setLockedWidth(divRef.current?.offsetWidth ?? null);

    const startX = e.clientX;
    const startY = e.clientY;
    const startValue = value;

    const onMove = (me: MouseEvent) => {
      const deltaX = me.clientX - startX;
      const deltaY = me.clientY - startY;
      // Follow the dominant axis: right/up are positive, left/down negative.
      const raw = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : -deltaY;
      const stepsDelta = Math.round(raw / PIXELS_PER_STEP);
      onChange(clampRound(startValue + stepsDelta * effectiveStep));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.removeProperty("cursor");
      setLockedWidth(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "ns-resize";
  }

  return (
    <div
      ref={divRef}
      className={cn("utilityButton", "text-center px-1 py-0 select-none text-control-text-color", className)}
      style={{ cursor: editing ? "text" : "ns-resize", width: lockedWidth ?? undefined, ...style }}
      onMouseDown={onMouseDown}
      onDoubleClick={beginEdit}
    >
      {editing ? (
        <input
          autoFocus
          inputMode="decimal"
          className="w-full border-0 bg-transparent p-0 text-center font-bold text-control-text-color outline-none"
          style={{ fontSize: 12 }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            // Keep keystrokes from reaching the app's global command handlers.
            e.stopPropagation();
            if (e.key === "Enter") {
              skipBlur.current = true;
              commit();
            } else if (e.key === "Escape") {
              skipBlur.current = true;
              stopEditing();
            }
          }}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              stopEditing();
              return;
            }
            commit();
          }}
        />
      ) : (
        display
      )}
    </div>
  );
}
