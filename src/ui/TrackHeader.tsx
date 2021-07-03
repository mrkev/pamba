import { useEffect, useState } from "react";
import { CLIP_HEIGHT } from "../globals";
import type { AudioProject } from "../lib/AudioProject";
import type { AudioTrack } from "../lib/AudioTrack";

type Props = {
  isSelected: boolean;
  onMouseDown: () => void;
  onRemove: () => void;
  onSolo: () => void;
  track: AudioTrack;
  project: AudioProject;
};

export default function TrackHeader({
  isSelected,
  onMouseDown,
  onRemove,
  onSolo,
  track,
  project,
}: Props) {
  const [gain, setGain] = useState<number>(track.getCurrentGain().value);
  const [muted, setMuted] = useState<boolean>(false);

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
        onClick={onMouseDown}
      >
        <button onClick={onRemove}>x</button> {track.name}
      </div>
      <button onClick={function () {}} disabled>
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
