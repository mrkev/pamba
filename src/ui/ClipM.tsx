import React, { useCallback } from "react";
import type { AudioProject } from "../lib/project/AudioProject";
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
  // const timelienStart = useContainer(clip.timelineStart);
  // const timelineLength = useContainer(clip.timelineLength);
  // const width = project.viewport.pulsesToPx(timelineLength.pulses(project));
  // const left = Math.floor(project.viewport.pulsesToPx(timelienStart.pulses(project)));

  const onMouseDownToResize = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") => {
      const tool = project.pointerTool.get();
      if (tool !== "move" || !editable || track == null) {
        return;
      }
      console.log("MOUSE DOWN TO RESIZE");
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

  const [backgroundImageData, imgHeight] = clip.buffer.getMidiDataURL(
    // totalBufferWidth,
    1000,
  );

  const totalBufferWidth = project.viewport.secsToPx(clip.buffer.timelineLength.secs(project));
  // const height = CLIP_HEIGHT - 3; // to clear the bottom track separator gridlines
  const bufferOffsetPx = 0; //  project.viewport.secsToPx(clip.bufferOffset);

  return (
    <StandardClip
      clip={clip}
      editable={editable}
      isSelected={isSelected}
      onMouseDownToResize={onMouseDownToResize}
      onMouseDownToMove={onMouseDownToMove}
      onClipClick={onClipClick}
      contentStyle={{
        backgroundSize: `${totalBufferWidth}px min(100%, ${imgHeight * 5}px)`,
        backgroundImage: "url('" + backgroundImageData + "')",
        backgroundPosition: `${bufferOffsetPx * -1}px center`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    ></StandardClip>
  );
}
