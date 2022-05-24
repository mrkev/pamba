import { TFaustUIItem, TFaustUIGroup } from "@shren/faust-ui/src/types";
import React from "react";
import { exhaustive } from "./exhaustive";
import { FaustSlider } from "./FaustSlider";
import { FaustNodeSetParamFn } from "./Faust";

export function FaustGroup({
  item,
  setParam,
  isTopLevel = false,
  onClickRemove,
  onHeaderClick,
  isSelected = false,
  canDelete = true,
}: {
  item: TFaustUIGroup;
  setParam: FaustNodeSetParamFn;
  isTopLevel?: boolean;
  onClickRemove?: () => void;
  onHeaderClick?: () => void;
  canDelete?: boolean;
  isSelected?: boolean;
}) {
  const { items, label, type } = item;

  const groupStyle: React.CSSProperties =
    type === "hgroup"
      ? {
          display: "flex",
          flexDirection: "row",
          flexShrink: 1,
          minHeight: 10,
          columnGap: 6,
        }
      : type === "vgroup"
      ? { display: "flex", flexDirection: "column", height: "100%" }
      : // tgroup
        {};

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: isTopLevel ? undefined : "1px solid black",
        // borderLeft: "1px solid black",
        padding: isTopLevel ? "0px" : "0px 4px",
        columnGap: 6,
        background: "gray",
        fontSize: 12,
      }}
    >
      {isTopLevel ? (
        // The whole effect header
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            background: isSelected ? "#555" : undefined,
          }}
          onClick={onHeaderClick}
        >
          <div>{label}</div>
          <button disabled={!canDelete} onClick={onClickRemove}>
            x
          </button>
        </div>
      ) : (
        <div>{label}</div>
      )}

      <div style={groupStyle}>
        {items.map((item, i) => {
          return <FaustItem key={i} item={item} setParam={setParam} />;
        })}
      </div>
    </div>
  );
}

export function FaustItem({ item, setParam }: { item: TFaustUIItem; setParam: FaustNodeSetParamFn }) {
  const { type } = item;

  switch (type) {
    case "vgroup": {
      return <FaustGroup item={item} setParam={setParam} />;
    }

    case "hgroup": {
      return <FaustGroup item={item} setParam={setParam} />;
    }

    case "hslider": {
      return <FaustSlider item={item} setParam={setParam} direction="horizontal" />;
    }

    case "vslider": {
      return <FaustSlider item={item} setParam={setParam} direction="vertical" />;
    }

    case "tgroup":
      return (
        <div>
          "tgroup"{" "}
          {item.items.map((item, i) => {
            return <FaustItem key={i} item={item} setParam={setParam} />;
          })}
        </div>
      );

    case "hbargraph":
      return <div>"hbargraph"</div>;

    case "vbargraph":
      return <div>"vbargraph"</div>;

    case "button":
      return <button>"button"</button>;

    case "checkbox":
      return <input type="checkbox">"checkbox"</input>;

    case "nentry":
      return <div>"nentry"</div>;

    default:
      return exhaustive(type);
  }
}
