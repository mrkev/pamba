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
import { pressedState } from "../lib/linkedState/pressedState";

type Props = {
  track: AudioTrack;
  project: AudioProject;
  player: AnalizedPlayer;
};

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
    });
  }

  return (
    <div
      style={{
        background: isSelected ? "#eee" : "white",
        height: height + (isDspExpanded ? EFFECT_HEIGHT : 0),
        position: "relative",
        userSelect: "none",
      }}
    >
      <div
        style={{
          background: isSelected ? "#333" : "#eee",
          color: isSelected ? "white" : "black",
          userSelect: "none",
          cursor: "pointer",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
        onClick={() => ProjectSelection.selectTrack(project, track)}
      >
        <RenamableLabel
          project={project}
          value={trackName}
          setValue={setTrackName}
          renameState={renameStateDescriptor}
        />
        <button onClick={() => AudioProject.removeTrack(project, player, track)}>x</button>{" "}
      </div>
      <button
        style={isSolod ? { background: "#5566EE" } : undefined}
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
      <button
        style={isDspExpanded ? { background: "#5566EE" } : undefined}
        onClick={function () {
          if (dspExpandedTracks.has(track)) {
            dspExpandedTracks.delete(track);
          } else {
            dspExpandedTracks.add(track);
          }
        }}
      >
        Expand
      </button>{" "}
      ({trackEffects.length})
      <div
        style={{
          background: "rgba(0,0,0,0)",
          height: TRACK_SEPARATOR_HEIGHT * 1.5,
          position: "absolute",
          bottom: 0,
          width: "100%",
          left: 0,
          cursor: "ns-resize",
        }}
        onMouseDown={onMouseDownToResize}
      ></div>
    </div>
  );
}
