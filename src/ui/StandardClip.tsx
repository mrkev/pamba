import React, { useCallback, useMemo, useRef } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { CLIP_MIN_SIZE_PULSES } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { clipResizeEndPulses, clipResizeEndSec, clipResizeStartSec } from "../lib/clipMoveSec";
import { AudioProject } from "../lib/project/AudioProject";
import { TimelineT } from "../lib/project/TimelineT";
import { START_PADDING_PX } from "../lib/viewport/ProjectViewport";
import { MidiClip } from "../midi/MidiClip";
import { cn } from "../utils/cn";
import { clamp } from "../utils/math";
import { useEventListener } from "./useEventListener";
import { PointerPressMeta, usePointerEditing } from "./usePointerPressMove";

/** Standard component renderer for clips on the timeline */
export function StandardClip({
  clip,
  isSelected,
  contentStyle = {},
  editable,
  onMouseDownToMove,
  onClipClick,
  children,
  ref,
  className,
}: {
  clip: AudioClip | MidiClip;
  isSelected: boolean;
  contentStyle?: React.CSSProperties;
  editable: boolean;
  onMouseDownToMove: (e: MouseEvent) => void;
  onClipClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
  className?: string;
}) {
  const project = appEnvironment.ensureProject();

  const timelienStart = useContainer(clip.timelineStart);
  const timelineLength = useContainer(clip.timelineLength);
  const [tool] = usePrimitive(project.pointerTool);

  // looks better adding this 0.5px margin to left and right
  const left = project.viewport.timeToPx(timelienStart, START_PADDING_PX) + 0.5;
  const width = project.viewport.timeToPx(timelineLength) - 0.5;
  const resizerStartRef = useRef<HTMLDivElement>(null);
  const resizerEndRef = useRef<HTMLDivElement>(null);

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

  const originalCb = useCallback(
    () => ({
      len: clip.timelineLength.clone(),
      start: clip.timelineStart.clone(),
      bufferOffset: clip.bufferOffset.clone(),
      editable,
    }),
    [clip.bufferOffset, clip.timelineLength, clip.timelineStart, editable],
  );
  const target = useMemo(() => ({ clip, project }), [clip, project]);

  const isResizingEnd = usePointerEditing(resizerEndRef, originalCb, {
    down: useCallback((e: PointerEvent, original: ClipEditOriginal) => resizeDown(e, { target, original }), [target]),
    up: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: ClipEditOriginal) =>
        resizeUp(e, { start, target, original }),
      [target],
    ),
    move: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: ClipEditOriginal) =>
        resizeEndMove(e, { start, target, original }),
      [target],
    ),
  });

  const isResizingStart = usePointerEditing(resizerStartRef, originalCb, {
    down: useCallback((e: PointerEvent, original: ClipEditOriginal) => resizeDown(e, { target, original }), [target]),
    up: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: ClipEditOriginal) =>
        resizeUp(e, { start, target, original }),
      [target],
    ),
    move: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: ClipEditOriginal) =>
        resizeStartMove(e, { start, target, original }),
      [target],
    ),
  });

  const showResizers = (editable && tool == "move" && width > 10) || isResizingEnd || isResizingStart;

  return (
    <div
      className={cn(
        "flex flex-col h-full select-none box-border",
        "bg-clip-color absolute",
        "rounded-sm",
        !editable && "pointer-events-none",
        isSelected ? "border border-clip-border-selected" : "border border-clip-color",
        className,
      )}
      ref={ref}
      onClick={onClipClick}
      style={{ width, left }}
    >
      <div
        className={cn(
          "name-clip-header",
          "whitespace-nowrap overflow-hidden shrink-0 cursor-move",
          "text-clip-border-selected",
          isSelected && "bg-clip-border-selected text-white",
        )}
        ref={headerRef}
        data-clip-header={"true"}
        style={{
          paddingLeft: "2px",
          fontSize: 11,
          paddingBottom: "2px",
        }}
      >
        {name}
      </div>
      <div className="grow" style={contentStyle}></div>
      {showResizers && (
        <div ref={resizerStartRef} className={cn("absolute top-0 h-full cursor-ew-resize", styles.resizerStart)} />
      )}
      {showResizers && (
        <div ref={resizerEndRef} className={cn("absolute top-0 h-full cursor-ew-resize", styles.resizerEnd)} />
      )}
      {children}
    </div>
  );
}

