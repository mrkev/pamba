import { scaleLinear } from "d3-scale";
import React, { useCallback } from "react";
import { history, useContainer } from "structured-state";
import { CLIP_HEIGHT } from "../constants";
import type { AudioClip } from "../lib/AudioClip";
import type { AudioTrack } from "../lib/AudioTrack";
import { ProjectTrack } from "../lib/ProjectTrack";
import type { AudioProject, XScale } from "../lib/project/AudioProject";
import { exhaustive } from "../utils/exhaustive";
import { ClipS } from "./ClipS";
import { clipMouseDownToMove, clipMouseDownToResize } from "./clipMouse";
import { transferAudioClip } from "./dragdrop/transferObject";
import { emptyImg } from "../utils/emptyImg";
import { pressedState } from "../pressedState";

export function ClipA({
  clip,
  isSelected,
  project,
  track,
  editable = true,
  style,
}: {
  clip: AudioClip;
  isSelected: boolean;
  style?: React.CSSProperties;
  project: AudioProject;
  track: AudioTrack | null; // null if clip is being rendered for move
  editable?: boolean;
}) {
  const totalBufferWidth = project.viewport.secsToPx(clip.bufferLength);
  const bufferOffsetPx = project.viewport.secsToPx(clip.bufferOffset.secs(project));
  const height = CLIP_HEIGHT - 3; // to clear the bottom track separator gridlines
  const tStart = useContainer(clip.timelineStart);
  const tLen = useContainer(clip.timelineLength);

  useContainer(clip);

  function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") {
    const tool = project.pointerTool.get();
    if (tool !== "move" || !editable || track == null) {
      return;
    }
    clipMouseDownToResize(e, { kind: "audio", clip, track }, from);
  }

  const onMouseDownToMove = useCallback(
    function (e: MouseEvent) {
      const tool = project.pointerTool.get();
      if (tool !== "move" || !editable || track == null) {
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
          const secFromStartOfClip = project.viewport.pxToSecs(pxFromStartOfClip);
          const secFromTimelineStart = tStart.secs(project) + secFromStartOfClip;
          ProjectTrack.splitClip(project, track, clip, secFromTimelineStart);
        });
        break;
      case "trimStart": {
        const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
        const asSec = project.viewport.pxToSecs(pxFromStartOfClip);
        project.cursorPos.set(tStart.secs(project) + asSec);

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
            const secsFromStartPos = project.viewport.pxToSecs(pxFromStartOfClip);
            clip.timelineLength.set(secsFromStartPos, "seconds");
          });
        });
        break;
      }
      default:
        exhaustive(tool);
    }
  }

  const backgroundImageData = clip.getWaveformDataURL(
    // totalBufferWidth,
    1000,
    CLIP_HEIGHT,
  );

  const onDragStart = useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      const tool = project.pointerTool.get();
      if (tool !== "move" || !editable || track == null || ev.button !== 0) {
        // todo; how to acutally prevent drag
        return;
      }

      ev.dataTransfer.setDragImage(emptyImg, 0, 0);
      ev.dataTransfer.effectAllowed = "all";

      project.selectionWidth.set(null);

      const clips = new Map();
      clips.set(clip._id, clip);
      transferAudioClip(
        ev.dataTransfer,
        {
          kind: "audioclipinstance",
          id: clip._id,
        },
        {
          kind: "application/pamba.audioclipinstance",
          status: "dragging_transferable_clip",
          clientX: ev.clientX,
          clientY: ev.clientY,
          originalClipStart: clip.timelineStart.clone(),
          clipForRendering: clip.clone(),
          clips,
          originalTrack: track,
        },
      );

      // const clipForRendering = clip.clone();
      // pressedState.set({
      //   status: "moving_clip",
      //   clientX: ev.clientX,
      //   clientY: ev.clientY,
      //   clip,
      //   track,
      //   originalTrack: track,
      //   originalClipStart: clip.timelineStart.clone(),
      //   clipForRendering,
      //   inHistory: false,
      // });

      // project.selected.setDyn((prev) => {
      //   const selectAdd = modifierState.meta || modifierState.shift;
      //   if (selectAdd && prev !== null && prev.status === "clips") {
      //     if (!prev.test.has(clip)) {
      //       prev.clips.push({ kind: "audio", clip, track });
      //       prev.test.add(clip);
      //       prev.test.add(track);
      //     }
      //     return { ...prev };
      //   } else {
      //     return {
      //       status: "clips",
      //       clips: [{ kind: "audio", clip, track }],
      //       test: new Set([clip, track]),
      //     };
      //   }
      // });
    },
    [clip, editable, project.pointerTool, project.selectionWidth, track],
  );

  const width = project.viewport.secsToPx(tLen.secs(project));
  const left = project.viewport.secsToPx(tStart.secs(project));
  return (
    <ClipS
      onDragStart={onDragStart}
      onDragEnd={() => {
        pressedState.set(null);
      }}
      // onDrag={() => {
      //   console.log("DRAG");
      // }}
      editable={editable}
      clip={clip}
      isSelected={isSelected}
      onMouseDownToResize={onMouseDownToResize}
      onMouseDownToMove={onMouseDownToMove}
      onClipClick={onClipClick}
      width={width}
      left={left}
      style={{
        backgroundSize: `${totalBufferWidth}px ${height - 10}px`,
        backgroundImage: "url('" + backgroundImageData + "')",
        backgroundPosition: `${bufferOffsetPx * -1}px center`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        ...style,
      }}
    ></ClipS>
  );
}

// TODO: use this for DSP effects automation, but treat track gain as a "special"
// gain that's automatable with fade-in, fade-out faders only? Ie, if I end up
// showing it in the DSP chain, instead of showing the track header as a "utility"
// effect with gain, mute, etc. show it as a "header utility" with "track gain",
// mute, etc? That or generalize the special fade-in UI to any automation,
// except the cool thing about the UI is you can't go past max=1
function _ClipAutomation({ clip, secsToPx }: { clip: AudioClip; secsToPx: XScale }) {
  const MAX_GAIN = 2;
  const MIN_GAIN = 0;

  const valToPcnt = (val: number) => {
    const scale = scaleLinear().domain([MIN_GAIN, MAX_GAIN]).range([0, 100]) as XScale;

    return `${scale(val)}%`;
  };

  return (
    <svg>
      {clip.gainAutomation.map(({ time, value }, i) => {
        const [x1, y1] = [secsToPx(time), valToPcnt(value)];
        const { time: time2, value: value2 } = clip.gainAutomation[i + 1] || {
          time: 0, // TODO
          value,
        };
        const [x2, y2] = [secsToPx(time2), valToPcnt(value2)];

        return (
          <React.Fragment key={`point-line-${i}`}>
            <circle style={{ fill: "red", stroke: "red" }} cx={x1} cy={y1} r={4}></circle>
            <line x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: "red", strokeWidth: "2px" }} />
          </React.Fragment>
        );
      })}
    </svg>
  );
}
