import { CLIP_HEIGHT } from "../globals";
import type { AudioTrack } from "../AudioTrack";

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
      <input type="range" disabled />
    </div>
  );
}
