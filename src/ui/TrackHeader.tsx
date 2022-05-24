import { useState } from "react";
import { CLIP_HEIGHT, EFFECT_HEIGHT } from "../globals";
import { AudioProject, ProjectSelection } from "../lib/AudioProject";
import type { AudioTrack } from "../lib/AudioTrack";
import { useLinkedState } from "../lib/LinkedState";
import { useLinkedSet } from "../lib/LinkedSet";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { useLinkedArray } from "../lib/LinkedArray";

type Props = {
  isSelected: boolean;
  track: AudioTrack;
  project: AudioProject;
  player: AnalizedPlayer;
};

export default function TrackHeader({ isSelected, track, project, player }: Props) {
  const [gain, setGain] = useState<number>(track.getCurrentGain().value);
  const [muted, setMuted] = useState<boolean>(false);
  const [dspExpandedTracks] = useLinkedSet(project.dspExpandedTracks);
  const [trackEffects] = useLinkedArray(track.effects);
  const [solodTracks] = useLinkedSet(project.solodTracks);
  const [trackName] = useLinkedState(track.name);

  const isSolod = solodTracks.has(track);
  const isDspExpanded = dspExpandedTracks.has(track);

  return (
    <div
      style={{
        background: isSelected ? "#eee" : "white",
        height: CLIP_HEIGHT + (isDspExpanded ? EFFECT_HEIGHT : 0),
      }}
    >
      <div
        style={{
          background: isSelected ? "#333" : "#eee",
          color: isSelected ? "white" : "black",
          userSelect: "none",
          cursor: "pointer",
        }}
        onClick={() => ProjectSelection.selectTrack(project, track)}
      >
        <button onClick={() => AudioProject.removeTrack(project, player, track)}>x</button> {trackName}
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
    </div>
  );
}
