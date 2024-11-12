import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { EFFECT_HEIGHT, TRACK_SEPARATOR_HEIGHT } from "../constants";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { ProjectSelection } from "../lib/project/ProjectSelection";
import { useLinkedState } from "../lib/state/LinkedState";
import { userActions } from "../lib/userActions";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../pressedState";
import { RenamableLabel } from "./RenamableLabel";
import { UtilityToggle } from "./UtilityToggle";
import { cx } from "./cx";
import { UtilitySlider, utility } from "./utility";
import { nullthrows } from "../utils/nullthrows";

export const TrackHeader = React.memo(function TrackHeader({
  track,
  trackNumber,
  project,
  player,
  onDragStart,
}: {
  track: AudioTrack | MidiTrack;
  // TODO: make a property of the track?
  trackNumber: number;
  project: AudioProject;
  player: AnalizedPlayer;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const styles = useStyles();
  const [gain, setGain] = useState<number>(track.dsp.getCurrentGain().value);
  const [muted, setMuted] = useState<boolean>(false);
  const dspExpandedTracks = useContainer(project.dspExpandedTracks);
  const solodTracks = useContainer(project.solodTracks);
  const lockedTracks = useContainer(project.lockedTracks);
  const trackEffects = useContainer(track.dsp.effects);
  const [trackName, setTrackName] = usePrimitive(track.name);
  const [height] = usePrimitive(track.height);
  const [selected] = useLinkedState(project.selected);
  const [activeTrack] = usePrimitive(project.activeTrack);
  const [armedTrack] = usePrimitive(project.armedTrack);

  const isSelected = selected !== null && selected.status === "tracks" && selected.test.has(track);
  const isSolod = solodTracks.has(track);
  const isActive = activeTrack === track;
  const isArmed = armedTrack === track;

  const isDspExpanded = dspExpandedTracks.has(track);
  const isLocked = lockedTracks.has(track);

  function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();

    pressedState.set({
      status: "resizing_track",
      track: track,
      clientX: e.clientX,
      clientY: e.clientY,
      originalHeight: height,
    });
  }

  return (
    <div
      draggable
      style={{
        background: isSelected ? "#222324" : "var(--background)",
        position: "relative",
        // borderBottom: `${TRACK_SEPARATOR_HEIGHT}px solid var(--track-separator)`,
        cursor: "pointer",
      }}
      onClick={() => ProjectSelection.selectTrack(project, track)}
      onDragStart={onDragStart}
    >
      <div
        style={{
          // background: isSelected ? "#eee" : "white",
          height: height - TRACK_SEPARATOR_HEIGHT,
          position: "relative",
          userSelect: "none",
          display: "flex",
          flexDirection: "column",

          // borderBottom: isDspExpanded ? `${TRACK_SEPARATOR_HEIGHT}px solid #444444` : undefined,
        }}
      >
        <div
          className="header"
          style={{
            background: isSelected ? "var(--selected-track-header-bg)" : "none",
            color: isSelected ? "white" : "var(--text-on-background)",
            userSelect: "none",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "stretch",
            fontSize: "10px",
          }}
        >
          <span
            className={classNames(styles.trackNumber, isActive && styles.trackNumberActive)}
            style={{ marginRight: 4 }}
          >
            {trackNumber}
          </span>
          <RenamableLabel value={trackName} setValue={setTrackName} />
          <div style={{ flexGrow: 1 }}></div>
          <button
            className={cx("utilityButton", styles.deleteTrackButton)}
            onClick={async () => await userActions.deleteTrack(track, player, project)}
          >
            <i className="ri-close-line"></i>
          </button>{" "}
        </div>
        <div className={styles.buttonRow}>
          <button
            className={classNames(utility.button, styles.headerButton)}
            title="solo track"
            style={isSolod ? { background: "#DDCC33" } : undefined}
            onClick={function (e) {
              if (solodTracks.has(track)) {
                solodTracks.delete(track);
              } else {
                solodTracks.add(track);
              }

              for (const track of project.allTracks._getRaw()) {
                if (solodTracks.size === 0 || solodTracks.has(track)) {
                  track.dsp._hidden_setIsMutedByApplication(false);
                } else {
                  track.dsp._hidden_setIsMutedByApplication(true);
                }
              }
              e.stopPropagation();
            }}
          >
            S
          </button>

          <button
            className={classNames(utility.button, styles.headerButton)}
            style={muted ? { background: "#5566EE" } : undefined}
            title="mute track"
            onClick={function (e) {
              setMuted((prev) => {
                if (!prev) {
                  track.dsp.setGain(0);
                } else {
                  track.dsp.setGain(gain);
                }
                return !prev;
              });
              e.stopPropagation();
            }}
          >
            M
          </button>
          <UtilitySlider
            value={gain}
            min={0}
            max={2}
            // https://stackoverflow.com/questions/22604500/web-audio-api-working-with-decibels
            formatValue={(value) => {
              const db = 20 * Math.log10(value);
              if (db === -Infinity) {
                return "-inf";
              }
              return `${db.toFixed(2)}db`;
            }}
            onChange={function (val: number): void {
              setGain(val);
              track.dsp.setGain(val);
            }}
          />
          {/* <input
            style={{
              flexGrow: 1,
              width: "50px",
            }}
            className={utility.slider}
            type="range"
            max={2}
            min={0}
            step="any"
            value={gain}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setGain(val);
              track.setGain(val);
            }}
          /> */}
        </div>
        <div className={styles.buttonRow}>
          <button
            disabled={isLocked}
            className={classNames(utility.button)}
            style={isArmed ? { background: "red" } : undefined}
            title="arm track (record to this track)"
            onClick={function (e) {
              if (isArmed) {
                project.armedTrack.set(null);
              } else {
                project.armedTrack.set(track);
              }
              e.stopPropagation();
            }}
          >
            {"\u23fa" /* record */}
          </button>
          <button
            className={classNames(utility.button, styles.lockButton)}
            style={isLocked ? { background: "purple", color: "white" } : undefined}
            title={isLocked ? "locked (click to unlock)" : "lock track"}
            onClick={function (e) {
              if (isLocked) {
                lockedTracks.delete(track);
              } else {
                lockedTracks.add(track);
                if (isArmed) {
                  project.armedTrack.set(null);
                }
              }
              e.stopPropagation();
            }}
          >
            {isLocked ? "\u26BF" : "\u26f6" /* squared key, square four corners */}
          </button>
          {/* {isLocked ? <i style={{ paddingLeft: 2 }}>Locked</i> : null} */}
          <PeakMeter track={track} />
        </div>

        <div style={{ flexGrow: 1 }}></div>
        {/* TODO: allow rezising track by dragging either line below dsp, or line between dsp and clips */}

        <UtilityToggle
          style={{ margin: "2px 4px 0px 4px", fontWeight: 200, fontSize: 10, height: 14 }}
          toggled={isDspExpanded}
          onToggle={function (): void {
            if (dspExpandedTracks.has(track)) {
              dspExpandedTracks.delete(track);
            } else {
              dspExpandedTracks.add(track);
            }
          }}
          toggleStyle={{ background: "black", color: "white" }}
          title={isDspExpanded ? "hide DSP rack" : "show DSP rack"}
        >
          DSP ({trackEffects.length})
        </UtilityToggle>
      </div>
      {isDspExpanded ? (
        <div
          style={{
            // background: "#444444",
            height: EFFECT_HEIGHT + 17 - 2,
            position: "relative",
            userSelect: "none",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "0px 2px 2px 2px",
          }}
        >
          {/* 
          <input style={{ width: "100%", border: "none", fontSize: 12 }} type="search" placeholder="Search..." />
          <select
            multiple
            style={{ flexGrow: 1, border: "none", fontSize: 12 }}
            onKeyPress={(e) => {
              const event = new MouseEvent("dblclick");
              e.target.dispatchEvent(event);
              e.stopPropagation();
            }}
          >
            {appEnvironment.faustEffects.map((effect) => {
              return (
                <option key={effect} onDoubleClick={async () => track.dsp.addEffect(effect)}>
                  {effect.toLocaleLowerCase()}
                </option>
              );
            })}

            {appEnvironment.wamPlugins.map((value, key) => {
              return value.pluginKind !== "a-a" ? null : (
                <option
                  key={key}
                  disabled={value.pluginKind !== "a-a"}
                  onDoubleClick={async () => track.dsp.addWAM(key)}
                >
                  {value.descriptor.name.replace(/^WebAudioModule\_/, "").replace(/Plugin$/, "")}
                </option>
              );
            })}
          </select> */}
        </div>
      ) : null}

      <div
        style={{
          // background: "red",
          background: "rgba(0,0,0,0)",
          // todo; instead of setting z-index 5, can I just use the track separator component for this?
          zIndex: 5,
          height: TRACK_SEPARATOR_HEIGHT * 2,
          bottom: -TRACK_SEPARATOR_HEIGHT * 1.5,
          position: "absolute",
          left: 0,
          width: "100%",
          cursor: "ns-resize",
        }}
        onMouseDownCapture={onMouseDownToResize}
      ></div>
    </div>
  );
});

