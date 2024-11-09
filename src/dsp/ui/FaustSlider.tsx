import type { FaustUIInputItem } from "@grame/faustwasm";
import React from "react";
import { useContainer } from "structured-state";
import { nullthrows } from "../../utils/nullthrows";
import { FaustAudioEffect } from "../FaustAudioEffect";

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

  // observe the map to be notified of changes
  const params = useContainer(effect.params);
  // TODO: handle, disable control, show error state?
  const value = nullthrows(params.get(address), `Invalid address for effect param: ${address}`);

  // const [value, setValue] = useState(() => effect.getParam(address));
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
        style={{
          flexShrink: 4,
          minHeight: 10,
          writingMode: isHorizontal ? undefined : "vertical-lr",
          direction: isHorizontal ? undefined : "rtl",
          height: "100%",
        }}
        onKeyDown={(e) => {
          console.log(e, e.key);
          e.preventDefault();
        }}
        onChange={(e) => {
          const newVal = parseFloat(e.target.value);
          effect.setParam(address, newVal);
          return newVal;
        }}
        list="steplist"
      ></input>
    </div>
  );
}
