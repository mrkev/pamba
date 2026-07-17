import useResizeObserver from "@react-hook/resize-observer";
import { useCallback, useRef, useState } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { GPUWaveform } from "webgpu-waveform-react";
import { AudioClip } from "../lib/AudioClip";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { standardViewport } from "../lib/viewport/StandardViewport";
import { nullthrows } from "../utils/nullthrows";
import { AudioClipBufferAxis } from "./axis/AudioClipBufferAxis";
import { pressedState } from "./pressedState";
import { useSelectOnSurface } from "./useSelectOnSurface";
import { useStandardViewport } from "./useStandardViewport";

export function AudioClipBufferView({
  clip,
  project,
  player,
  minScale,
  maxScale,
}: {
  clip: AudioClip;
  project: AudioProject;
  player: AnalizedPlayer;
  minScale: number;
  maxScale: number;
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

  // for waveform
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);
  const [pxPerSec] = usePrimitive(clip.detailedViewport.pxPerSecond);
  const [lockPlayback] = usePrimitive(clip.detailedViewport.lockPlayback);
  const waveformStartFr = Math.max(scrollLeftPx / pxPerSec, 0) * clip.sampleRate;

  useContainer(clip);

  const offsetFrOfPlaybackPos = useCallback(
    (timelineSecs: number) => {
      const clipSecs = timelineSecs - clip.getTimelineStartSec();
      if (clipSecs < 0) {
        return 0;
      }
      const clipFr = clipSecs * clip.sampleRate;
      return clipFr;
    },
    [clip],
  );

  useStandardViewport(waveformRef, clip.detailedViewport, minScale, maxScale);

  useSelectOnSurface(
    waveformRef,
    useCallback(
      function mouseDown(e: MouseEvent) {
        const canvas = nullthrows(waveformRef.current);
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;

        // The waveform is rendered scrolled by `waveformOffsetFr` frames — the viewport
        // scroll, or the locked playback position (see `timelineSecsToClipPx`). The click's
        // pixel offset is measured from that same origin, so add it back to recover the
        // true clip position. Read state fresh here so this handler isn't re-bound per frame.
        const vp = clip.detailedViewport;
        const waveformOffsetFr = vp.lockPlayback.get()
          ? offsetFrOfPlaybackPos(player.playbackPos.get())
          : Math.max(vp.scrollLeftPx.get() / vp.pxPerSecond.get(), 0) * clip.sampleRate;

        const positionFr = standardViewport.pxToFr(vp, mouseX, clip.sampleRate) + waveformOffsetFr;
        const positionSecs = positionFr / clip.sampleRate;
        const positionTimeline = positionSecs + clip.timelineStart.ensureSecs();

        project.cursorPos.set(positionTimeline);
        project.secondarySelection.set(null);
        clip.detailedViewport.selectionWidthFr.set(null);
      },
      [
        clip.detailedViewport,
        clip.sampleRate,
        clip.timelineStart,
        offsetFrOfPlaybackPos,
        player,
        project.cursorPos,
        project.secondarySelection,
      ],
    ),

    useCallback(
      function mouseMove(e: MouseEvent, down: { clientX: number; clientY: number }) {
        // Signed delta: dragging left of the anchor gives a negative width, so the
        // selection can be made backwards as well as forwards. Use a small pixel
        // dead-zone (symmetric regardless of zoom) so a plain click with a bit of
        // drift doesn't create a stray selection.
        const deltaPx = e.clientX - down.clientX;
        if (Math.abs(deltaPx) < 2) {
          clip.detailedViewport.selectionWidthFr.set(null);
          return;
        }
        const deltaXFr = standardViewport.pxToFr(clip.detailedViewport, deltaPx, clip.sampleRate);
        clip.detailedViewport.selectionWidthFr.set(deltaXFr);
      },
      [clip.detailedViewport, clip.sampleRate],
    ),

    useCallback(
      function mouseUp() {
        const selLenFr = clip.detailedViewport.selectionWidthFr.get();
        if (selLenFr == null) {
          return;
        }

        // The width is signed (relative to the cursor anchor). Normalize so `startS` is
        // always the left edge and `lengthFr` is positive, per the audioTime convention.
        const cursorS = project.cursorPos.get();
        const lenSecs = selLenFr / clip.sampleRate;
        project.secondarySelection.set({
          status: "audioTime",
          startS: selLenFr < 0 ? cursorS + lenSecs : cursorS,
          lengthFr: Math.abs(selLenFr),
        });
        pressedState.set(null);
      },
      [clip.detailedViewport.selectionWidthFr, clip.sampleRate, project.cursorPos, project.secondarySelection],
    ),
  );

  // console.log("SCSL", scale);
  const timelineSecsToClipPx = useCallback(
    (timelineSecs: number) => {
      const waveformOffset = clip.detailedViewport.lockPlayback.get()
        ? offsetFrOfPlaybackPos(playbackPos)
        : waveformStartFr;

      const clipSecs = timelineSecs - clip.getTimelineStartSec();
      const clipFr = clipSecs * clip.sampleRate;
      const clipPx = clipFr / standardViewport.framesPerPixel(clip.detailedViewport, clip.sampleRate);
      return clipPx - waveformOffset / standardViewport.framesPerPixel(clip.detailedViewport, clip.sampleRate);
    },
    [clip, offsetFrOfPlaybackPos, playbackPos, waveformStartFr],
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
    <div className="relative grow shrink flex overflow-hidden">
      {clip.buffer != null && (
        <GPUWaveform
          ref={waveformRef}
          audioBuffer={clip.buffer}
          scale={standardViewport.framesPerPixel(clip.detailedViewport, clip.sampleRate) / devicePixelRatio}
          offset={lockPlayback ? offsetFrOfPlaybackPos(playbackPos) : waveformStartFr}
          width={(width || 1) * devicePixelRatio}
          height={(height || 1) * devicePixelRatio}
          color="black"
          className="w-full h-full grow shrink bg-timeline-bg box-border border border-track-separator"
        />
      )}
      {/* axes: x = time (seconds into buffer), y = amplitude (-1..1) */}
      <AudioClipBufferAxis
        width={width}
        height={height}
        pxPerSec={pxPerSec}
        startSec={(lockPlayback ? offsetFrOfPlaybackPos(playbackPos) : waveformStartFr) / clip.sampleRate}
      />
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
              // Signed width: for a backwards selection the box extends left of the cursor.
              left: selectionWidthPx >= 0 ? cursorPosInClipPx : cursorPosInClipPx + selectionWidthPx,
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