const useStyles = createUseStyles({
  deleteTrackButton: {
    cursor: "pointer",
    border: "none",
    background: "var(--control-bg-color)",
    fontSize: 11,
    color: "white",
    "&:not(:active)": {
      background: "none",
    },
  },
  trackNumber: {
    width: 17.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    color: "var(--text-on-background)",
  },
  trackNumberActive: {
    color: "white",
    background: "var(--selected-track-header-background)",
    borderRight: "1px solid #eee",
  },
  buttonRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "2px",
    padding: "2px 0px 0px 4px",
  },
  headerButton: {
    fontSize: "10px",
  },
  lockButton: {
    fontSize: "19px",
    padding: "4px 3px 0px 3px",
  },
});

export const TrackHeaderSeparator = React.forwardRef<
  HTMLDivElement,
  { showActiveDropzone?: boolean; firstDropzone?: boolean }
>(function TrackHeaderSeparator({ showActiveDropzone, firstDropzone }, ref) {
  return (
    <div
      ref={ref}
      style={{
        height: firstDropzone ? 1 : TRACK_SEPARATOR_HEIGHT,
        backgroundColor: showActiveDropzone
          ? "orange"
          : firstDropzone
            ? "var(--axis-spacer-headers-separator)"
            : "var(--track-separator)",

        position: "relative",
        top: firstDropzone ? -1 : undefined,
      }}
    />
  );
});

