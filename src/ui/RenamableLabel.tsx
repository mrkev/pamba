import { MouseEvent, useCallback, useRef, useState } from "react";

export function RenamableLabel({
  value,
  setValue,
  style,
  ...divProps
}: {
  value: string;
  setValue: (newVal: string) => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const { onDoubleClick: onDoubleClickMaybe, ...passedDivProps } = divProps;

  const onDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      setIsRenaming(true);
      onDoubleClickMaybe?.(e);
    },
    [onDoubleClickMaybe]
  );

  return (
    <span
      // TODO: change for class
      style={{
        display: "inline-flex",
        flexDirection: "row",
        alignItems: "center",
        ...style,
      }}
      {...passedDivProps}
      onDoubleClick={onDoubleClick}
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
