import React from "react";
import { Effect } from "../../ui/Effect";
import { FaustAudioEffect } from "../FaustAudioEffect";
import { faustGroupStyle } from "./FaustGroup";
import { FaustItem } from "./FaustItem";

/** Renders a FaustAudioEffect */
export default function FaustEffectModule({
  effect,
  onClickRemove,
  onClickBypass,
  onHeaderClick,
  canDelete,
  isSelected,
}: {
  effect: FaustAudioEffect;
  style?: React.CSSProperties;
  onClickRemove: (effect: FaustAudioEffect) => void;
  onClickBypass: (effect: FaustAudioEffect) => void;
  onHeaderClick: (effect: FaustAudioEffect) => void;
  canDelete: boolean;
  isSelected: boolean;
}) {
  // Use the top-most group as the overall wrapper, with the close button etc
  if ((effect.ui.length === 1 && effect.ui[0].type === "hgroup") || effect.ui[0].type === "vgroup") {
    const item = effect.ui[0];
    const { items, label, type } = item;
    const groupStyle = faustGroupStyle(type);

    return (
      <Effect
        title={label}
        canDelete={canDelete}
        onClickBypass={() => onClickBypass(effect)}
        onClickRemove={() => onClickRemove(effect)}
        onHeaderClick={() => onHeaderClick(effect)}
        isSelected={isSelected}
      >
        <div style={groupStyle}>
          {items.map((item, i) => {
            return <FaustItem key={i} item={item} effect={effect} arrPos={i} />;
          })}
        </div>
      </Effect>
    );
  }

  return (
    <Effect
      title={effect.name}
      onClickBypass={() => onClickBypass(effect)}
      onClickRemove={() => onClickRemove(effect)}
      onHeaderClick={() => onHeaderClick(effect)}
      canDelete={canDelete}
      isSelected={isSelected}
    >
      {effect.ui.map((item, i) => {
        return <FaustItem key={i} item={item} effect={effect} arrPos={i} />;
      })}
    </Effect>
  );
}
