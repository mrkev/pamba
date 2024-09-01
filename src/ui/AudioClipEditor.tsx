import { useCallback, useRef } from "react";
import { createUseStyles } from "react-jss";
import { usePrimitive } from "structured-state";
import { GPUWaveform } from "webgpu-waveform-react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { nullthrows } from "../utils/nullthrows";
import { AudioClipPropsEditor, ClipPropsEditor } from "./ClipPropsEditor";
import { UtilityToggle } from "./UtilityToggle";
import { useEventListener } from "./useEventListener";
import { AudioTrack } from "../lib/AudioTrack";

export const HEIGHT = 200;

export function AudioClipEditor({
  clip,
  player,
  project,
  track,
}: {
  clip: AudioClip;
  track: AudioTrack;
  player: AnalizedPlayer;
  project: AudioProject;
}) {
  // const containerRef = useRef<HTMLDivElement>(null);
  // const backgroundRef = useRef<HTMLCanvasElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  // const styles = useStyles();
  const playbackDiv = useRef<HTMLDivElement>(null);
  const [playbackPos] = usePrimitive(player.playbackPos);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidthRaw] = useLinkedState(project.selectionWidth);
  const selectionWidth = selectionWidthRaw == null ? 0 : selectionWidthRaw;

  // for waveform IMG
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);
  const [pxPerSec] = usePrimitive(clip.detailedViewport.pxPerSecScale);
  const [lockPlayback] = usePrimitive(clip.detailedViewport.lockPlayback);

  // for waveform GPU
  // const [waveformStartFr, setWaveformStartFr] = useState(0);
  // const [scale, setScale] = useState(80);

  // const frPerPx = getRealScale(pxPerSec);
  // console.log("frPerPx", frPerPx, "pxPerSec", pxPerSec);
  const waveformStartFr = Math.max(scrollLeftPx / pxPerSec, 0) * clip.sampleRate;

  useSubscribeToSubbableMutationHashable(clip);

  // const backgroundImageData = clip.getWaveformDataURL(
  //   // totalBufferWidth,
  //   1000,
  //   HEIGHT,
  // );

  // how many samples per pixel

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

  useEventListener(
    "click",
    waveformRef,
    useCallback(
      (e) => {
        const canvas = nullthrows(waveformRef.current);
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        // const positionSamples = clip.detailedViewport.pxToFr(mouseX + waveformStartFr, clip.sampleRate);
        // const positionSecs = positionSamples / clip.sampleRate;
        const positionSecs = clip.detailedViewport.pxToSec(mouseX);
        const positionTimeline = positionSecs + clip.timelineStartSec;
        console.log("positionSecs", positionSecs);

        project.cursorPos.set(positionTimeline);
      },
      [clip.detailedViewport, clip.timelineStartSec, project.cursorPos],
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
    <>
      <ClipPropsEditor clip={clip} project={project} track={track} />
      <AudioClipPropsEditor clip={clip} project={project} />
      {/* Waveform view */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          overflow: "hidden",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end" }}>
          <input
            type="range"
            value={Math.log2(pxPerSec)}
            min={Math.log2(10)}
            max={Math.log2(clip.sampleRate)}
            step={0.01}
            onChange={(e) => {
              const newVal = parseFloat(e.target.value);
              clip.detailedViewport.pxPerSecScale.set(Math.pow(2, newVal));
            }}
          />
          <UtilityToggle
            toggleStyle={{ backgroundColor: "orange" }}
            toggled={lockPlayback}
            onToggle={(val) => clip.detailedViewport.lockPlayback.set(val)}
            title={lockPlayback ? "lock playhead" : "unlock playhead"}
          >
            <i className="ri-text-spacing"></i>
          </UtilityToggle>
        </div>

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
                  borderRight: selectionWidth === 0 ? undefined : "1px solid green",
                  height: "100%",
                  position: "absolute",
                  userSelect: "none",
                  pointerEvents: "none",
                  // TODO center when locked
                  left: selectionWidth >= 0 ? cursorPosInClipPx : timelineSecsToClipPx(cursorPos + selectionWidth),
                  width: selectionWidth === 0 ? 0 : Math.floor(timelineSecsToClipPx(Math.abs(selectionWidth)) - 1),
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

        {/* <div className={styles.waveformViewContainer}>
          <div
            style={{
              backgroundColor: "#ccffcc",
              backgroundImage: "url('" + backgroundImageData + "')",
              backgroundSize: `${pxOfSec(clip.bufferLenSec())}px 100%`,
              backgroundPosition: `0px center`,
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              width: pxOfSec(clip.bufferLenSec()),
              height: "100%",
              userSelect: "none",
              color: "white",
              pointerEvents: "all",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                height: "100%",
                width: pxOfSec(clip.trimStartSec),
                // border,
                backdropFilter: "grayscale(100%)",
                // background: "red",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                left: pxOfSec(clip.trimStartSec), //todo viewport
                height: "100%",
                width: pxOfSec(clip.clipLengthSec),
                border,
                boxSizing: "border-box",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                height: "100%",
                left: pxOfSec(clip.trimEndSec),
                width: pxOfSec(clip.bufferLenSec()) - pxOfSec(clip.trimEndSec),
                backdropFilter: "grayscale(100%)",
              }}
            ></div>
          </div>
        </div> */}
        {/* <input
          type="range"
          min={2}
          max={100}
          step={0.01}
          value={pxPerSec}
          onChange={(e) => {
            const newVal = parseFloat(e.target.value);
            clip.detailedViewport.pxPerSecScale.set(newVal);
          }}
        /> */}
      </div>
    </>
  );
}

const useStyles = createUseStyles({
  waveformViewContainer: {
    flexGrow: 1,
    overflowX: "scroll",
  },
});
