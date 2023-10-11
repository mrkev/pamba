import { MouseEvent, useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";

export function RenamableLabel({
  value,
  setValue,
  onDoubleClick: onDoubleClickMaybe,
  ...divProps
}: {
  value: string;
  setValue: (newVal: string) => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  const classes = useStyles();
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const onDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      setIsRenaming(true);
      onDoubleClickMaybe?.(e);
    },
    [onDoubleClickMaybe],
  );

  return (
    <span className={classes.container} {...divProps} onDoubleClick={onDoubleClick}>
      {isRenaming ? (
        <input
          autoFocus
          ref={renameInputRef}
          style={{ width: "100%", fontSize: "smaller" }}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              setIsRenaming(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onBlur={() => setIsRenaming(false)}
        />
      ) : (
        value
      )}
    </span>
  );
}

const useStyles = createUseStyles({
  container: {
    display: "inline-flex",
    flexDirection: "row",
    alignItems: "center",
  },
});
