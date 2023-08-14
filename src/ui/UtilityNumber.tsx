import { useCallback, useEffect, useRef, useState } from "react";
import { SetState } from "../wam/WindowPanel";
import { useEventListener } from "./useEventListener";
import nullthrows from "../utils/nullthrows";
import { RenamableLabel } from "./RenamableLabel";

export type Point = [number, number];

export function useMouseDrag<T>(
  ref: React.RefObject<HTMLDivElement>,
  onMove: (e: MouseEvent, delta: [number, number], initialState: T) => void,
  initialState?: (e: MouseEvent) => T
) {
  const initial = useRef<null | { pos: Point; state: T }>(null);
  const getInitialState = useRef<((e: MouseEvent) => T) | undefined>(initialState);

  useEffect(() => {
    getInitialState.current = initialState;
  }, [initialState]);

  useEffect(() => {
    const elem = ref.current;
    if (elem == null) {
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      const init = nullthrows(initial.current);
      onMove(e, [e.clientX - init.pos[0], e.clientY - init.pos[1]], init.state);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      initial.current = {
        pos: [e.clientX, e.clientY],
        state: (getInitialState.current?.(e) ?? undefined) as T,
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    elem.addEventListener("mousedown", onMouseDown);
    return () => {
      console.log("REMOVING");
      elem.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMove, ref]);
}

export function UtilityNumber({
  value,
  onChange,
  decimals = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  decimals?: number;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  useMouseDrag(
    divRef,
    useCallback(
      (_, [deltaX, deltaY], initialValue: number) => {
        const delta = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        let sign =
          deltaX === 0 && deltaY === 0
            ? 1
            : Math.abs(deltaX) > Math.abs(deltaY)
            ? deltaX / Math.abs(deltaX)
            : -(deltaY / Math.abs(deltaY));
        const change = parseFloat((sign * (delta / 4)).toFixed(decimals));
        onChange(initialValue + change);
      },
      // TODO
      [decimals]
    ),
    useCallback(() => value, [value])
  );

  return (
    <>
      {/* <div
        
        style={{
          textAlign: "center",
          // width: 17,
          padding: "0px",
        }}
        className="utilityButton"
      > */}
      <RenamableLabel
        value={String(value)}
        setValue={function (newVal: string): void {
          const val = parseFloat(newVal);
          if (Number.isNaN(val)) {
            return;
          }
          onChange(val);
        }}
        renameState={{ status: "number" }}
        style={{ justifyContent: "center", width: 20 }}
        className="utilityButton"
      ></RenamableLabel>
      {/* </div> */}
    </>
  );
}
