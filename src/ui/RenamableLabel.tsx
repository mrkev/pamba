import { MouseEvent } from "react";
import { useCallback } from "react";
import { useEffect, useRef } from "react";
import { AudioProject, RenameState } from "../lib/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";

function shallowEquals<T extends Record<string, unknown>>(a: T | null, b: T | null): boolean {
  if ((b == null) !== (a == null)) {
    return false;
  }

  // the xor above means each of these is true
  // we only get here if both a && b are null
  // the || is to refine the type
  if (a == null || b == null) {
    return true;
  }

  const keysA = Object.keys(a);
  for (const keyA of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, keyA) || a[keyA] !== b[keyA]) {
      return false;
    }
  }
  return true;
}

export function RenamableLabel({
  project,
  value,
  setValue,
  renameState,
  ...divProps
}: {
  project: AudioProject;
  value: string;
  setValue: (newVal: string) => void;
  readonly renameState: RenameState;
} & React.HTMLAttributes<HTMLDivElement>) {
  const renameInputRef = useRef<HTMLInputElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [currentlyRenaming, setCurrentlyRenaming] = useLinkedState(project.currentlyRenaming);
  const isBeingRenamed = shallowEquals(currentlyRenaming, renameState);

  const { onDoubleClick: onDoubleClickMaybe, ...passedDivProps } = divProps;

  const onDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      setCurrentlyRenaming(renameState);
      onDoubleClickMaybe?.(e);
    },
    [onDoubleClickMaybe, renameState, setCurrentlyRenaming]
  );

  useEffect(() => {
    if (isBeingRenamed) {
      const stopRenaming = function () {
        setCurrentlyRenaming(null);
      };
      document.addEventListener("mouseup", stopRenaming);
      renameInputRef.current?.focus();
      return () => {
        document.removeEventListener("mouseup", stopRenaming);
      };
    }
  }, [isBeingRenamed, setCurrentlyRenaming]);

  return (
    <span {...passedDivProps} ref={spanRef} onDoubleClick={onDoubleClick}>
      {isBeingRenamed ? (
        <input
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
              setCurrentlyRenaming(null);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        />
      ) : (
        value
      )}
    </span>
  );
}
