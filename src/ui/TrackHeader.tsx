import { useEffect, useState } from "react";
import { CLIP_HEIGHT } from "../globals";
import type { AudioProject, SelectionState } from "../lib/AudioProject";
import type { AudioTrack } from "../lib/AudioTrack";
import { useDerivedState } from "../lib/DerivedState";
import { useLinkedState } from "../lib/LinkedState";
import { modifierState } from "../ModifierState";

type Props = {
  isSelected: boolean;
  track: AudioTrack;
  project: AudioProject;
};

export default function TrackHeader({ isSelected, track, project }: Props) {
  const [gain, setGain] = useState<number>(track.getCurrentGain().value);
  const [muted, setMuted] = useState<boolean>(false);
  const [, setSelected] = useLinkedState<SelectionState | null>(
    project.selected
  );
  const [solodTracks, setSolodTracks] = useLinkedState<Set<AudioTrack>>(
    project.solodTracks
  );

  const isSolod = solodTracks.has(track);

  return (
    <div
      style={{
        background: isSelected ? "#eee" : "white",
        height: CLIP_HEIGHT,
      }}
    >
      <div
        style={{
          background: isSelected ? "#333" : "#eee",
          color: isSelected ? "white" : "black",
          userSelect: "none",
          cursor: "pointer",
        }}
        onClick={function () {
          setSelected((prev) => {
            const selectAdd = modifierState.meta || modifierState.shift;
            if (selectAdd && prev !== null && prev.status === "tracks") {
              prev.tracks.push(track);
              prev.test.add(track);
              return { ...prev };
            } else {
              return {
                status: "tracks",
                tracks: [track],
                test: new Set([track]),
              };
            }
          });
        }}
      >
        <button onClick={() => project.removeTrack(track)}>x</button>{" "}
        {track.name}
      </div>
      <button
        style={isSolod ? { background: "#5566EE" } : undefined}
        onClick={function () {
          setSolodTracks((prev) => {
            const res = new Set(prev);
            if (prev.has(track)) {
              res.delete(track);
            } else {
              res.add(track);
            }
            return res;
          });
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
          track.setGain(val);
        }}
      />
    </div>
  );
}
