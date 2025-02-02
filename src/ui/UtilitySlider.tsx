import { useRef, useState, useEffect, useCallback, useId } from "react";
import { useEventListener } from "./useEventListener";
import { countDecimals } from "../utils/math";
import { createUseStyles } from "react-jss";

// TODO: exponential for better decibel granularity (ableton is from -70db = Inf, to 6db)
//       maybe just a straight-up decibel "unit" mode
// TODO: make it smooth
// TODO: keyboard input

export function UtilityNumberSlider({
  min,
  max,
  value,
  onChange,
  formatValue,
  vertical,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
  vertical?: boolean;
}): React.ReactElement {
  const ref = useRef<HTMLInputElement | null>(null);
  const [_typingValue, setTypingValue] = useState<string | null>(null);

  useEffect(() => {
    const elem = ref.current;
    if (!elem) {
      return;
    }

    const downState = {
      clientX: [0, 0],
      value: value,
    };

    const onMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const [origX, origY] = downState.clientX;
      const deltaX = clientX - origX;
      const deltaY = origY - clientY; // y-axis grows down, so we invert these
      const preferX = Math.abs(deltaX) > Math.abs(deltaY);
      const delta = preferX ? deltaX : deltaY;

      const origSliderX = ((downState.value - min) / (max - min)) * elem.offsetWidth;
      const newSliderX = origSliderX + delta;
      let newSliderVal = (newSliderX / elem.offsetWidth) * (max - min) + min;
      // console.log(origSliderX, delta);
      if (newSliderVal < min) {
        downState.value = min;
        downState.clientX = [e.clientX, e.clientY];
        newSliderVal = min;
      }

      if (newSliderVal > max) {
        downState.value = max;
        downState.clientX = [e.clientX, e.clientY];
        newSliderVal = max;
      }

      onChange(newSliderVal);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.document.body.style.removeProperty("cursor");
    };

    const onMouseDown = (e: MouseEvent) => {
      // console.log(e);
      e.stopPropagation();
      e.preventDefault();
      elem.focus();

      downState.clientX = [e.clientX, e.clientY];
      downState.value = value;
      // Start the slide by adding window events
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      console.log("isSliding");
    };

    elem.addEventListener("mousedown", onMouseDown);

    return () => {
      elem.removeEventListener("mousedown", onMouseDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max, min, onChange]);

  useEffect(() => {
    const elem = ref.current;
    if (!elem) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Enter") {
        // todo
      }

      if (/Digit[0-9]/.test(e.code) || e.code === "Period") {
        setTypingValue((val) => {
          console.log("entering value", (val ?? "") + e.key);

          return (val ?? "") + e.key;
        });
        e.stopPropagation();
        e.preventDefault();
      }
    };

    const onFocus = () => {
      elem.addEventListener("keydown", onKeyDown);
    };

    const onBlur = () => {
      elem.removeEventListener("keydown", onKeyDown);
    };

    elem.addEventListener("focus", onFocus);
    elem.addEventListener("blur", onBlur);
    return () => {
      elem.removeEventListener("focus", onFocus);
      elem.removeEventListener("blur", onBlur);
    };
  }, []);

  useEventListener(
    "click",
    ref,
    useCallback((e) => e.stopPropagation(), []),
  );

  return (
    <div
      style={{
        position: "relative",
        textAlign: "center",
        height: 18,
        flexGrow: 1,
      }}
    >
      <input
        ref={ref}
        style={{
          width: "100%",
          margin: 0,
          padding: 0,
          // position: "absolute",
          // left: 0,
          height: "100%",
          writingMode: vertical ? "vertical-lr" : undefined,
          direction: vertical ? "rtl" : undefined,
        }}
        className={"utilitySlider"}
        type="range"
        max={max}
        min={min}
        step="any"
        value={value}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          onChange(val);
        }}
      />
      <span
        style={{
          position: "absolute",
          // textAlign: "center",
          // verticalAlign: "middle",
          // position: "absolute",
          color: "var(--control-text-color)",
          left: 0,
          top: 1,
          pointerEvents: "none",
          width: "100%",
          paddingTop: 2,
          fontSize: "10px",
          display: "inline-block",
          lineHeight: "normal",
        }}
      >
        {formatValue ? formatValue(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

export function UtilitySlider({
  min,
  max,
  step,
  value,
  vertical,
  onChange,
  label,
  style,
  onClick,
  onMouseDownCapture,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "step" | "min" | "max"> & {
  vertical?: boolean;
  label?: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
}) {
  const id = useId();
  const styles = useStyles();

  const stepDecimals = countDecimals(step ?? 0);
  const minSize = Math.max((min ?? 0).toFixed(stepDecimals).length, (max ?? 0).toFixed(stepDecimals).length);
  const renderValue = value.toFixed(countDecimals(step ?? 0)).padStart(minSize, "\xa0"); // Non-breakable space is char 0xa0 (160 dec)

  return (
    <div
      className={styles.container}
      onClick={onClick}
      onMouseDownCapture={onMouseDownCapture}
      style={{
        flexDirection: vertical ? "column-reverse" : "row",
        // border: document.activeElement?.id === id ? "1px solid red" : undefined,
        ...style,
      }}
    >
      <label style={{ whiteSpace: "nowrap" }} htmlFor={id}>
        {label}
      </label>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          // position: "absolute",
          // writingMode: vertical ? "vertical-lr" : undefined,
          // [vertical ? "top" : "right"]: 8,
          // mixBlendMode: "overlay",
          // color: "var(--background)",
        }}
      >
        {renderValue}
      </span>
      <input
        id={id}
        className="utilitySliderS"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{
          flexShrink: 4,
          margin: 0,
          padding: 0,
          writingMode: vertical ? "vertical-lr" : undefined,
          direction: vertical ? "rtl" : undefined,
        }}
        onKeyDown={(e) => {
          switch (e.key) {
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
            case "Tab":
              // allow these keys to act as they should
              return;
          }

          console.log(e, e.key);
          e.preventDefault();
        }}
        onChange={onChange}
        {...rest}
      />
    </div>
  );
}

const useStyles = createUseStyles({
  container: {
    display: "flex",
    columnGap: 3,
    rowGap: 3,
    fontSize: 10,
    height: "100%",
    alignItems: "center",
    position: "relative",
  },
});
