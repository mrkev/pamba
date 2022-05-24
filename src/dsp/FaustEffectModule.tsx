import React from "react";
import { FaustGroup, FaustItem } from "./FaustItem";
import { FaustAudioEffect } from "./Faust";

export default function FaustEffectModule({
  effect,
  style,
  onClickRemove,
  onHeaderClick,
  canDelete,
  isSelected,
}: {
  effect: FaustAudioEffect;
  style?: React.CSSProperties;
  onClickRemove: (effect: FaustAudioEffect) => void;
  onHeaderClick: (effect: FaustAudioEffect) => void;
  canDelete: boolean;
  isSelected: boolean;
}) {
  // Use the top-most group as the overall wrapper, with the close button etc
  if ((effect.ui.length === 1 && effect.ui[0].type === "hgroup") || effect.ui[0].type === "vgroup") {
    const item = effect.ui[0];
    return (
      <FaustGroup
        item={item}
        setParam={effect.node.setParam}
        isTopLevel={true}
        canDelete={canDelete}
        onClickRemove={() => {
          onClickRemove(effect);
        }}
        onHeaderClick={() => {
          onHeaderClick(effect);
        }}
        isSelected={isSelected}
      />
    );
  }

  return (
    <div
      style={{
        background: "gray",
        border: "1px solid #333",
        fontSize: "14px",
        ...style,
      }}
    >
      {effect.ui.map((item, i) => {
        return <FaustItem key={i} item={item} setParam={effect.node.setParam} />;
      })}
    </div>
  );
}
