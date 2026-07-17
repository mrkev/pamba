import React, { useCallback } from "react";
import { history, useContainer, usePrimitive } from "structured-state";
import { TRACK_HEIGHT } from "../constants";
import { audioClip, type AudioClip } from "../lib/AudioClip";
import type { AudioTrack } from "../lib/AudioTrack";
import { standardTrack } from "../lib/StandardTrack";
import type { AudioProject } from "../lib/project/AudioProject";
import { standardViewport } from "../lib/viewport/StandardViewport";
import { exhaustive } from "../utils/exhaustive";
import { StandardClip } from "./StandardClip";
import { clipMouseDownToMove } from "./clipMouse";

export const ClipA = React.memo(function ClipAImpl({
  clip,
  isSelected,
  project,
  track,
  editable = true,
}: {
  clip: AudioClip;
  isSelected: boolean;
  style?: React.CSSProperties;
  project: AudioProject;
  track: AudioTrack | null; // null if clip is being rendered for move
  editable?: boolean;
}) {
  // len, since the buffer shouldn't be affected by the timelines left margin offset
  const bufferOffsetPx = project.viewport.timeToPx(clip.bufferOffset, "len");

  const timelineStart = useContainer(clip.timelineStart);
  const timelineLength = useContainer(clip.timelineLength);

  const onMouseDownToMove = useCallback(
    function (e: MouseEvent) {
      console.log("MOUSE DOWN TO MOVE");
      const tool = project.pointerTool.get();
      if (tool !== "move" || !editable || track == null) {
        console.log("move", tool !== "move", !editable, track == null);
        return;
      }
      clipMouseDownToMove(e, { kind: "audio", clip, track }, project);
    },
    [clip, editable, project, track],
  );

  function onClipClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (!editable || track == null) {
      return;
    }

    const tool = project.pointerTool.get();
    const div = e.currentTarget;
    if (!(div instanceof HTMLDivElement)) {
      return;
    }

    switch (tool) {
      case "move":
        break;
      case "slice":
        history.record("slice clip", () => {
          const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
          const secFromStartOfClip = standardViewport.pxToSecs(project.viewport, pxFromStartOfClip, "pos");
          const secFromTimelineStart = timelineStart.secs(project) + secFromStartOfClip;
          standardTrack.splitClip(project, track, clip, secFromTimelineStart);
        });
        break;
      case "trimStart": {
        const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
        const asSec = standardViewport.pxToSecs(project.viewport, pxFromStartOfClip, "pos");
        project.cursorPos.set(timelineStart.secs(project) + asSec);

        history.record("trim start of clip", () => {
          const timelineStartSec = clip.timelineStart.ensureSecs();
          const clipLengthSec = clip.timelineLength.ensureSecs();

          clip.featuredMutation(() => {
            clip.timelineStart.set(timelineStartSec + asSec, "seconds");
            clip.timelineLength.set(clipLengthSec - asSec, "seconds");
            clip.bufferOffset.set(clip.bufferOffset.ensureSecs() + asSec, "seconds");
          });
        });
        break;
      }
      case "trimEnd": {
        history.record("trip end of clip", () => {
          clip.featuredMutation(() => {
            const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
            const secsFromStartPos = standardViewport.pxToSecs(project.viewport, pxFromStartOfClip, "pos");
            clip.timelineLength.set(secsFromStartPos, "seconds");
          });
        });
        break;
      }
      default:
        exhaustive(tool);
    }
  }

  const [scale] = usePrimitive(project.viewport.pxPerSecond); // need to subscribe to this

  const totalBufferWidth = standardViewport.secsToPx(project.viewport, clip.getBufferLength(), "len");

  const backgroundImageData = audioClip.getWaveformDataURL(
    clip,
    Math.max(totalBufferWidth / 10, 10_000),
    TRACK_HEIGHT,
    // idt I can use css variables here
    "#103310",
  );

  return (
    <StandardClip
      editable={editable}
      clip={clip}
      isSelected={isSelected}
      onMouseDownToMove={onMouseDownToMove}
      onClipClick={onClipClick}
      contentStyle={{
        backgroundSize: `${totalBufferWidth}px 100%`,
        backgroundImage: "url('" + backgroundImageData + "')",
        backgroundPosition: `${bufferOffsetPx * -1}px center`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    ></StandardClip>
  );
});
