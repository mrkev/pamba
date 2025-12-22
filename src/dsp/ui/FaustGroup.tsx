import type { FaustUIGroup, FaustUIGroupType } from "@grame/faustwasm";
import React from "react";
import { cn } from "../../utils/cn";
import { FaustAudioEffect } from "../FaustAudioEffect";
import { FaustItem } from "./FaustItem";

export function faustGroupStyle(kind: FaustUIGroupType): React.CSSProperties {
  return kind === "hgroup"
    ? {
        display: "flex",
        flexDirection: "row",
        flexShrink: 1,
        minHeight: 10,
        gap: 6,
      }
    : kind === "vgroup"
      ? { display: "flex", flexDirection: "column", height: "100%" }
      : // tgroup
        {};
}

export function FaustGroup({
  item,
  effect,
  isFirstItem,
}: {
  item: FaustUIGroup;
  effect: FaustAudioEffect;
  isFirstItem?: boolean;
}) {
  const { items, label, type } = item;
  const groupStyle = faustGroupStyle(type); // todo: "tgroup"?

  return (
    <div
      className={"flex flex-col select-none"}
      style={{
        borderLeft: isFirstItem ? undefined : "1px solid black",
        padding: "2px 4px",
        columnGap: 6,
        fontSize: 12,
        gap: 4,
      }}
    >
      <div style={{ fontSize: "10px" }}>{label}</div>
      <div
        className={cn(
          //
          type === "hgroup" && "flex flex-row",
          type === "vgroup" && "flex flex-col h-full",
        )}
        style={groupStyle}
      >
        {items.map((item, i) => {
          return <FaustItem key={i} item={item} effect={effect} arrPos={i} />;
        })}
      </div>
    </div>
  );
}
