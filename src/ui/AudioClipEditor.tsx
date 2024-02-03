import { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { history, usePrimitive } from "structured-state";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { clamp } from "../utils/math";
import { nullthrows } from "../utils/nullthrows";
import { GPUWaveform } from "./GPUWaveform";
import { RenamableLabel } from "./RenamableLabel";
import { useEventListener } from "./useEventListener";

type AudioViewportT = {
  pxPerSec: number;
  scrollLeft: number;
};

const HEIGHT = 200;
const PX_PER_SEC = 10;

function getRealScale(num: number) {
  // how many samples per pixel
  return Math.round(Math.exp((Math.log(1000) / 100) * num));
}

export function AudioClipEditor({
  clip,
  player,
  project,
}: {
  clip: AudioClip;
  player: AnalizedPlayer;
  project: AudioProject;
}) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const playbackDiv = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const [name] = usePrimitive(clip.name);
  const [bpm] = useLinkedState(project.tempo);
  const [scrollLeft] = usePrimitive(clip.detailedViewport.scrollLeft);
  const [pxPerSec] = usePrimitive(clip.detailedViewport.pxPerSec);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const [waveformStartFr, setWaveformStartFr] = useState(0);
  const [scale, setScale] = useState(80);
  const [playbackPos] = usePrimitive(player.playbackPos);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidthRaw] = useLinkedState(project.selectionWidth);
  const selectionWidth = selectionWidthRaw == null ? 0 : selectionWidthRaw;

  function pxOfSec(sec: number) {
    return Math.floor(pxPerSec * sec);
  }

  useSubscribeToSubbableMutationHashable(clip);

  const backgroundImageData = clip.getWaveformDataURL(
    // totalBufferWidth,
    1000,
    HEIGHT,
  );

  const border = "1px solid #114411";

  // how many samples per pixel
  const realScale = getRealScale(scale);

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
          const sDelta = Math.exp(e.deltaY / 100);
          const expectedNewScale = clamp(1, scale * sDelta, 120);

          const scaleFactorFactor = getRealScale(scale) / getRealScale(expectedNewScale);

          // todo fr to px?
          let newStartPx = (waveformStartFr + mouseX) * scaleFactorFactor - mouseX;

          if (newStartPx < 0) {
            newStartPx = 0;
          }

          console.log(mouseX, newStartPx);
          setScale(expectedNewScale);
          setWaveformStartFr(newStartPx);

          // project.viewport.setScale(expectedNewScale, mouseX);
        }

        // pan
        else {
          setWaveformStartFr((prev) => Math.max(prev + e.deltaX * realScale, 0));
        }
      },
      [realScale, scale, waveformStartFr],
    ),
  );

  useEventListener(
    "click",
    waveformRef,
    useCallback(
      (e) => {
        const canvas = nullthrows(waveformRef.current);
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const positionSamples = (mouseX + waveformStartFr) * realScale;
        const positionSecs = positionSamples / clip.sampleRate;
        const positionTimeline = positionSecs + clip.timelineStartSec;

        project.cursorPos.set(positionTimeline);

        console.log(mouseX, (mouseX + waveformStartFr) * realScale);
      },
      [clip.sampleRate, clip.timelineStartSec, project.cursorPos, realScale, waveformStartFr],
    ),
  );

  // console.log("SCSL", scale);
  const timelineSecsToClipPx = useCallback(
    (timelineSecs: number) => {
      const clipSecs = timelineSecs - clip.timelineStartSec;
      const clipFr = clipSecs * clip.sampleRate;
      const clipPx = clipFr / realScale;

      return clipPx - waveformStartFr / realScale;
    },
    [clip.sampleRate, clip.timelineStartSec, realScale, waveformStartFr],
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
      <div>
        <div
          className={styles.clipHeader}
          style={{
            color: "white",
            background: "#225522",
            border: "1px solid #114411",
            boxSizing: "border-box",
            borderTopRightRadius: "3px",
            borderTopLeftRadius: "3px",
            padding: "0px 4px",
          }}
        >
          {/* TODO: not working */}
          <RenamableLabel
            style={{
              color: "white",
              fontSize: 12,
              cursor: "text",
            }}
            value={name}
            setValue={(value) => {
              history.record(() => {
                clip.name.set(value);
              });
            }}
            showEditButton
          />
        </div>
        <div
          style={{
            borderLeft: border,
            borderRight: border,
            borderBottom: border,
            display: "flex",
            flexDirection: "column",
            fontSize: 12,
            alignSelf: "flex-start",
            padding: "2px 4px",
            background: "#4e4e4e",
          }}
        >
          Length <input type="number" value={clip.clipLengthSec} disabled />
          Filename:
          <input type="text" value={clip.bufferURL} disabled />
          Sample Rate:
          <input type="number" value={clip.sampleRate} disabled />
          sid:
          <input type="text" value={clip._id} disabled />
          <small>note: sid is for debugging</small>
        </div>
      </div>
      {/* Waveform view */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        <input
          type="range"
          // TODO: why does 1 not work?
          // min={2}
          // max={100}
          value={scale}
          min={1}
          max={120}
          step={0.01}
          onChange={(e) => {
            const newVal = parseFloat(e.target.value);
            setScale(newVal);
            // render(Math.round(Math.exp((Math.log(1000) / 100) * newVal)));
            // console.log("a", newVal, Math.round(Math.exp((Math.log(1000) / 100) * newVal)));
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "stretch" }}>
          {clip.buffer != null && (
            <GPUWaveform
              ref={waveformRef}
              audioBuffer={clip.buffer}
              scale={realScale}
              offset={waveformStartFr}
              // width={300}
              height={50}
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
        s
        <div className={styles.waveformViewContainer}>
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
          d
        </div>
        <input
          type="range"
          min={2}
          max={100}
          step={0.01}
          value={pxPerSec}
          onChange={(e) => {
            const newVal = parseFloat(e.target.value);
            clip.detailedViewport.pxPerSec.set(newVal);
          }}
        />
      </div>
    </>
  );
}

const useStyles = createUseStyles({
  waveformViewContainer: {
    flexGrow: 1,
    overflowX: "scroll",
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
