import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import React from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { EFFECT_HEIGHT, TRACK_HEIGHT, TRACK_SEPARATOR_HEIGHT } from "../constants";
import { AudioTrack } from "../lib/AudioTrack";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { selection } from "../lib/project/selection";
import { GAIN_ADDRESS, MUTE_ADDRESS, PAN_ADDRESS } from "../lib/ProjectTrackDSP";
import { userActions } from "../lib/userActions";
import { MidiTrack } from "../midi/MidiTrack";
import { cn } from "../utils/cn";
import { nullthrows } from "../utils/nullthrows";
import { cx } from "./cx";
import { pressedState } from "./pressedState";
import { RenamableLabel } from "./RenamableLabel";
import { TrackPeakMeter } from "./TrackPeakMeter";
import { utility } from "./utility";
import { dbToSliderNormal, sliderNormalToDB } from "./utilityMapping";
import { UtilityNumberSlider } from "./UtilitySlider";
import { UtilityToggle } from "./UtilityToggle";

export const TrackHeader = React.memo(function TrackHeader({
  track,
  trackNumber,
  project,
  player,
  onDragStart,
}: {
  track: AudioTrack | MidiTrack;
  trackNumber: number; // TODO: make a property of the track?
  project: AudioProject;
  player: AnalizedPlayer;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const styles = useStyles();
  const dspExpandedTracks = useContainer(project.dspExpandedTracks);
  const solodTracks = useContainer(project.solodTracks);
  const lockedTracks = useContainer(project.lockedTracks);
  const trackEffects = useContainer(track.dsp.effectNodes);
  const [trackName, setTrackName] = usePrimitive(track.name);
  // const [height] = usePrimitive(track.height);
  const height = TRACK_HEIGHT;
  const [selected] = useLinkAsState(project.selected);
  const [activeTrack] = usePrimitive(project.activeTrack);
  const [armedTrack] = usePrimitive(project.armedAudioTrack);
  const [armedMidiTrack] = usePrimitive(project.armedMidiTrack);
  const params = useContainer(track.dsp.utility.params);

  const gain = nullthrows(params.get(GAIN_ADDRESS), `Invalid address for effect param: ${GAIN_ADDRESS}`);
  const muted = nullthrows(params.get(MUTE_ADDRESS), `Invalid address for effect param: ${MUTE_ADDRESS}`) === 1;
  const pan = nullthrows(params.get(PAN_ADDRESS), `Invalid address for effect param: ${PAN_ADDRESS}`);

  const isSelected = selected !== null && selected.status === "tracks" && selected.test.has(track);
  const isSolod = solodTracks.has(track);
  const isActive = activeTrack === track;
  const isArmed = armedTrack === track || armedMidiTrack === track;

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
      className={cn("relative cursor-pointer", isSelected && "bg-selected-track-background")}
      draggable
      onClick={() => selection.selectTrack(project, track)}
      onDragStart={onDragStart}
    >
      <div
        className="flex flex-col select-none relative"
        style={{
          height: height - TRACK_SEPARATOR_HEIGHT,
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        <div
          // header, title
          className={cn(
            "flex flex-row justify-between items-stretch select-none text-white",
            isSelected && "bg-[green]",
          )}
          style={{ fontSize: "10px" }}
        >
          <span
            className={classNames(
              "text-white flex justify-center items-center border-r border-[green]",
              isActive && "border-r border-[green]",
            )}
            style={{ marginRight: 4, width: 20, borderWidth: 2 }}
          >
            {trackNumber}
          </span>
          <RenamableLabel value={trackName} setValue={setTrackName} />
          <div className="grow"></div>
          <button
            className={cx(utility.button, styles.deleteTrackButton, "text-white")}
            onClick={async () => await userActions.deleteTrack(track, player, project)}
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* solo, mute, gain */}
        <div className={cn(styles.buttonRow, "flex flex-row items-center")}>
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
              track.dsp.utility.setParam(MUTE_ADDRESS, muted ? 0 : 1);
              e.stopPropagation();
            }}
          >
            M
          </button>

          <UtilityNumberSlider
            className="grow"
            value={dbToSliderNormal(gain)}
            min={0}
            max={1}
            formatValue={(value) => {
              const db = sliderNormalToDB(value);
              return `${db.toFixed(2)}db`;
            }}
            onChange={function (val: number): void {
              const db = sliderNormalToDB(val);
              track.dsp.utility.setParam(GAIN_ADDRESS, db);
            }}
          />
        </div>

        {/* arm, lock, peak meters */}
        <div className={cn(styles.buttonRow, "flex flex-row items-center")}>
          {track instanceof AudioTrack && (
            <button
              disabled={isLocked}
              className={classNames(utility.button, isArmed)}
              style={isArmed ? { background: "red" } : undefined}
              title="arm track (record to this track)"
              onClick={function (e) {
                if (isArmed) {
                  project.armedAudioTrack.set(null);
                } else {
                  project.armedAudioTrack.set(track);
                }
                e.stopPropagation();
              }}
            >
              {"\u23fa" /* record */}
            </button>
          )}
          {track instanceof MidiTrack && (
            <button
              disabled={isLocked}
              className={classNames(utility.button, isArmed, "w-[20px]")}
              style={isArmed ? { background: "red" } : undefined}
              title="arm track (record to this track)"
              onClick={function (e) {
                if (isArmed) {
                  project.armedMidiTrack.set(null);
                } else {
                  project.armedMidiTrack.set(track);
                }
                e.stopPropagation();
              }}
            >
              <i className="ri-disc-fill"></i>
            </button>
          )}
          <button
            className={classNames(utility.button, styles.lockButton, "w-[20px]")}
            style={isLocked ? { background: "purple", color: "white" } : undefined}
            title={isLocked ? "locked (click to unlock)" : "lock track"}
            onClick={function (e) {
              if (isLocked) {
                lockedTracks.delete(track);
              } else {
                lockedTracks.add(track);
                if (isArmed) {
                  project.armedAudioTrack.set(null);
                }
              }
              e.stopPropagation();
            }}
          >
            {isLocked ? "\u26BF" : "\u26f6" /* squared key, square four corners */}
          </button>
          {/* {isLocked ? <i style={{ paddingLeft: 2 }}>Locked</i> : null} */}
          {/* {track instanceof AudioTrack ? (
            <div>
              <button
                className={cx("utilityButton", styles.deleteTrackButton)}
                onClick={async () => track.flushFirstClipToProcessor()}
              >
                test
              </button>
              <button
                className={cx("utilityButton", styles.deleteTrackButton)}
                onClick={async () => track.testWAMPlayback()}
              >
                two
              </button>
            </div>
          ) : (
            <PeakMeter track={track} />
          )} */}
          <TrackPeakMeter track={track} />
        </div>

        {/* <div className="grow"></div> */}
        {/* TODO: allow rezising track by dragging either line below dsp, or line between dsp and clips */}

        <UtilityToggle
          className="font-bold mt-[2px] bg-transparent hover:bg-effect-rack-bg text-white"
          style={{
            fontSize: 10,
            // justifyContent: "start",
          }}
          toggled={isDspExpanded}
          onToggle={function (): void {
            if (dspExpandedTracks.has(track)) {
              dspExpandedTracks.delete(track);
            } else {
              dspExpandedTracks.add(track);
            }
          }}
          // className={styles.deleteTrackButton}
          toggleClassName="bg-black text-white"
          toggleStyle={{ background: "black", color: "white" }}
          title={isDspExpanded ? "hide DSP rack" : "show DSP rack"}
        >
          {isDspExpanded ? <i className="ri-arrow-down-s-fill"></i> : <i className="ri-arrow-right-s-fill"></i>}
          DSP ({trackEffects.length})
          {isDspExpanded ? <i className="ri-arrow-down-s-fill"></i> : <i className="ri-arrow-left-s-fill"></i>}
        </UtilityToggle>
      </div>
      {isDspExpanded ? (
        <div
          className="select-none bg-effect-rack-bg"
          style={{
            height: EFFECT_HEIGHT + 4,
            margin: "0px 2px 0px 2px",
            padding: "4px 2px",
          }}
        >
          <UtilityNumberSlider
            className="grow"
            value={pan}
            min={-1}
            max={1}
            formatValue={(value) => {
              if (value === 0) {
                return "C";
              }

              return `${Math.abs(value * 100).toFixed(0)}${value < 0 ? "L" : "R"}`;
            }}
            onChange={function (val: number): void {
              track.dsp.utility.setParam(PAN_ADDRESS, val);
            }}
          />
        </div>
      ) : null}
    </div>
  );
});

const useStyles = createUseStyles({
  deleteTrackButton: {
    border: "none",
    background: "var(--control-bg-color)",
    fontSize: 11,
    "&:not(:active)": {
      background: "none",
    },
  },
  buttonRow: {
    gap: "2px",
    padding: "2px 0px 0px 0px",
  },
  headerButton: {
    fontSize: "10px",
  },
  lockButton: {
    fontSize: "19px",
    padding: "4px 3px 0px 3px",
  },
});

export function TrackHeaderSeparator({
  showActiveDropzone,
  firstDropzone,
  ref,
}: {
  showActiveDropzone?: boolean;
  firstDropzone?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={cn("relative")}
      ref={ref}
      style={{
        height: firstDropzone ? (showActiveDropzone ? 1 : 0) : TRACK_SEPARATOR_HEIGHT,
        backgroundColor: showActiveDropzone
          ? "orange"
          : firstDropzone
            ? "var(--axis-spacer-headers-separator)"
            : "var(--track-separator)",
        top: firstDropzone ? -1 : undefined,
      }}
    />
  );
}
