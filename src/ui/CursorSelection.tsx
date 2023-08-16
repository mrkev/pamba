import React from "react";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiTrack } from "../midi/MidiTrack";

export function CursorSelection({ project, track }: { project: AudioProject; track: AudioTrack | MidiTrack }) {
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const [cursorTracks] = useLinkedSet(project.cursorTracks);

  if (!cursorTracks.has(track)) {
    return null;
  }

  return (
    <div
      style={{
        backdropFilter: "invert(100%)",
        left:
          selectionWidth == null || selectionWidth >= 0
            ? project.viewport.secsToPx(cursorPos)
            : project.viewport.secsToPx(cursorPos + selectionWidth),
        width: selectionWidth == null || selectionWidth === 0 ? 1 : project.viewport.secsToPx(Math.abs(selectionWidth)),
        position: "absolute",
        height: "100%",
      }}
    ></div>
  );
}
