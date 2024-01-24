import { scaleLinear } from "d3-scale";
import React, { useCallback, useRef } from "react";
import { createUseStyles } from "react-jss";
import { history, usePrimitive } from "structured-state";
import { modifierState } from "../ModifierState";
import { CLIP_HEIGHT } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import type { AudioClip } from "../lib/AudioClip";
import type { AudioTrack } from "../lib/AudioTrack";
import type { AudioProject, XScale } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { exhaustive } from "../utils/exhaustive";
import { useEventListener } from "./useEventListener";
import { secs } from "../lib/AbstractClip";
// import { dataWaveformToCanvas } from "../lib/waveformAsync";

export function ClipA({
  clip,
  isSelected,
  style = {},
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
  const styles = useStyles();
  const headerRef = useRef<HTMLDivElement>(null);
  const width = project.viewport.secsToPx(clip.clipLengthSec);
  const totalBufferWidth = project.viewport.secsToPx(clip.bufferLength);
  const startTrimmedWidth = project.viewport.secsToPx(clip.trimStartSec);
  const [tool] = useLinkedState(project.pointerTool);
  const height = CLIP_HEIGHT - 3; // to clear the bottom track separator gridlines
  // const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [name] = usePrimitive(clip.name);

  useSubscribeToSubbableMutationHashable(clip);

  function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") {
    e.stopPropagation();
    if (tool !== "move") {
      return;
    }

    pressedState.set({
      status: "resizing_clip",
      clip,
      // IDEA: just clone and have the original clip at hand
      originalClipLength: clip.clipLengthSec,
      originalClipTimelineStartSec: clip.timelineStartSec,
      originalBufferOffset: clip.bufferOffset,
      originalTimelineStartSec: clip.timelineStartSec,
      // originalClipEndPosSec: clip.trimEndSec,
      // originalClipStartPosSec: clip.trimStartSec,
      // originalClipOffsetSec: clip.timelineStartSec,
      from,
      clientX: e.clientX,
      clientY: e.clientY,
      inHistory: false,
    });
  }

  useEventListener(
    "mousedown",
    headerRef,
    useCallback(
      function onMouseDownToMove(e: MouseEvent) {
        if (tool !== "move" || track == null) {
          return;
        }

        if (!editable) {
          return;
        }

        pressedState.set({
          status: "moving_clip",
          clientX: e.clientX,
          clientY: e.clientY,
          clip,
          track,
          originalTrack: track,
          originalClipStartOffsetSec: clip.timelineStartSec,
          originalClipEndOffsetSec: clip.timelineEndSec,
          inHistory: false,
        });

        project.selected.setDyn((prev) => {
          const selectAdd = modifierState.meta || modifierState.shift;
          if (selectAdd && prev !== null && prev.status === "clips") {
            prev.clips.push({ clip, track });
            prev.test.add(clip);
            prev.test.add(track);
            return { ...prev };
          } else {
            return {
              status: "clips",
              clips: [{ clip, track }],
              test: new Set([clip, track]),
            };
          }
        });

        project.selectionWidth.set(null);
      },
      [clip, editable, project.selected, project.selectionWidth, tool, track],
    ),
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
        const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
        const secFromStartOfClip = project.viewport.pxToSecs(pxFromStartOfClip);
        const secFromTimelineStart = clip.timelineStartSec + secFromStartOfClip;
        track.splitClip(project, clip, secFromTimelineStart);
        break;
      case "trimStart": {
        const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
        const asSec = project.viewport.pxToSecs(pxFromStartOfClip);
        project.cursorPos.set(clip.timelineStartSec + asSec);
        void history.record(() => {
          clip.trimStartAddingTime(asSec);
        });
        break;
      }
      case "trimEnd": {
        const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
        const secsFromStartPos = project.viewport.pxToSecs(pxFromStartOfClip);
        clip.clipLengthSec = secs(secsFromStartPos);
        clip._notifyChange();
        break;
      }
      default:
        exhaustive(tool);
    }
  }

  const border = isSelected ? "1px solid var(--clip-border-selected)" : "1px solid var(--clip-header)";
  const backgroundImageData = clip.getWaveformDataURL(
    // totalBufferWidth,
    1000,
    CLIP_HEIGHT,
  );

  return (
    <div
      onClick={onClipClick}
      style={{
        backgroundColor: "var(--clip-color)",
        backgroundSize: `${totalBufferWidth}px ${height - 10}px`,
        backgroundImage: "url('" + backgroundImageData + "')",
        backgroundPosition: `${startTrimmedWidth * -1}px center`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        width: width,
        height: "100%",
        userSelect: "none",
        border: border,
        boxSizing: "border-box",
        color: "white",
        pointerEvents: editable ? "all" : "none",
        display: "flex",
        flexDirection: "column",
        position: "absolute",
        left: project.viewport.secsToPx(clip.timelineStartSec),
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
        {clip.toString()}
      </div>
      {editable && <div className={styles.resizerStart} onMouseDownCapture={(e) => onMouseDownToResize(e, "start")} />}
      {editable && <div className={styles.resizerEnd} onMouseDownCapture={(e) => onMouseDownToResize(e, "end")} />}
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
});
