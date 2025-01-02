import { useCallback, useRef } from "react";
import { createUseStyles } from "react-jss";
import { SBoolean, SString, usePrimitive } from "structured-state";
import { UtilityToggle } from "./UtilityToggle";
import { useEventListener } from "./useEventListener";
import { utility } from "./utility";

export function Effect({
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
  title: SString;
  onClickRemove: () => void;
  onHeaderMouseDown: () => void;
  onClickBypass: () => void;
  isSelected?: boolean;
  canDelete?: boolean;
  canBypass?: boolean;
  bypass?: SBoolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  // todo: take a string?
  const [titleS] = usePrimitive(title);
  return (
    <div
      style={{
        background: "gray",
        border: "1px solid #333",
        fontSize: "12px",
        display: "flex",
        flexDirection: "column",
        columnGap: 6,
        userSelect: "none",
      }}
    >
      <EffectHeader
        title={titleS}
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
  const styles = useStyles();
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
      className={styles.faustTopLevelHeader}
      style={{
        background: isSelected ? "#555" : undefined,
        display: "flex",
        flexDirection: "row",
        borderBottom: "1px solid black",
        gap: 4,
      }}
    >
      <div style={{ whiteSpace: "nowrap" }}>{title}</div>
      <div className="spacer"></div>
      {bypass && <BypassToggle bypass={bypass} onClickBypass={onClickBypass} canBypass={canBypass} />}
      <button className={utility.button} disabled={!canDelete} onClick={onClickRemove}>
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

const useStyles = createUseStyles({
  faustTopLevelHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0px 4px",
  },
});
