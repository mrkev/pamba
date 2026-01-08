import classNames from "classnames";
import { MouseEvent, useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { usePotentialInternalState } from "./usePotentialInternalState";
import { cn } from "../utils/cn";

export function RenamableLabel({
  value: eValue,
  setValue: setEValue,
  onDoubleClick: onDoubleClickMaybe,
  highlightFocus,
  disabled,
  className,
  showEditButton,
  mode = "enter",
  ...divProps
}: {
  value: string;
  setValue: (newVal: string) => void;
  highlightFocus?: boolean;
  disabled?: boolean;
  showEditButton?: boolean;
  mode?: "immediate" | "enter";
} & React.HTMLAttributes<HTMLDivElement>) {
  const classes = useStyles();
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const showEdit = Boolean(showEditButton);
  const [value, setValue] = usePotentialInternalState<string>("internal", eValue, setEValue);

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
          className="w-full"
          style={{ fontSize: "smaller" }}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              setIsRenaming(false);
              if (mode === "enter") {
                setEValue(value);
              }
            }
            if (e.key === "Escape") {
              setIsRenaming(false);
              if (mode === "enter") {
                setValue(eValue);
              }
            }
          }}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onBlur={() => setIsRenaming(false)}
        />
      ) : (
        <span className="flex flex-row items-baseline" style={{ gap: "0.25ch" }}>
          {value}{" "}
          {showEdit && (
            <i
              style={{ marginLeft: "1ch" }}
              className={cn("ri-edit-line", "cursor-pointer")}
              onClick={() => {
                if (disabled) {
                  return;
                }
                setIsRenaming(true);
              }}
            ></i>
          )}
        </span>
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
