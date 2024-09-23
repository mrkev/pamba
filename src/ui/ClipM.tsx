import React, { useCallback } from "react";
import { useContainer } from "structured-state";
import type { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { StandardClip } from "./StandardClip";
import { clipMouseDownToMove, clipMouseDownToResize } from "./clipMouse";

export function ClipM({
  clip,
  isSelected,
  project,
  track,
  editable = true,
}: {
  clip: MidiClip;
  isSelected: boolean;
  project: AudioProject;
  track: MidiTrack | null; // null if clip is being rendered for move
  editable?: boolean;
}) {
  const notes = useContainer(clip.notes);
  // const startTrimmedWidth = project.viewport.secsToPx(clip.trimStartSec);
  const [tool] = useLinkedState(project.pointerTool);
  const width = project.viewport.pulsesToPx(clip.timelineLength.ensurePulses());
  const left = Math.floor(project.viewport.pulsesToPx(clip.startOffsetPulses));

  // const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useSubscribeToSubbableMutationHashable(clip);

  const onMouseDownToResize = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") => {
      const tool = project.pointerTool.get();
      if (tool !== "move" || !editable || track == null) {
        return;
      }
      clipMouseDownToResize(e, { kind: "midi", clip, track }, from);
    },
    [clip, editable, project.pointerTool, track],
  );

  const onMouseDownToMove = useCallback(
    (e: MouseEvent) => {
      const tool = project.pointerTool.get();
      if (tool !== "move" || !editable || track == null) {
        return;
      }
      clipMouseDownToMove(e, { kind: "midi", clip, track }, project);
    },
    [clip, editable, project, track],
  );

  const onClipClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const div = e.currentTarget;
    if (!(div instanceof HTMLDivElement)) {
      return;
    }
    // if (tool === "trimStart") {
    //   const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
    //   const asSec = project.viewport.pxToSecs(pxFromStartOfClip);
    //   clip.trimStartSec += asSec;
    //   clip.startOffsetSec += asSec;
    //   clip.notifyUpdate();
    // }
    // if (tool === "trimEnd") {
    //   const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
    //   const secsFromStartPos = project.viewport.pxToSecs(pxFromStartOfClip);
    //   const secsFromZero = clip.trimStartSec + secsFromStartPos;
    //   clip.trimEndSec = secsFromZero;
    //   clip.notifyUpdate();
    // }
  }, []);

  return (
    <StandardClip
      clip={clip}
      editable={editable}
      isSelected={isSelected}
      onMouseDownToResize={onMouseDownToResize}
      onMouseDownToMove={onMouseDownToMove}
      onClipClick={onClipClick}
      width={width}
      left={left}
      style={{}}
    >
      {notes.length}
    </StandardClip>
  );
}
