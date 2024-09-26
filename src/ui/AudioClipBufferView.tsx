import { useCallback, useRef } from "react";
import { usePrimitive } from "structured-state";
import { GPUWaveform } from "webgpu-waveform-react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { pressedState } from "../pressedState";
import { nullthrows } from "../utils/nullthrows";
import { useEventListener } from "./useEventListener";
import { useSelectOnSurface } from "./useSelectOnSurface";

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
  const selectionWidthPx = clip.detailedViewport.frToPx(
    selectionWidthFr == null ? 0 : selectionWidthFr,
    clip.sampleRate,
  );

  // for waveform
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);
  const [pxPerSec] = usePrimitive(clip.detailedViewport.pxPerSecScale);
  const [lockPlayback] = usePrimitive(clip.detailedViewport.lockPlayback);
  const waveformStartFr = Math.max(scrollLeftPx / pxPerSec, 0) * clip.sampleRate;

  useSubscribeToSubbableMutationHashable(clip);

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

  useEventListener(
    "wheel",
    waveformRef,
    useCallback(
      function (e: WheelEvent) {
        e.preventDefault();
        e.stopPropagation();

        const canvas = nullthrows(waveformRef.current);
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;

        // both pinches and two-finger pans trigger the wheel event trackpads.
        // ctrlKey is true for pinches though, so we can use it to differentiate
        // one from the other.
        // pinch
        if (e.ctrlKey) {
          const sDelta = Math.exp(-e.deltaY / 70);
          const expectedNewScale = clip.detailedViewport.pxPerSecScale.get() * sDelta;
          // Min: 10 <->  Max: Sample rate
          clip.detailedViewport.setScale(expectedNewScale, 10, clip.sampleRate, mouseX);
        }

        // pan
        else {
          if (lockPlayback) {
            clip.detailedViewport.lockPlayback.set(false);
            // TODO: not working, keeping current scroll left position hmm
            const offsetFr = offsetFrOfPlaybackPos(player.playbackPos.get());
            clip.detailedViewport.scrollLeftPx.set(offsetFr / clip.sampleRate);
          }
          clip.detailedViewport.scrollLeftPx.setDyn((prev) => Math.max(prev + e.deltaX, 0));
        }
      },
      [clip.detailedViewport, clip.sampleRate, lockPlayback, offsetFrOfPlaybackPos, player.playbackPos],
    ),
  );

  useSelectOnSurface(
    waveformRef,
    useCallback(
      function mouseDown(e: MouseEvent) {
        const canvas = nullthrows(waveformRef.current);
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        // const positionSamples = clip.detailedViewport.pxToFr(mouseX + waveformStartFr, clip.sampleRate);
        // const positionSecs = positionSamples / clip.sampleRate;
        const positionSecs = clip.detailedViewport.pxToSec(mouseX);
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
        const deltaXFr = clip.detailedViewport.pxToFr(e.clientX - down.clientX, clip.sampleRate);
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
      const clipPx = clipFr / clip.detailedViewport.framesPerPixel(clip.sampleRate);
      return clipPx - waveformOffset / clip.detailedViewport.framesPerPixel(clip.sampleRate);
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

  // useEffect(() => {
  //   player.onFrame2 = function (playbackPos) {
  //     const pbdiv = playbackDiv.current;
  //     if (pbdiv) {
  //       pbdiv.style.left = String(timelineSecsToClipPx(playbackPos)) + "px";
  //     }
  //   };
  // }, [player, player.isAudioPlaying, timelineSecsToClipPx]);
  const cursorPosInClipPx = timelineSecsToClipPx(cursorPos);
  const playbackDivLeft = timelineSecsToClipPx(playbackPos);

  return (
    <div
      style={{
        position: "relative",
        flexGrow: 1,
      }}
    >
      {clip.buffer != null && (
        <GPUWaveform
          ref={waveformRef}
          audioBuffer={clip.buffer}
          scale={clip.detailedViewport.framesPerPixel(clip.sampleRate)}
          offset={lockPlayback ? offsetFrOfPlaybackPos(playbackPos) : waveformStartFr}
          // width={"100%"}
          // height={50}
          style={{ width: "100%", height: 250, background: "black", flexGrow: 1 }}
        />
      )}
      {/* cursor div */}
      {cursorPosInClipPx > 0 &&
        cursorPosInClipPx < 1000 && ( // TODO
          <div
            style={{
              borderLeft: "1px solid var(--cursor)",
              background: "rgba(255,255,255,0.5)",
              borderRight: selectionWidthPx === 0 ? undefined : "1px solid green",
              height: "100%",
              position: "absolute",
              userSelect: "none",
              pointerEvents: "none",
              // TODO center when locked
              left: selectionWidthPx >= 0 ? cursorPosInClipPx : cursorPos + selectionWidthPx,
              width: selectionWidthPx === 0 ? 0 : Math.floor(Math.abs(selectionWidthPx) - 1),
              top: 0,
            }}
          />
        )}
      {/* playback div */}
      <div
        ref={playbackDiv}
        style={{
          borderLeft: "1px solid red",
          height: "100%",
          position: "absolute",
          userSelect: "none",
          pointerEvents: "none",
          left: playbackDivLeft,
          width: 1,
          top: 0,
        }}
      />
    </div>
  );
}
