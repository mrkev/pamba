import React, { useCallback, useRef } from "react";
import { createUseStyles } from "react-jss";
import { usePrimitive } from "structured-state";
import { appEnvironment } from "../lib/AppEnvironment";
import type { AudioClip } from "../lib/AudioClip";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { MidiClip } from "../midi/MidiClip";
import { useEventListener } from "./useEventListener";

export function StandardClip({
  clip,
  isSelected,
  style = {},
  editable,
  onMouseDownToResize,
  onMouseDownToMove,
  onClipClick,
  width,
  left,
  children,
}: {
  clip: AudioClip | MidiClip;
  isSelected: boolean;
  style?: React.CSSProperties;
  editable: boolean;
  onMouseDownToResize: (e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") => void;
  onMouseDownToMove: (e: MouseEvent) => void;
  onClipClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  width: number;
  left: number;
  children?: React.ReactNode;
}) {
  const styles = useStyles();
  const headerRef = useRef<HTMLDivElement>(null);
  const [name] = usePrimitive(clip.name);

  useSubscribeToSubbableMutationHashable(clip);

  useEventListener("mousedown", headerRef, onMouseDownToMove);

  useEventListener(
    "dblclick",
    headerRef,
    useCallback(() => {
      appEnvironment.activeBottomPanel.set("editor");
    }, []),
  );

  const border = isSelected ? "1px solid var(--clip-border-selected)" : "1px solid var(--clip-header)";

  return (
    <div
      className={styles.clip}
      onClick={onClipClick}
      style={{
        width: width,
        border: border,
        pointerEvents: editable ? "all" : "none",
        left,
        ...style,
      }}
    >
      <div
        className={styles.clipHeader}
        ref={headerRef}
        data-clip-header={"true"}
        style={{
          color: isSelected ? "white" : "black",
          background: isSelected ? "var(--clip-header-selected)" : "var(--clip-header)",
          borderBottom: border,
          paddingLeft: 2,
        }}
      >
        {/* TODO: not working */}
        {/* <RenamableLabel
              style={{
                color: isSelected ? "white" : "black",
                fontSize: 10,
              }}
              value={name}
              setValue={console.log}
            />{" "} */}
        {/* {clip.toString()} */}
        {name}
      </div>
      {editable && <div className={styles.resizerStart} onMouseDownCapture={(e) => onMouseDownToResize(e, "start")} />}
      {editable && <div className={styles.resizerEnd} onMouseDownCapture={(e) => onMouseDownToResize(e, "end")} />}
      {children}
      {/* <GPUWaveform audioBuffer={clip.buffer} width={width} height={30} /> */}
      {/* <button
              onClick={() => {
                if (canvasRef.current) {
                  dataWaveformToCanvas(100, 20, clip.buffer, canvasRef.current);
                }
              }}
            >
              Test waveform worker
            </button> */}
      {/* <ClipAutomation clip={clip} secsToPx={secsToPx} /> */}
    </div>
  );
}

const useStyles = createUseStyles({
  resizerEnd: {
    width: 10,
    background: "rgba(0,0,0,0)",
    height: "100%",
    position: "absolute",
    right: -5,
    top: 0,
    cursor: "ew-resize",
  },
  resizerStart: {
    width: 10,
    background: "rgba(0,0,0,0)",
    height: "100%",
    position: "absolute",
    left: -5,
    top: 0,
    cursor: "ew-resize",
  },
  clipHeader: {
    opacity: 0.8,
    fontSize: 10,
    whiteSpace: "nowrap",
    overflow: "hidden",
    flexShrink: 0,
    paddingBottom: "0px 0px 1px 0px",
  },
  clip: {
    backgroundColor: "var(--clip-color)",
    height: "100%",
    userSelect: "none",
    boxSizing: "border-box",
    color: "white",
    display: "flex",
    flexDirection: "column",
    position: "absolute",
  },
});
