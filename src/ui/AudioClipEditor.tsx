import { useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { RenamableLabel } from "./RenamableLabel";
import { GPUWaveform } from "./GPUWaveform";

type AudioViewportT = {
  pxPerSec: number;
  scrollLeft: number;
};

const HEIGHT = 200;
const PX_PER_SEC = 10;

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
  const cursorDiv = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const [name] = useLinkedState(clip.name);
  const [bpm] = useLinkedState(project.tempo);
  const [scrollLeft] = useLinkedState(clip.detailedViewport.scrollLeft);
  const [pxPerSec] = useLinkedState(clip.detailedViewport.pxPerSec);
  const [scale, setScale] = useState(2);

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

  // useEventListener('wheel')
  const realScale = Math.round(Math.exp((Math.log(1000) / 100) * scale));

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
              clip.name.set(value);
            }}
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
          {/* <input
          type="range"
          // TODO: why does 1 not work?
          // min={2}
          // max={100}
          min={1}
          max={120}
          step={0.01}
          onChange={(e) => {
            const newVal = parseFloat(e.target.value);
            setScale(newVal);
            // render(Math.round(Math.exp((Math.log(1000) / 100) * newVal)));
            // console.log("a", newVal, Math.round(Math.exp((Math.log(1000) / 100) * newVal)));
          }}
        /> */}
          {/* <GPUWaveform audioBuffer={clip.buffer} scale={realScale} width={300} height={20} /> */}
          Length <input type="number" value={clip.getDuration()} disabled />
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
        <div className={styles.waveformViewContainer}>
          <div
            style={{
              backgroundColor: "#ccffcc",
              backgroundImage: "url('" + backgroundImageData + "')",
              backgroundSize: `${pxOfSec(clip.buffer.length / clip.buffer.sampleRate)}px 100%`,
              backgroundPosition: `0px center`,
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              width: pxOfSec(clip.buffer.length / clip.buffer.sampleRate),
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
                width: pxOfSec(clip.getDuration()),
                border,
                boxSizing: "border-box",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                height: "100%",
                left: pxOfSec(clip.trimEndSec),
                width: pxOfSec(clip.buffer.length / clip.buffer.sampleRate) - pxOfSec(clip.trimEndSec),
                backdropFilter: "grayscale(100%)",
              }}
            ></div>
          </div>
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