const useStyles = createUseStyles({
  resizerEnd: {
    width: 10,
    background: "rgba(0,0,0,0)",
    // background: "black",
    right: -5,
  },
  resizerStart: {
    width: 10,
    background: "rgba(0,0,0,0)",
    // background: "black",
    left: -5,
  },
});

/** EVENTS, UNUSED */

type ClipEditOriginal = { len: TimelineT; start: TimelineT; bufferOffset: TimelineT; editable: boolean };
type ClipEditTarget = {
  project: AudioProject;
  clip: AudioClip | MidiClip;
};

type ClipEditStartEvent = {
  original: ClipEditOriginal;
  target: ClipEditTarget;
};

type ClipEditEvent = {
  start: PointerPressMeta;
  original: ClipEditOriginal;
  target: ClipEditTarget;
};

/** RESIZING */

function resizeDown(e: PointerEvent, re: ClipEditStartEvent) {
  // so it doesn't reach the clip or timeline body
  e.stopPropagation();
  e.preventDefault();

  const tool = re.target.project.pointerTool.get();
  if (tool !== "move" || !re.original.editable) {
    return "abort";
  }
}

function resizeEndMove(e: PointerEvent, re: ClipEditEvent) {
  const project = re.target.project;
  const targetClip = re.target.clip;

  const deltaX = e.clientX - re.start.downX;
  const deltaU = Math.floor(project.viewport.pxTo(deltaX, targetClip.timelineLength.unit));
  const snap = e.metaKey ? !project.snapToGrid.get() : project.snapToGrid.get();

  if (targetClip instanceof MidiClip) {
    const newLength = Math.max(CLIP_MIN_SIZE_PULSES, re.original.len.pulses(project) + deltaU);
    const originalEnd = re.original.start.pulses(project) + re.original.len.pulses(project);
    clipResizeEndPulses(targetClip, newLength, originalEnd, snap);
  }

  if (targetClip instanceof AudioClip) {
    const newLength = re.original.len.secs(project) + deltaU;
    clipResizeEndSec(targetClip, newLength, project, snap);
  }
}

function resizeStartMove(e: PointerEvent, re: ClipEditEvent) {
  const project = re.target.project;
  const targetClip = re.target.clip;
  const deltaX = e.clientX - re.start.downX;
  const deltaU = Math.floor(project.viewport.pxTo(deltaX, targetClip.timelineLength.unit));
  const snap = e.metaKey ? !project.snapToGrid.get() : project.snapToGrid.get();

  if (targetClip instanceof MidiClip) {
    throw new Error("MidiClip unimplemented2");
  }

  if (targetClip instanceof AudioClip) {
    const originalClipLengthSecs = re.original.len.secs(project);
    const newLength = clamp(
      // zero length is minimum
      0,
      re.original.len.secs(project) - deltaU,
      // since trimming from start, max is going back all the way to zero
      originalClipLengthSecs + re.original.bufferOffset.secs(project),
    );

    const effectiveChange = originalClipLengthSecs - newLength;

    const newTimelineStartSec = re.original.start.secs(project) + effectiveChange;
    const newBufferOffset = re.original.bufferOffset.secs(project) + effectiveChange;
    clipResizeStartSec(targetClip, newLength, newBufferOffset, newTimelineStartSec, project, snap);
  }
}

function resizeUp(e: PointerEvent, re: ClipEditEvent) {
  // TODO: delete time within clip (ie, clear overlapping clip time)
}
