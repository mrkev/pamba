import React, { useState } from "react";
import { AudioProject, SelectionState } from "../lib/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { exhaustive } from "../utils/exhaustive";
import { useLinkedMap } from "../lib/state/LinkedMap";
import { pressedState } from "../pressedState";

export function stringOfSelected(sel: SelectionState | null): string {
  if (!sel) {
    return "";
  }

  const { status } = sel;
  switch (status) {
    case "clips":
      return JSON.stringify({
        ...sel,
        clips: sel.clips.map(({ clip }) => clip.toString()),
      });

    case "tracks":
      return JSON.stringify({
        ...sel,
        tracks: sel.tracks.map((track) => track.toString()),
      });

    case "effects":
      return JSON.stringify({
        ...sel,
        effects: sel.effects.map(({ effect }) => effect.name),
      });
    case "time":
      return "time";

    default:
      exhaustive(status);
  }

  return JSON.stringify(sel);
}

export function DebugData({ project }: { project: AudioProject }) {
  const [selected] = useLinkedState(project.selected);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const [tracks] = useLinkedArray(project.allTracks);
  const [timeMarkers] = useLinkedMap(project.timeMarkers);
  const [pressed] = useLinkedState(pressedState);
  const [open, setOpen] = useState(false);

  const allState = tracks
    .map((track, i) => {
      return `Track ${i}:\n${track.toString()}\n`;
    })
    .join("\n");

  return (
    <details
      open={open}
      style={{
        fontSize: 12,
        position: "absolute",
        bottom: 0,
        background: "rgba(233,233,233,0.7)",

        border: "1px solid black",
      }}
    >
      <summary style={{ cursor: "pointer" }} onClick={() => setOpen((p) => !p)}>
        Debug
      </summary>
      <div>
        Cursor: {cursorPos} {selectionWidth}
        <br />
        Selected: {stringOfSelected(selected)}
        <br />
        Pressed: {pressed?.status}
      </div>
      <pre>{allState}</pre>
      {timeMarkers.map((value, key) => (
        <div key={key}>
          {key}: {value}
        </div>
      ))}
      <button
        onClick={() => {
          timeMarkers.set(Math.random(), 2);
        }}
      >
        timeMarker/LinkedMap Test
      </button>
    </details>
  );
}