export function audioClipPath(db: number, dbRangeMin: number, dbRangeMax: number): number {
  let clipPercent = (dbRangeMax - db) / (dbRangeMax - dbRangeMin);
  if (clipPercent > 100) {
    clipPercent = 100;
  }
  if (clipPercent < 0) {
    clipPercent = 0;
  }

  return 1 - clipPercent;
}

class RollingAvg {
  private i = 0;
  private readonly buffer: Array<number>;
  constructor(readonly size: number) {
    this.buffer = new Array(size).fill(0);
  }

  push(num: number) {
    this.buffer[this.i] = num;
    this.i = (this.i + 1) % this.size;
  }

  avg() {
    let sum = 0;
    for (const num of this.buffer) {
      sum += num;
    }
    return sum / this.size;
  }

  has(cb: (value: number, index: number, obj: number[]) => boolean) {
    return this.buffer.find(cb) != null;
  }
}

const SPACE_BETWEEN_CHANNEL_PEAK_METERS = 2 * devicePixelRatio;
const PeakMeter = React.memo(function PeakMeter({ track }: { track: AudioTrack | MidiTrack }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // TODO: only run raf when playing
  useEffect(() => {
    const canvas = nullthrows(canvasRef.current);
    const context = nullthrows(canvas.getContext("2d"));
    const toRef: { rafId: null | number } = { rafId: null };

    // we get peaks to make a rolling avg per channel
    const rollingAvgs = track.dsp.meterInstance.getPeaks().currentDB.map(() => new RollingAvg(4));

    toRef.rafId = requestAnimationFrame(function rAF() {
      const peaks = track.dsp.meterInstance.getPeaks();
      // context.fillStyle = "#454648";
      context.clearRect(0, 0, canvas.width, canvas.height);

      const numChannels = rollingAvgs.length;
      const channelHeight = canvas.height / numChannels;

      for (let i = 0; i < numChannels; i++) {
        const peak = peaks.currentDB[i];
        const rollingAvg = rollingAvgs[i];
        if (rollingAvg.has((x) => x > 0)) {
          context.fillStyle = "red";
        } else {
          context.fillStyle = "orange";
        }
        rollingAvg.push(peak);

        const filledProportionAvg = audioClipPath(rollingAvg.avg(), -48, 0);
        const margin = SPACE_BETWEEN_CHANNEL_PEAK_METERS / numChannels;
        context.fillRect(0, i * channelHeight + i * margin, canvas.width * filledProportionAvg, channelHeight - margin);

        context.fillRect(0, i * channelHeight + i * margin, canvas.width * filledProportionAvg, channelHeight - margin);
      }

      requestAnimationFrame(rAF);
    });
    return () => {
      toRef.rafId && cancelAnimationFrame(toRef.rafId);
    };
  });

  return (
    <>
      <canvas
        height={18 * devicePixelRatio}
        width={98 * devicePixelRatio}
        ref={canvasRef}
        style={{ height: 18, width: 98, borderRight: "1px solid var(--timeline-tick)", boxSizing: "border-box" }}
      />
      {/* <button
        onClick={() => {
          console.log(JSON.stringify(track.dsp.meterInstance.getPeaks(), null, 2));
        }}
      >
        on
      </button> */}
    </>
  );
});
