import { TFaustUIInputItem } from "@shren/faust-ui/src/types";
import React, { useState } from "react";
import { FaustNodeSetParamFn } from "../FaustAudioEffect";

export function FaustSlider({
  item,
  setParam,
  direction,
}: {
  item: TFaustUIInputItem;
  setParam: FaustNodeSetParamFn;
  direction: "vertical" | "horizontal";
}) {
  const isHorizontal = direction === "horizontal";
  const { label, index, init, min, max, step, address } = item;
  const [value, setValue] = useState(init);
  const orient = !isHorizontal ? { orient: "vertical" } : {};
  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: isHorizontal ? "row" : "column-reverse",
    columnGap: 3,
    rowGap: 3,
    fontSize: 10,
    height: "100%",
    alignItems: "center",
  };
  return (
    <div style={style}>
      <label style={{ whiteSpace: "nowrap" }} htmlFor={`${index}`}>
        {label}
      </label>
      <input
        id={`${index}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ flexShrink: 4, minHeight: 10 }}
        onChange={(e) => {
          const newVal = parseFloat(e.target.value);
          setValue(() => {
            setParam(address, newVal);
            return newVal;
          });
        }}
        {...orient}
      ></input>
    </div>
  );
}
