import { useEffect, useMemo, useState } from "react";
import { EFFECT_HEIGHT, TRACK_SEPARATOR_HEIGHT } from "../globals";
import { AudioProject, ProjectSelection } from "../lib/AudioProject";
import type { AudioTrack } from "../lib/AudioTrack";
import { useLinkedState } from "../lib/state/LinkedState";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useRef } from "react";
import { RenamableLabel } from "./RenamableLabel";
import { pressedState } from "../pressedState";
import { css } from "@linaria/core";
import { FAUST_EFFECTS } from "../dsp/FaustAudioEffect";

type Props = {
  track: AudioTrack;
  project: AudioProject;
  player: AnalizedPlayer;
};

export const styles = {
  utilityButton: css`
    font-size: 10px;
    font-weight: bold;
    padding: 1px 6px;
    height: 16px;
    border: none;
    background: #d3d3d3;
    cursor: pointer;
    margin-left: 2px;
    // border: 1px solid black;
  `,
  utilitySlider: css`
    appearance: none;
    background: #d3d3d3;

    &::-webkit-slider-thumb {
      width: 1px;
      appearance: none;
      height: 16px;
      cursor: ew-resize;
      background: black;
    }
  `,
  actionButton: css`
    cursor: pointer;
    border: none;
    background: #d3d3d3;
  `,
} as const;

export default function TrackHeader({ track, project, player }: Props) {
  const [gain, setGain] = useState<number>(track.getCurrentGain().value);
  const [muted, setMuted] = useState<boolean>(false);
  const [dspExpandedTracks] = useLinkedSet(project.dspExpandedTracks);
  const [trackEffects] = useLinkedArray(track.effects);
  const [solodTracks] = useLinkedSet(project.solodTracks);
  const [trackName, setTrackName] = useLinkedState(track.name);
  const [renameState, setRenameState] = useLinkedState(project.currentlyRenaming);
  const [height] = useLinkedState(track.trackHeight);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const [selected] = useLinkedState(project.selected);
  const renameStateDescriptor = useMemo(
    () =>
      ({
        status: "track",
        track: track,
      } as const),
    [track]
  );

  const isSelected = selected !== null && selected.status === "tracks" && selected.test.has(track);

  const isSolod = solodTracks.has(track);
  const isDspExpanded = dspExpandedTracks.has(track);

  const isTrackBeingRenamed = renameState?.status === "track" && renameState.track === track;
  useEffect(() => {
    if (isTrackBeingRenamed) {
      const stopRenaming = function () {
        setRenameState(null);
      };
      document.addEventListener("mouseup", stopRenaming);
      renameInputRef.current?.focus();
      return () => {
        document.removeEventListener("mouseup", stopRenaming);
      };
    }
  }, [isTrackBeingRenamed, setRenameState]);

  function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();

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
      style={{
        position: "relative",
        borderBottom: `${TRACK_SEPARATOR_HEIGHT}px solid #BABABA`,
      }}
    >
      <div
        style={{
          // background: isSelected ? "#eee" : "white",
          height: height - TRACK_SEPARATOR_HEIGHT,
          position: "relative",
          userSelect: "none",
          display: "flex",
          flexDirection: "column",
          borderBottom: isDspExpanded ? `${TRACK_SEPARATOR_HEIGHT}px solid #444444` : undefined,
        }}
      >
        <div
          style={{
            background: isSelected ? "#333" : "white",
            color: isSelected ? "white" : "black",
            userSelect: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.8em",
            paddingLeft: "4px",
          }}
          onClick={() => ProjectSelection.selectTrack(project, track)}
        >
          <RenamableLabel
            project={project}
            value={trackName}
            setValue={setTrackName}
            renameState={renameStateDescriptor}
          />
          <button className={styles.actionButton} onClick={() => AudioProject.removeTrack(project, player, track)}>
            x
          </button>{" "}
        </div>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
          <button
            className={styles.utilityButton}
            style={isSolod ? { background: "#DDCC33" } : undefined}
            onClick={function () {
              if (solodTracks.has(track)) {
                solodTracks.delete(track);
              } else {
                solodTracks.add(track);
              }

              for (const track of project.allTracks._getRaw()) {
                if (solodTracks.size === 0 || solodTracks.has(track)) {
                  track._hidden_setIsMutedByApplication(false);
                } else {
                  track._hidden_setIsMutedByApplication(true);
                }
              }
            }}
          >
            S
          </button>
          <button
            className={styles.utilityButton}
            style={muted ? { background: "#5566EE" } : undefined}
            onClick={function () {
              setMuted((prev) => {
                if (!prev) {
                  track.setGain(0);
                } else {
                  track.setGain(gain);
                }
                return !prev;
              });
            }}
          >
            M
          </button>
          <input
            style={{
              flexGrow: 1,
              width: "50px",
            }}
            className={styles.utilitySlider}
            type="range"
            max={2}
            min={0}
            step="any"
            value={gain}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setGain(val);
              console.log(val);
              track.setGain(val);
            }}
          />
        </div>
        <div style={{ flexGrow: 1 }}></div>
        <button
          className={styles.actionButton}
          style={{
            background: isDspExpanded ? "#444" : undefined,
            color: isDspExpanded ? "white" : undefined,
            fontSize: "0.8em",
          }}
          onClick={function () {
            if (dspExpandedTracks.has(track)) {
              dspExpandedTracks.delete(track);
            } else {
              dspExpandedTracks.add(track);
            }
          }}
        >
          DSP ({trackEffects.length})
        </button>
      </div>
      {isDspExpanded ? (
        <div
          style={{
            background: isSelected ? "#eee" : "white",
            height: EFFECT_HEIGHT + 17 - TRACK_SEPARATOR_HEIGHT,
            position: "relative",
            userSelect: "none",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <input style={{ width: "100%", border: "none" }} type="search" placeholder="Search..." />
          <select
            multiple
            style={{ flexGrow: 1 }}
            onKeyPress={(e) => {
              const event = new MouseEvent("dblclick");
              e.target.dispatchEvent(event);
              console.log((e.target as any).value);

              console.log("EEEEEEEE ");
              e.stopPropagation();
              // if (e.key === "Enter") {
              //   track.addEffect(FAUST_EFFECTS.PANNER);
              // }
            }}
          >
            <option onDoubleClick={() => track.addEffect(FAUST_EFFECTS.PANNER)}>Panner</option>
            <option onDoubleClick={() => track.addEffect(FAUST_EFFECTS.REVERB)}>Reverb</option>

            {/* <optgroup label="4-legged pets">
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="hamster" disabled>
                Hamster
              </option>
            </optgroup>
            <optgroup label="Flying pets">
              <option value="parrot">Parrot</option>
              <option value="macaw">Macaw</option>
              <option value="albatross">Albatross</option>
            </optgroup> */}
          </select>
        </div>
      ) : null}
      <div
        style={{
          background: "rgba(0,0,0,0)",
          height: TRACK_SEPARATOR_HEIGHT * 2,
          position: "absolute",
          bottom: -TRACK_SEPARATOR_HEIGHT * 1.5,
          left: 0,
          width: "100%",
          cursor: "ns-resize",
        }}
        onMouseDown={onMouseDownToResize}
      ></div>
    </div>
  );
}
