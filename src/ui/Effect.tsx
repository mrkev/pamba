import { createUseStyles } from "react-jss";
import { utility } from "./utility";

export function Effect({
  children,
  title,
  onClickBypass,
  onClickRemove,
  onHeaderClick,
  isSelected,
  canDelete,
}: {
  children?: React.ReactNode;
  title: string;
  onClickRemove: () => void;
  onHeaderClick: () => void;
  onClickBypass: () => void;
  isSelected?: boolean;
  canDelete?: boolean;
}) {
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
        title={title}
        isSelected={isSelected}
        onClickBypass={onClickBypass}
        onClickRemove={onClickRemove}
        onHeaderClick={onHeaderClick}
        canDelete={canDelete}
      />
      {children}
    </div>
  );
}

export function EffectHeader({
  onHeaderClick,
  onClickRemove,
  canDelete,
  title,
  isSelected,
}: {
  onClickRemove?: () => void;
  onHeaderClick?: () => void;
  onClickBypass?: () => void;
  canDelete?: boolean;
  title: string;
  isSelected?: boolean;
}) {
  const styles = useStyles();
  return (
    <div
      className={styles.faustTopLevelHeader}
      style={{
        background: isSelected ? "#555" : undefined,
        display: "flex",
        flexDirection: "row",
        gap: 4,
      }}
      onClick={onHeaderClick}
    >
      <div style={{ whiteSpace: "nowrap" }}>{title}</div>
      <div>
        {/* <button className={utility.button} onClick={onClickBypass}>
          bypass
        </button> */}
        <button className={utility.button} disabled={!canDelete} onClick={onClickRemove}>
          x
        </button>
      </div>
    </div>
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
