import React from "react";
import { usePrimitive } from "structured-state";
import { EffectBox } from "../../ui/EffectBox";
import { FaustAudioEffect } from "../FaustAudioEffect";
import { faustGroupStyle } from "./FaustGroup";
import { FaustItem } from "./FaustItem";

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
      <EffectBox
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
        <div
          className="self-stretch"
          style={{
            padding: "0px 4px",
            ...groupStyle,
          }}
        >
          {items.map((item, i) => {
            return <FaustItem key={i} item={item} effect={effect} arrPos={i} />;
          })}
        </div>
      </EffectBox>
    );
  }

  return (
    <EffectBox
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
    </EffectBox>
  );
}
