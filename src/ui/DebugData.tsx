import { useLocalState } from "@ricardo-jrm/use-local-state";
import { AudioProject } from "../lib/project/AudioProject";
import { SelectionState } from "../lib/project/SelectionState";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedMap } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { exhaustive } from "../utils/exhaustive";
import { useLinkedSet } from "../lib/state/LinkedSet";

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

    case "track_time":
      return "track_time";

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
  const [activeTrack] = useLinkedState(project.activeTrack);
  const [cursorTracks] = useLinkedSet(project.cursorTracks);
  const [open, setOpen] = useLocalState("debugDataOpen", false);
  const [viewportStartPx] = useLinkedState(project.viewportStartPx);
  const [projectDivWidth] = useLinkedState(project.viewport.projectDivWidth);

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
      <pre>
        |{viewportStartPx}px -{projectDivWidth}-
      </pre>
      <div>
        Cursor: {cursorPos} {selectionWidth}
        <br />
        Selected: {stringOfSelected(selected)}
        <br />
        Pressed: {pressed?.status}
        <br />
        Active Track: {activeTrack?.name.get()}
        <br />
        Cursor Tracks: {[...cursorTracks.values()].map((track) => track.name.get())}
      </div>
      <pre>{allState}</pre>
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
