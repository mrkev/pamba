import { useLinkAsState } from "marked-subbable";
import { DebugOut, useContainer, usePrimitive } from "structured-state";
import { ProjectTrack } from "../lib/ProjectTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { PrimarySelectionState } from "../lib/project/SelectionState";
import { exhaustive } from "../utils/exhaustive";
import { pressedState } from "./pressedState";

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

    case "loop_marker":
      return JSON.stringify(sel);

    default:
      exhaustive(status);
  }

  return JSON.stringify(sel);
}

export function DebugContent({ project }: { project: AudioProject }) {
  const [selected] = useLinkAsState(project.selected);
  const [cursorPos] = usePrimitive(project.cursorPos);
  const [selectionWidth] = usePrimitive(project.selectionWidth);
  const tracks = useContainer(project.allTracks);
  const [pressed] = usePrimitive(pressedState);
  const [activeTrack] = usePrimitive(project.activeTrack);
  const cursorTracks = useContainer(project.cursorTracks);
  const [viewportStartPx] = usePrimitive(project.viewport.viewportStartPx);
  const [projectDivWidth] = usePrimitive(project.viewport.projectDivWidth);

  if (window.location.host.indexOf("localhost") === -1) {
    return null;
  }

  const allState = tracks
    .map((track, i) => {
      return `Track ${i}:\n${ProjectTrack.toString(track)}\n`;
    })
    .join("\n");

  // const value =
  //   " ## Track Structure<br /><br />" +
  //   hljs.highlight(debugOut(tracks, 0, false), {
  //     language: "javascript",
  //   }).value;

  return (
    <>
      <DebugOut
        val={tracks}
        showUnknowns={false}
        style={{
          background: "#222",
          margin: "0px 4px 0px 0px",
          padding: "4px",
          width: 400,
          fontSize: 12,
          userSelect: "text",
        }}
      />
      {/* <pre
        style={{
          overflow: "scroll",
          background: "#222",
          margin: "0px 4px 0px 0px",
          textAlign: "left",
          width: 400,
          fontSize: 12,
          userSelect: "text",
        }}
        dangerouslySetInnerHTML={{ __html: value }}
      ></pre> */}
      <div style={{ overflow: "scroll", background: "#222", flexGrow: 1 }}>
        <pre>
          Project: {project.projectId}
          <br />
          Viewport: |{viewportStartPx}px -{projectDivWidth}-<br />
          Cursor: {cursorPos} {selectionWidth} <br />
          Cursor Tracks: {[...cursorTracks.values()].map((track) => `${track.name.get()}`)}
        </pre>
        <div>
          <hr></hr>
          <br />
          Selected: {stringOfSelected(selected)}
          <br />
          Pressed: {pressed?.status} {pressed?.status === "dragging_transferable" && pressed.kind}
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
