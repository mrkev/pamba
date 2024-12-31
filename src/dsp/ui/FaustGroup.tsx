import type { FaustUIGroup, FaustUIGroupType } from "@grame/faustwasm";
import React from "react";
import { createUseStyles } from "react-jss";
import { FaustAudioEffect } from "../FaustAudioEffect";
import { FaustItem } from "./FaustItem";

const useStyles = createUseStyles({
  faustGroupRoot: {
    display: "flex",
    flexDirection: "column",
    columnGap: 6,
    background: "gray",
    fontSize: 12,
    userSelect: "none",
    gap: 4,
  },
  faustTopLevelHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0px 4px",
  },
});

export function faustGroupStyle(kind: FaustUIGroupType): React.CSSProperties {
  return kind === "hgroup"
    ? {
        display: "flex",
        flexDirection: "row",
        flexShrink: 1,
        minHeight: 10,
        columnGap: 6,
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
  const styles = useStyles();
  const groupStyle = faustGroupStyle(type);

  return (
    <div
      className={styles.faustGroupRoot}
      style={{
        borderLeft: isFirstItem ? undefined : "1px solid black",
        padding: "2px 4px",
      }}
    >
      <div>{label}</div>
      <div style={groupStyle}>
        {items.map((item, i) => {
          return <FaustItem key={i} item={item} effect={effect} arrPos={i} />;
        })}
      </div>
    </div>
  );
}
