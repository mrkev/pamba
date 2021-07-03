import { useState } from "react";
import { CLIP_HEIGHT } from "../globals";
import type { AudioTrack } from "../lib/AudioTrack";

type Props = {
  isSelected: boolean;
  onMouseDown: () => void;
  onRemove: () => void;
  onSolo: () => void;
  track: AudioTrack;
};

export default function TrackHeader({
  isSelected,
  onMouseDown,
  onRemove,
  onSolo,
  track,
}: Props) {
  const [gain, setGain] = useState<number>(track.getCurrentGain().value);

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
        {track.name}
      </div>
      <button onClick={onRemove}>remove track</button>
      <button onClick={onSolo} disabled>
        S
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
