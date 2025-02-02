import React from "react";
import { Effect } from "../../ui/Effect";
import { FaustAudioEffect } from "../FaustAudioEffect";
import { faustGroupStyle } from "./FaustGroup";
import { FaustItem } from "./FaustItem";
import { usePrimitive } from "structured-state";

/** Renders a FaustAudioEffect */
export default function FaustEffectModule({
  effect,
  onClickRemove,
  onClickBypass,
  onHeaderMouseDown,
  canDelete,
  canBypass,
  isSelected,
  onDragStart,
}: {
  effect: FaustAudioEffect;
  style?: React.CSSProperties;
  onClickRemove: (effect: FaustAudioEffect) => void;
  onClickBypass: (effect: FaustAudioEffect) => void;
  onHeaderMouseDown: (effect: FaustAudioEffect) => void;
  canDelete: boolean;
  canBypass: boolean;
  isSelected: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const [name] = usePrimitive(effect.name);

  // Use the top-most group as the overall wrapper, with the close button etc
  if ((effect.ui.length === 1 && effect.ui[0].type === "hgroup") || effect.ui[0].type === "vgroup") {
    const item = effect.ui[0];
    const { items, label, type } = item;
    const groupStyle = faustGroupStyle(type);

    return (
      <Effect
        title={name}
        canDelete={canDelete}
        canBypass={canBypass}
        onClickBypass={() => onClickBypass(effect)}
        onClickRemove={() => onClickRemove(effect)}
        onHeaderMouseDown={() => onHeaderMouseDown(effect)}
        isSelected={isSelected}
        bypass={effect.bypass}
        onDragStart={onDragStart}
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
      title={name}
      onClickBypass={() => onClickBypass(effect)}
      onClickRemove={() => onClickRemove(effect)}
      onHeaderMouseDown={() => onHeaderMouseDown(effect)}
      canDelete={canDelete}
      isSelected={isSelected}
      onDragStart={onDragStart}
    >
      {effect.ui.map((item, i) => {
        return <FaustItem key={i} item={item} effect={effect} arrPos={i} />;
      })}
    </Effect>
  );
}
