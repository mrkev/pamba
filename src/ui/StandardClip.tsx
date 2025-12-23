import React, { useCallback, useRef } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { MidiClip } from "../midi/MidiClip";
import { useEventListener } from "./useEventListener";
import { cn } from "../utils/cn";

/** Standard component renderer for clips on the timeline */
export function StandardClip({
  clip,
  isSelected,
  contentStyle = {},
  editable,
  onMouseDownToResize,
  onMouseDownToMove,
  onClipClick,
  children,
}: {
  clip: AudioClip | MidiClip;
  isSelected: boolean;
  contentStyle?: React.CSSProperties;
  editable: boolean;
  onMouseDownToResize: (e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") => void;
  onMouseDownToMove: (e: MouseEvent) => void;
  onClipClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  children?: React.ReactNode;
}) {
  const project = appEnvironment.ensureProject();

  const timelienStart = useContainer(clip.timelineStart);
  const timelineLength = useContainer(clip.timelineLength);
  const width = project.viewport.pulsesToPx(timelineLength.pulses(project));
  const left = Math.floor(project.viewport.pulsesToPx(timelienStart.pulses(project)));

  const styles = useStyles();
  const headerRef = useRef<HTMLDivElement>(null);
  const [name] = usePrimitive(clip.name);

  useEventListener("mousedown", headerRef, onMouseDownToMove);

  useEventListener(
    "dblclick",
    headerRef,
    useCallback(() => {
      appEnvironment.activeBottomPanel.set("editor");
    }, []),
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full select-none box-border",
        "bg-clip-color absolute",
        "rounded-sm",
        isSelected ? "border border-clip-border-selected" : "border border-clip-color",
      )}
      onClick={onClipClick}
      style={{
        width: width,
        pointerEvents: editable ? "all" : "none",
        left,
      }}
    >
      <div
        className={cn(
          "name-clip-header",
          styles.clipHeader,
          "whitespace-nowrap overflow-hidden shrink-0",
          "text-clip-border-selected",
          isSelected && "bg-clip-border-selected text-white",
        )}
        ref={headerRef}
        data-clip-header={"true"}
        style={{
          paddingLeft: 2,
        }}
      >
        {name}
      </div>
      <div className="grow" style={contentStyle}></div>
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
    fontSize: 11,
    paddingBottom: "0px 0px 1px 0px",
  },
});
