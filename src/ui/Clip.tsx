import React, { useRef } from "react";
import { css } from "@linaria/core";
import { scaleLinear } from "d3-scale";
import { CLIP_HEIGHT } from "../globals";
import type AudioClip from "../lib/AudioClip";
import type { AudioProject, Tool, XScale } from "../lib/AudioProject";
import type { AudioTrack } from "../lib/AudioTrack";
import { pressedState } from "../pressedState";
import { useDerivedState } from "../lib/state/DerivedState";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { modifierState } from "../ModifierState";
// import { dataWaveformToCanvas } from "../lib/waveformAsync";

type Props = {
  clip: AudioClip;
  tool: Tool;
  rerender: () => void;
  isSelected: boolean;
  style?: React.CSSProperties;
  project: AudioProject;
  track: AudioTrack | null; // null if clip is being rendered for move
};

const styles = {
  resizerEnd: css`
    ${{
      width: 10,
      background: "rgba(0,0,0,0)",
      height: "100%",
      position: "absolute",
      right: -5,
      top: 0,
      cursor: "ew-resize",
    }}
  `,
  resizerStart: css`
    ${{
      width: 10,
      background: "rgba(0,0,0,0)",
      height: "100%",
      position: "absolute",
      left: -5,
      top: 0,
      cursor: "ew-resize",
    }}
  `,
};

export function Clip({ clip, tool, rerender, isSelected, style = {}, project, track }: Props) {
  const secsToPx = useDerivedState(project.secsToPx);
  const pxToSecs = secsToPx.invert;
  const width = secsToPx(clip.durationSec);
  const totalBufferWidth = secsToPx(clip.lengthSec);
  const startTrimmedWidth = secsToPx(clip.trimStartSec);
  const height = CLIP_HEIGHT - 3; // to clear the bottom track separator gridlines
  const [, setPressed] = useLinkedState(pressedState);
  const [, setSelectionWidth] = useLinkedState(project.selectionWidth);
  const [, setSelected] = useLinkedState(project.selected);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useSubscribeToSubbableMutationHashable(clip, () => {
    rerender();
  });

  function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") {
    e.stopPropagation();
    if (tool !== "move") {
      return;
    }
    setPressed({
      status: "resizing_clip",
      clip,
      // IDEA: just clone and have the original clip at hand
      originalClipEndPosSec: clip.trimEndSec,
      originalClipStartPosSec: clip.trimStartSec,
      originalClipOffsetSec: clip.startOffsetSec,
      from,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  }

  function onMouseDownToMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    e.stopPropagation();
    if (tool !== "move" || track == null) {
      return;
    }
    setPressed({
      status: "moving_clip",
      clientX: e.clientX,
      clientY: e.clientY,
      clip,
      track,
      originalTrack: track,
      originalClipOffsetSec: clip.startOffsetSec,
    });
    setSelected((prev) => {
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
    setSelectionWidth(null);
  }

  function onClipClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const div = e.currentTarget;
    if (!(div instanceof HTMLDivElement)) {
      return;
    }
    if (tool === "trimStart") {
      const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
      const asSec = pxToSecs(pxFromStartOfClip);
      clip.trimStartSec += asSec;
      clip.startOffsetSec += asSec;
      clip.notifyUpdate();
    }
    if (tool === "trimEnd") {
      const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
      const secsFromStartPos = pxToSecs(pxFromStartOfClip);
      const secsFromZero = clip.trimStartSec + secsFromStartPos;
      clip.trimEndSec = secsFromZero;
      clip.notifyUpdate();
    }
  }

  const border = isSelected ? "1px solid #114411" : "1px solid #aaddaa";
  const backgroundImageData = clip.getWaveformDataURL(
    // totalBufferWidth,
    1000,
    CLIP_HEIGHT
  );

  return (
    <div
      onClick={onClipClick}
      style={{
        backgroundColor: "#ccffcc",
        //  -10 to clear the header a little better
        backgroundSize: `${totalBufferWidth}px ${height - 10}px`,
        backgroundImage: "url('" + backgroundImageData + "')",
        backgroundPosition: `${startTrimmedWidth * -1}px center`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        width,
        height: "100%",
        // pointerEvents: 'none',
        userSelect: "none",
        borderLeft: border,
        borderRight: border,
        color: "white",
        pointerEvents: "all",
        display: "flex",
        flexDirection: "column",
        position: "absolute",
        left: secsToPx(clip.startOffsetSec),
        ...style,
      }}
    >
      <div
        onMouseDown={onMouseDownToMove}
        style={{
          color: isSelected ? "white" : "black",
          background: isSelected ? "#225522" : "#bbeebb",
          border: border,
          opacity: 0.8,
          fontSize: 10,
          whiteSpace: "nowrap",
          overflow: "hidden",
          flexShrink: 0,
          paddingBottom: "0px 0px 1px 0px",
        }}
      >
        {clip.name} ({Math.round(clip.durationSec * 100) / 100})
      </div>
      <div className={styles.resizerStart} onMouseDown={(e) => onMouseDownToResize(e, "start")}></div>
      <div className={styles.resizerEnd} onMouseDown={(e) => onMouseDownToResize(e, "end")}></div>
      <canvas ref={canvasRef}></canvas>
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
          time: clip.trimEndSec,
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
