import useResizeObserver from "@react-hook/resize-observer";
import { useCallback, useRef, useState } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { GPUWaveform } from "webgpu-waveform-react";
import { AudioClip } from "../lib/AudioClip";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { standardViewport } from "../lib/viewport/StandardViewport";
import { nullthrows } from "../utils/nullthrows";
import { pressedState } from "./pressedState";
import { useSelectOnSurface } from "./useSelectOnSurface";
import { useStandardViewport } from "./useStandardViewport";

export function AudioClipBufferView({
  clip,
  project,
  player,
}: {
  clip: AudioClip;
  project: AudioProject;
  player: AnalizedPlayer;
}) {
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const playbackDiv = useRef<HTMLDivElement>(null);
  const [playbackPos] = usePrimitive(player.playbackPos);
  const [cursorPos] = usePrimitive(project.cursorPos);
  const [selectionWidthFr] = usePrimitive(clip.detailedViewport.selectionWidthFr);
  const selectionWidthPx = standardViewport.frToPx(
    clip.detailedViewport,
    selectionWidthFr == null ? 0 : selectionWidthFr,
    clip.sampleRate,
  );

  const MIN_SCALE = 10;
  const MAX_SCALE = clip.sampleRate;

  // for waveform
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);
  const [pxPerSec] = usePrimitive(clip.detailedViewport.pxPerSecond);
  const [lockPlayback] = usePrimitive(clip.detailedViewport.lockPlayback);
  const waveformStartFr = Math.max(scrollLeftPx / pxPerSec, 0) * clip.sampleRate;

  useContainer(clip);

  const offsetFrOfPlaybackPos = useCallback(
    (timelineSecs: number) => {
      const clipSecs = timelineSecs - clip.timelineStartSec;
      if (clipSecs < 0) {
        return 0;
      }
      const clipFr = clipSecs * clip.sampleRate;
      return clipFr;
    },
    [clip.sampleRate, clip.timelineStartSec],
  );

  useStandardViewport(waveformRef, clip.detailedViewport, MIN_SCALE, MAX_SCALE);

  useSelectOnSurface(
    waveformRef,
    useCallback(
      function mouseDown(e: MouseEvent) {
        const canvas = nullthrows(waveformRef.current);
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        // const positionSamples = clip.detailedViewport.pxToFr(mouseX + waveformStartFr, clip.sampleRate);
        // const positionSecs = positionSamples / clip.sampleRate;
        const positionSecs = standardViewport.pxToSecs(clip.detailedViewport, mouseX, "pos"); // pos I think
        const positionTimeline = positionSecs + clip.timelineStart.ensureSecs();

        project.cursorPos.set(positionTimeline);
        project.secondarySelection.set(null);
        clip.detailedViewport.selectionWidthFr.set(null);
      },
      [clip.detailedViewport, clip.timelineStart, project.cursorPos, project.secondarySelection],
    ),

    useCallback(
      function mouseMove(e: MouseEvent, down: { clientX: number; clientY: number }) {
        // const mouseDown = nullthrows(mouseGesture.get());
        const deltaXFr = standardViewport.pxToFr(clip.detailedViewport, e.clientX - down.clientX, clip.sampleRate);
        const newWidth = deltaXFr;

        if (newWidth < 1) {
          clip.detailedViewport.selectionWidthFr.set(null);
        } else {
          clip.detailedViewport.selectionWidthFr.set(newWidth);
        }
      },
      [clip.detailedViewport, clip.sampleRate],
    ),

    useCallback(
      function mouseUp() {
        const selLenFr = clip.detailedViewport.selectionWidthFr.get();
        if (selLenFr == null) {
          return;
        }

        project.secondarySelection.set({
          status: "audioTime",
          startS: project.cursorPos.get(),
          lengthFr: selLenFr,
        });
        pressedState.set(null);
      },
      [clip.detailedViewport.selectionWidthFr, project.cursorPos, project.secondarySelection],
    ),
  );

  // console.log("SCSL", scale);
  const timelineSecsToClipPx = useCallback(
    (timelineSecs: number) => {
      const waveformOffset = clip.detailedViewport.lockPlayback.get()
        ? offsetFrOfPlaybackPos(playbackPos)
        : waveformStartFr;

      const clipSecs = timelineSecs - clip.timelineStartSec;
      const clipFr = clipSecs * clip.sampleRate;
      const clipPx = clipFr / standardViewport.framesPerPixel(clip.detailedViewport, clip.sampleRate);
      return clipPx - waveformOffset / standardViewport.framesPerPixel(clip.detailedViewport, clip.sampleRate);
    },
    [
      clip.detailedViewport,
      clip.sampleRate,
      clip.timelineStartSec,
      offsetFrOfPlaybackPos,
      playbackPos,
      waveformStartFr,
    ],
  );

  const cursorPosInClipPx = timelineSecsToClipPx(cursorPos);
  const playbackDivLeft = timelineSecsToClipPx(playbackPos);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useResizeObserver<HTMLCanvasElement>(
    waveformRef,
    useCallback((entry) => {
      setWidth(entry.contentRect.width ?? 0);
      setHeight(entry.contentRect.height ?? 0);
    }, []),
  );

  return (
    <div className="relative grow shrink">
      {clip.buffer != null && (
        <GPUWaveform
          ref={waveformRef}
          audioBuffer={clip.buffer}
          scale={standardViewport.framesPerPixel(clip.detailedViewport, clip.sampleRate) / devicePixelRatio}
          offset={lockPlayback ? offsetFrOfPlaybackPos(playbackPos) : waveformStartFr}
          width={(width || 1) * devicePixelRatio}
          height={(height || 1) * devicePixelRatio}
          color="black"
          className="w-full h-[212px] grow shrink bg-timeline-bg box-border border border-track-separator"
        />
      )}
      {/* cursor div */}
      {cursorPosInClipPx > 0 &&
        cursorPosInClipPx < 1000 && ( // TODO
          <div
            className="absolute top-0 h-full select-none pointer-events-none"
            style={{
              borderLeft: "1px solid var(--cursor)",
              background: "rgba(232,136,58,0.5)",
              borderRight: selectionWidthPx === 0 ? undefined : "1px solid orange",
              // TODO center when locked
              left: selectionWidthPx >= 0 ? cursorPosInClipPx : cursorPos + selectionWidthPx,
              width: selectionWidthPx === 0 ? 0 : Math.floor(Math.abs(selectionWidthPx) - 1),
            }}
          />
        )}
      {/* <TimelineCursor project={project} viewport={clip.detailedViewport} /> */}
      {/* <ViewportPlaybackCursor viewport={clip.detailedViewport} player={player} /> */}

      {/* playback div */}
      <div
        ref={playbackDiv}
        className="absolute top-0 w-px h-full select-none pointer-events-none"
        style={{
          borderLeft: "1px solid red",
          left: playbackDivLeft,
        }}
      />
    </div>
  );
}
