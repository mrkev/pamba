import React from "react";
import { AudioProject, SelectionState } from "../lib/AudioProject";
import { useLinkedState } from "../lib/LinkedState";
import { useLinkedArray } from "../lib/LinkedArray";

export function stringOfSelected(sel: SelectionState | null): string {
  if (!sel) {
    return "";
  }

  switch (sel.status) {
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
