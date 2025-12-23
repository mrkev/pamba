import { useCallback, useRef } from "react";
import { SBoolean, usePrimitive } from "structured-state";
import { UtilityToggle } from "./UtilityToggle";
import { useEventListener } from "./useEventListener";
import { utility } from "./utility";
import { cn } from "../utils/cn";

export function EffectBox({
  children,
  title,
  onClickBypass,
  onClickRemove,
  onHeaderMouseDown,
  isSelected,
  canDelete,
  canBypass,
  bypass,
  onDragStart,
}: {
  children?: React.ReactNode;
  title: string;
  onClickRemove?: () => void;
  onHeaderMouseDown: () => void;
  onClickBypass: () => void;
  isSelected?: boolean;
  canDelete?: boolean;
  canBypass?: boolean;
  bypass?: SBoolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="flex flex-col select-none bg-effect-back">
      <EffectHeader
        title={title}
        isSelected={isSelected}
        onClickBypass={onClickBypass}
        onClickRemove={onClickRemove}
        onMouseDown={onHeaderMouseDown}
        canDelete={canDelete}
        canBypass={canBypass}
        bypass={bypass}
        onDragStart={onDragStart}
      />
      {children}
    </div>
  );
}

function EffectHeader({
  onMouseDown,
  onClickRemove,
  onClickBypass,
  canDelete,
  canBypass,
  title,
  isSelected,
  bypass,
  onDragStart,
}: {
  onClickRemove?: () => void;
  onMouseDown?: (e: MouseEvent) => void;
  onClickBypass?: () => void;
  canDelete?: boolean;
  canBypass?: boolean;
  title: string;
  isSelected?: boolean;
  bypass?: SBoolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const headerRef = useRef<HTMLDivElement>(null);

  useEventListener(
    "mousedown",
    headerRef,
    useCallback((e) => onMouseDown?.(e), [onMouseDown]),
  );

  return (
    <div
      draggable={onDragStart != null}
      onDragStart={onDragStart}
      ref={headerRef}
      className={"flex flex-row justify-between items-center border-b border-black"}
      style={{
        background: isSelected ? "#555" : undefined,
        padding: "0px 0px 0px 4px",
        gap: 4,
      }}
    >
      <div className="whitespace-nowrap">{title}</div>
      <div className="spacer"></div>
      {bypass && <BypassToggle bypass={bypass} onClickBypass={onClickBypass} canBypass={canBypass} />}
      <button
        className={cn(utility.button)}
        style={{ borderLeft: "1px solid black" }}
        disabled={!canDelete}
        onClick={onClickRemove}
      >
        x
      </button>
    </div>
  );
}

function BypassToggle({
  bypass,
  onClickBypass,
  canBypass,
}: {
  bypass: SBoolean;
  onClickBypass?: () => void;
  canBypass?: boolean;
}) {
  const [bypassOn] = usePrimitive(bypass);

  return (
    <UtilityToggle
      toggled={bypassOn}
      onToggle={(on) => {
        bypass.set(on);
        onClickBypass?.();
      }}
      title={"toggle bypass"}
      toggleStyle={{ background: "orange" }}
      disabled={!canBypass}
    >
      bypass
    </UtilityToggle>
  );
}
