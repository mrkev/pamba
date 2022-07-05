import { TFaustUIGroup } from "@shren/faust-ui/src/types";
import React from "react";
import { FaustNodeSetParamFn } from "../FaustAudioEffect";
import { css } from "@linaria/core";
import { FaustItem } from "./FaustItem";
import { utility } from "../../ui/utility";

const styles = {
  faustGroupRoot: css`
    ${{
      display: "flex",
      flexDirection: "column",
      columnGap: 6,
      background: "gray",
      fontSize: 12,
      userSelect: "none",
    } as const}
  `,
  faustTopLevelHeader: css`
    ${{
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0px 4px",
    } as const}
  `,
};

export function FaustGroup({
  item,
  setParam,
  isTopLevel = false,
  onClickRemove,
  onClickBypass,
  onHeaderClick,
  isSelected = false,
  canDelete = true,
}: {
  item: TFaustUIGroup;
  setParam: FaustNodeSetParamFn;
  isTopLevel?: boolean;
  onClickRemove?: () => void;
  onHeaderClick?: () => void;
  onClickBypass?: () => void;
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
      className={styles.faustGroupRoot}
      style={{
        borderLeft: isTopLevel ? undefined : "1px solid black",
        // borderLeft: "1px solid black",
        padding: isTopLevel ? "0px 0px 4px 0px" : "2px 4px",
      }}
    >
      {isTopLevel ? (
        // The whole effect header
        <div
          className={styles.faustTopLevelHeader}
          style={{
            background: isSelected ? "#555" : undefined,
          }}
          onClick={onHeaderClick}
        >
          <div>{label}</div>
          <div>
            <button className={utility.button} onClick={onClickBypass}>
              bypass
            </button>
            <button className={utility.button} disabled={!canDelete} onClick={onClickRemove}>
              x
            </button>
          </div>
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
