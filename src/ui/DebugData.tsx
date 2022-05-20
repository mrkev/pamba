import React from "react";
import { AudioProject, SelectionState } from "../lib/AudioProject";
import { useLinkedState } from "../lib/LinkedState";
import { useLinkedArray } from "../lib/LinkedArray";
import { exhaustive } from "../dsp/exhaustive";

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
        effects: sel.effects.map(({ effect }) => effect.data.name),
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

  const allState = tracks
    .map((track, i) => {
      return `Track ${i}:\n${track.toString()}\n`;
    })
    .join("\n");

  return (
    <>
      <div>
        Cursor: {cursorPos} {selectionWidth}
        <br />
        Selected: {stringOfSelected(selected)}
        <br />
      </div>
      <pre>{allState}</pre>
    </>
  );
}
