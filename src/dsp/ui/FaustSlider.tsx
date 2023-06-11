import React, { useState } from "react";
import { FaustAudioEffect } from "../FaustAudioEffect";
import type { FaustUIInputItem } from "@shren/faustwasm";

export function FaustSlider({
  item,
  effect,
  direction,
}: {
  item: FaustUIInputItem;
  effect: FaustAudioEffect;
  direction: "vertical" | "horizontal";
}) {
  const isHorizontal = direction === "horizontal";
  const { label, index, min, max, step, address } = item;
  const [value, setValue] = useState(() => effect.getParam(address));
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
            effect.setParam(address, newVal);
            return newVal;
          });
        }}
        {...orient}
      ></input>
    </div>
  );
}
