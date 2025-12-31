import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { useEventListener } from "./useEventListener";

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
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
  vertical?: boolean;
  className?: string;
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
      className={cn("relative text-center", className)}
      style={{
        height: 18,
      }}
    >
      <input
        className={cn("utilitySlider", "w-full m-0 p-0 h-full")}
        ref={ref}
        style={{
          // position: "absolute",
          // left: 0,
          writingMode: vertical ? "vertical-lr" : undefined,
          direction: vertical ? "rtl" : undefined,
        }}
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
        className="absolute text-control-text-color left-0 top-px pointer-events-none w-full inline-block"
        style={{
          // textAlign: "center",
          // verticalAlign: "middle",
          // position: "absolute",
          paddingTop: 2,
          fontSize: "10px",
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

  return (
    <input
      id={id}
      className={cn("utilitySliderS", "m-0 p-0")}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      style={{
        flexShrink: 4,
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
  );
}
