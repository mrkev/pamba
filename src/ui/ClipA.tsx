import { scaleLinear } from "d3-scale";
import React, { useCallback, useRef } from "react";
import { history, useContainer } from "structured-state";
import { modifierState } from "../ModifierState";
import { CLIP_HEIGHT } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import type { AudioClip } from "../lib/AudioClip";
import type { AudioTrack } from "../lib/AudioTrack";
import { ProjectTrack } from "../lib/ProjectTrack";
import type { AudioProject, XScale } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { exhaustive } from "../utils/exhaustive";
import { StandardClip } from "./StandardClip";
import { useEventListener } from "./useEventListener";
import { Seconds } from "../lib/AbstractClip";
// import { dataWaveformToCanvas } from "../lib/waveformAsync";

export function ClipA({
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
  const headerRef = useRef<HTMLDivElement>(null);
  // const width = project.viewport.secsToPx(clip.clipLengthSec);
  // const left = project.viewport.secsToPx(clip.timelineStartSec);
  const totalBufferWidth = project.viewport.secsToPx(clip.bufferLength);
  const bufferOffsetPx = project.viewport.secsToPx(clip.bufferOffset);
  const [tool] = useLinkedState(project.pointerTool);
  const height = CLIP_HEIGHT - 3; // to clear the bottom track separator gridlines

  const tStart = useContainer(clip.timelineStart);
  const tLen = useContainer(clip.timelineLength);

  useSubscribeToSubbableMutationHashable(clip);

  function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") {
    e.stopPropagation();
    if (tool !== "move" || track == null) {
      return;
    }

    pressedState.set({
      status: "resizing_clip",
      clip,
      originalBufferOffset: clip.bufferOffset,
      originalClipStart: clip.timelineStart.clone(),
      originalClipLength: clip.timelineLength.clone(),
      from,
      clientX: e.clientX,
      clientY: e.clientY,
      inHistory: false,
      track,
    });
  }

  const onMouseDownToMove = useCallback(
    function (e: MouseEvent) {
      if (tool !== "move" || track == null) {
        return;
      }

      if (!editable) {
        return;
      }

      if (e.button !== 0) {
        return;
      }

      pressedState.set({
        status: "moving_clip",
        clientX: e.clientX,
        clientY: e.clientY,
        clip,
        track,
        originalTrack: track,
        originalClipStart: clip.timelineStart.clone(),
        inHistory: false,
      });

      project.selected.setDyn((prev) => {
        const selectAdd = modifierState.meta || modifierState.shift;
        if (selectAdd && prev !== null && prev.status === "clips") {
          prev.clips.push({ kind: "audio", clip, track });
          prev.test.add(clip);
          prev.test.add(track);
          return { ...prev };
        } else {
          return {
            status: "clips",
            clips: [{ kind: "audio", clip, track }],
            test: new Set([clip, track]),
          };
        }
      });

      project.selectionWidth.set(null);
    },
    [clip, editable, project.selected, project.selectionWidth, tool, track],
  );

  useEventListener(
    "dblclick",
    headerRef,
    useCallback(() => {
      appEnvironment.activeBottomPanel.set("editor");
    }, []),
  );

  function onClipClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const div = e.currentTarget;
    if (!(div instanceof HTMLDivElement)) {
      return;
    }
    if (!editable || track == null) {
      return;
    }

    switch (tool) {
      case "move":
        break;
      case "slice": // TODO: BROKEN
        history.record(() => {
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

        void history.record(() => {
          const timelineStartSec = clip.timelineStart.ensureSecs();
          const clipLengthSec = clip.timelineLength.ensureSecs();

          clip.featuredMutation(() => {
            clip.timelineStart.set(timelineStartSec + asSec, "seconds");
            clip.timelineLength.set(clipLengthSec - asSec, "seconds");
            clip.bufferOffset = (clip.bufferOffset + asSec) as Seconds;
          });
        });
        break;
      }
      case "trimEnd": {
        const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
        const secsFromStartPos = project.viewport.pxToSecs(pxFromStartOfClip);
        clip.timelineLength.set(secsFromStartPos, "seconds");
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

  const width = project.viewport.secsToPx(tLen.secs(project));
  const left = project.viewport.secsToPx(tStart.secs(project));
  return (
    <StandardClip
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
      }}
    ></StandardClip>
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
    <svg style={{}}>
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
