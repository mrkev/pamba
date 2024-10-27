import { scaleLinear } from "d3-scale";
import React, { useCallback, useEffect, useRef } from "react";
import { history, useContainer, usePrimitive } from "structured-state";
import { GPUWaveformRenderer } from "webgpu-waveform";
import { CLIP_HEIGHT } from "../constants";
import type { AudioClip } from "../lib/AudioClip";
import type { AudioTrack } from "../lib/AudioTrack";
import { ProjectTrack } from "../lib/ProjectTrack";
import type { AudioProject, XScale } from "../lib/project/AudioProject";
import { exhaustive } from "../utils/exhaustive";
import { relu } from "../utils/math";
import { nullthrows } from "../utils/nullthrows";
import { StandardClip } from "./StandardClip";
import { clipMouseDownToMove, clipMouseDownToResize } from "./clipMouse";

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
  const totalBufferWidth = project.viewport.secsToPx(clip.bufferLength);
  const bufferOffsetPx = project.viewport.secsToPx(clip.bufferOffset.secs(project));
  const height = CLIP_HEIGHT - 3; // to clear the bottom track separator gridlines
  const tStart = useContainer(clip.timelineStart);
  const tLen = useContainer(clip.timelineLength);
  const bufferOffset = useContainer(clip.bufferOffset);

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
    2_000,
    CLIP_HEIGHT,
  );

  const width = project.viewport.secsToPx(tLen.secs(project));
  const left = project.viewport.secsToPx(tStart.secs(project));

  const [projectDivWidth] = usePrimitive(project.viewport.projectDivWidth);
  const [viewportStartPx] = usePrimitive(project.viewport.viewportStartPx);
  const [scale] = usePrimitive(project.viewport.scaleFactor);

  const canvasOffset = relu(viewportStartPx - project.viewport.pxOfTime(tStart));
  const cWidth = width - relu(left + width - projectDivWidth) + viewportStartPx - canvasOffset;
  const canvasWidth = Math.ceil(Math.min(cWidth, width - canvasOffset));
  const offset =
    project.viewport.pxToSecs(canvasOffset) * clip.sampleRate + bufferOffset.ensureSecs() * clip.sampleRate;

  return (
    <StandardClip
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
      }}
    >
      {/* {clip.buffer != null && canvasWidth > 0 && (
        <GPUWaveform
          color="#122411"
          renderer={clip.buffer.renderer}
          scale={(1 / scale) * clip.sampleRate}
          offset={offset}
          width={canvasWidth}
          height={height}
          style={{
            // border: "2px solid red",
            pointerEvents: "none",
            userSelect: "none",
            position: "relative",
            left: canvasOffset - 1, // -1 due to clip border
            boxSizing: "border-box",
            height: height,
            width: canvasWidth,
            flexGrow: 1,
            imageRendering: "pixelated",
          }}
        ></GPUWaveform>
      )} */}
    </StandardClip>
  );
});

function GPUWaveform({
  scale,
  renderer,
  offset = 0,
  color = "#00FF00",
  style,
  ...props
}: React.CanvasHTMLAttributes<HTMLCanvasElement> & {
  scale: number;
  offset?: number;
  color?: string;
  renderer: GPUWaveformRenderer;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = nullthrows(nullthrows(canvasRef.current).getContext("webgpu"), "nil webgpu context");
    renderer.render(context, scale, offset, 1, 1, color);
    // renderer.render(context, s, offset, width, height, color);
  }, [color, offset, renderer, scale, style?.width]);

  return <canvas ref={canvasRef} style={style} {...props} />;
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
