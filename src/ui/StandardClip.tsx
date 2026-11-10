import React, { useCallback, useMemo, useRef } from "react";
import { createUseStyles } from "react-jss";
import { history, useContainer, usePrimitive } from "structured-state";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { ClipEdgesOriginal, clipResizeEndTarget, clipResizeStartTarget } from "../lib/clipMoveSec";
import { AudioProject, audioProject } from "../lib/project/AudioProject";
import { cliptrack } from "../lib/project/ClipTrack";
import { standardTrack } from "../lib/StandardTrack";
import { shouldSnap } from "../lib/viewport/snap";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { cn } from "../utils/cn";
import { useEventListener } from "./useEventListener";
import { PointerPressMeta, usePointerEditing } from "./usePointerPressMove";

/** Standard component renderer for clips on the timeline */
export function StandardClip({
  clip,
  track,
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
  track: AudioTrack | MidiTrack | null; // null if clip is being rendered for move
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
  const left = project.viewport.timeToPx(timelienStart, "pos") + 0.5;
  const width = project.viewport.timeToPx(timelineLength, "len") - 0.5;
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
  const target = useMemo(() => ({ clip, project, track }), [clip, project, track]);

  const isResizingEnd = usePointerEditing(resizerEndRef, originalCb, {
    down: useCallback((e: PointerEvent, original: ClipEditOriginal) => resizeDown(e, { target, original }), [target]),
    up: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: ClipEditOriginal) =>
        resizeEndUp(e, { start, target, original }),
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
        resizeStartUp(e, { start, target, original }),
      [target],
    ),
    move: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: ClipEditOriginal) =>
        resizeStartMove(e, { start, target, original }),
      [target],
    ),
  });

  const showResizers =
    (editable && track != null && tool == "move" && width > 10) || isResizingEnd || isResizingStart;
  // MIDI clips can't trim their start yet: they have no content offset, so it'd shift their notes.
  const showStartResizer = showResizers && !(clip instanceof MidiClip);

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
      tabIndex={0}
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
          minHeight: "1.8ch",
        }}
      >
        {name}
      </div>
      <div className="grow" style={contentStyle}></div>
      {showStartResizer && (
        <div
          ref={resizerStartRef}
          className={cn("absolute top-0 h-full cursor-ew-resize bg-black/0", styles.resizerStart)}
        />
      )}
      {showResizers && (
        <div
          ref={resizerEndRef}
          className={cn("absolute top-0 h-full cursor-ew-resize bg-black/0", styles.resizerEnd)}
        />
      )}
      {children}
    </div>
  );
}

const useStyles = createUseStyles({
  resizerEnd: {
    // background: "black",
    width: 10,
    right: -5,
  },
  resizerStart: {
    // background: "black",
    width: 10,
    left: -5,
  },
});

/** EVENTS */

type ClipEditOriginal = ClipEdgesOriginal & { editable: boolean };
type ClipEditTarget = {
  project: AudioProject;
  clip: AudioClip | MidiClip;
  track: AudioTrack | MidiTrack | null;
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
// While dragging, the clip itself follows the pointer (so audio tracks play the new edge live).
// On release we put the clip back and redo the change through standardTrack inside
// history.record, so undo captures the original -> final change and neighbors get trimmed.

function resizeDown(e: PointerEvent, re: ClipEditStartEvent) {
  // so it doesn't reach the clip or timeline body
  e.stopPropagation();
  e.preventDefault();

  const { project, track } = re.target;
  const tool = project.pointerTool.get();
  if (tool !== "move" || !re.original.editable || track == null || !audioProject.canEditTrack(project, track)) {
    return "abort";
  }
}

/** Pointer movement since the press, in the clip's unit. */
function dragDeltaU(e: PointerEvent, re: ClipEditEvent) {
  const { project, clip } = re.target;
  return project.viewport.pxTo(e.clientX - re.start.downX, clip.timelineLength.unit, "len");
}

function restoreEdges(clip: AudioClip | MidiClip, original: ClipEdgesOriginal) {
  clip.featuredMutation(() => {
    clip.timelineStart.set(original.start);
    clip.timelineLength.set(original.len);
    clip.bufferOffset.set(original.bufferOffset);
  });
}

function resizeEndMove(e: PointerEvent, re: ClipEditEvent) {
  const { project, clip } = re.target;
  const len = clipResizeEndTarget(project, clip, re.original, dragDeltaU(e, re), shouldSnap(project, e));
  clip.timelineLength.set(len, clip.timelineLength.unit);
}

function resizeEndUp(e: PointerEvent, re: ClipEditEvent) {
  const { project, clip, track } = re.target;
  const unit = clip.timelineLength.unit;
  const len = clipResizeEndTarget(project, clip, re.original, dragDeltaU(e, re), shouldSnap(project, e));
  restoreEdges(clip, re.original);
  if (track == null || len === re.original.len.asUnit(unit, project)) {
    return;
  }

  history.record("resize clip", () => {
    const ct = cliptrack(clip, track);
    if (ct.kind === "midi") {
      standardTrack.setClipLength(project, ct.track, ct.clip, len, unit);
    } else {
      standardTrack.setClipLength(project, ct.track, ct.clip, len, unit);
    }
  });
}

function resizeStartMove(e: PointerEvent, re: ClipEditEvent) {
  const { project, clip } = re.target;
  const start = clipResizeStartTarget(project, clip, re.original, dragDeltaU(e, re), shouldSnap(project, e));
  // Trims relative to wherever the last move left the clip; the commit starts from the original.
  clip.trimStartToTimelineU(start);
}

function resizeStartUp(e: PointerEvent, re: ClipEditEvent) {
  const { project, clip, track } = re.target;
  const unit = clip.timelineStart.unit;
  const start = clipResizeStartTarget(project, clip, re.original, dragDeltaU(e, re), shouldSnap(project, e));
  restoreEdges(clip, re.original);
  // MIDI clips don't support trimming their start yet (their start handle isn't shown)
  if (track == null || !(clip instanceof AudioClip) || !(track instanceof AudioTrack)) {
    return;
  }
  if (start === re.original.start.asUnit(unit, project)) {
    return;
  }

  history.record("trim clip start", () => {
    standardTrack.setClipStart(project, track, clip, start, unit);
  });
}
