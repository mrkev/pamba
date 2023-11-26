import classNames from "classnames";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";

export function RenamableLabel({
  value,
  setValue,
  onDoubleClick: onDoubleClickMaybe,
  highlightFocus,
  disabled,
  className,
  ...divProps
}: {
  value: string;
  setValue: (newVal: string) => void;
  highlightFocus?: boolean;
  disabled?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  const classes = useStyles();
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const onDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      setIsRenaming(true);
      onDoubleClickMaybe?.(e);
    },
    [disabled, onDoubleClickMaybe],
  );

  return (
    <span
      tabIndex={highlightFocus ? 0 : undefined}
      className={classNames(
        className,
        classes.container,
        highlightFocus && classes.focusHighlight,
        disabled && classes.disabled,
      )}
      {...divProps}
      onDoubleClick={onDoubleClick}
      onMouseDown={(e) => {
        if (disabled) {
          return;
        }
        if (document.activeElement === e.target) {
          setIsRenaming(true);
        }
        if (e.target instanceof HTMLSpanElement) {
          e.target.focus();
        }
      }}
    >
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
  focusHighlight: {
    "&:focus": {
      background: "rgba(0,0,0,0.3)",
    },
  },
  disabled: {
    fontStyle: "italic",
  },
});
