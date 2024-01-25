import hljs from "highlight.js";
import { debugOut, useContainer } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { PrimarySelectionState } from "../lib/project/SelectionState";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { exhaustive } from "../utils/exhaustive";
import { useLocalStorage } from "./useLocalStorage";
import { ProjectTrack } from "../lib/ProjectTrack";

export function stringOfSelected(sel: PrimarySelectionState | null): string {
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
        tracks: sel.tracks.map((track) => ProjectTrack.toString(track)),
      });

    case "effects":
      return JSON.stringify({
        ...sel,
        effects: sel.effects.map(({ effect }) => effect.name),
      });
    case "time":
      return "time";

    case "track_time":
      return JSON.stringify(sel, ["status", "startS", "endS"], 2);

    default:
      exhaustive(status);
  }

  return JSON.stringify(sel);
}

export function DebugData({ project }: { project: AudioProject }) {
  const [selected] = useLinkedState(project.selected);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const tracks = useContainer(project.allTracks);
  const [pressed] = useLinkedState(pressedState);
  const [activeTrack] = useLinkedState(project.activeTrack);
  const [cursorTracks] = useLinkedSet(project.cursorTracks);
  const [open, setOpen] = useLocalStorage<boolean>("debugDataOpen", false);
  const [viewportStartPx] = useLinkedState(project.viewportStartPx);
  const [projectDivWidth] = useLinkedState(project.viewport.projectDivWidth);

  if (window.location.host.indexOf("localhost") === -1) {
    return null;
  }

  const allState = tracks
    .map((track, i) => {
      return `Track ${i}:\n${ProjectTrack.toString(track)}\n`;
    })
    .join("\n");

  return (
    <details
      open={open}
      onToggle={() => setOpen((p) => !p)}
      style={{
        fontSize: 12,
        position: "absolute",
        bottom: 0,
        left: 100,
        background: "rgba(233,233,233,0.7)",
        border: "1px solid black",
        color: "black",
      }}
    >
      <summary style={{ cursor: "pointer" }}>Debug</summary>
      <pre>
        |{viewportStartPx}px -{projectDivWidth}-
      </pre>
      <div>
        Cursor: {cursorPos} {selectionWidth} <br />
        Cursor Tracks: {[...cursorTracks.values()].map((track) => `${track.name.get()}`)}
        <hr></hr>
        <br />
        Selected: {stringOfSelected(selected)}
        <br />
        Pressed: {pressed?.status}
        <br />
        Active Track: {activeTrack?.name.get()}
      </div>
      <pre>{allState}</pre>
    </details>
  );
}

export function DebugContent({ project }: { project: AudioProject }) {
  const [selected] = useLinkedState(project.selected);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const tracks = useContainer(project.allTracks);
  const [pressed] = useLinkedState(pressedState);
  const [activeTrack] = useLinkedState(project.activeTrack);
  const [cursorTracks] = useLinkedSet(project.cursorTracks);
  const [viewportStartPx] = useLinkedState(project.viewportStartPx);
  const [projectDivWidth] = useLinkedState(project.viewport.projectDivWidth);

  if (window.location.host.indexOf("localhost") === -1) {
    return null;
  }

  const allState = tracks
    .map((track, i) => {
      return `Track ${i}:\n${ProjectTrack.toString(track)}\n`;
    })
    .join("\n");

  const value =
    " ## Track Structure<br /><br />" +
    hljs.highlight(debugOut(tracks, 0, false), {
      language: "javascript",
    }).value;

  return (
    <>
      <pre
        style={{
          overflow: "scroll",
          background: "#222",
          margin: "0px 4px",
          textAlign: "left",
          width: 400,
          fontSize: 12,
          userSelect: "text",
        }}
        dangerouslySetInnerHTML={{ __html: value }}
      ></pre>
      <div style={{ overflow: "scroll", background: "#222", flexGrow: 1 }}>
        <pre>
          Viewport: |{viewportStartPx}px -{projectDivWidth}-<br />
          Cursor: {cursorPos} {selectionWidth} <br />
          Cursor Tracks: {[...cursorTracks.values()].map((track) => `${track.name.get()}`)}
        </pre>
        <div>
          <hr></hr>
          <br />
          Selected: {stringOfSelected(selected)}
          <br />
          Pressed: {pressed?.status}
          <br />
          Active Track: {activeTrack?.name.get()}
        </div>
      </div>

      <div
        style={{
          marginLeft: 4,
          overflow: "scroll",
          background: "#222",
          flexShrink: 1,
          minHeight: 0,
          maxHeight: "100%",
        }}
      >
        <pre
          style={{
            overflow: "scroll",
            background: "#222",
            margin: "0px 4px",
            textAlign: "left",
            width: 400,
            fontSize: 12,
            userSelect: "text",
          }}
        >
          {allState}
        </pre>
      </div>
    </>
  );
}
