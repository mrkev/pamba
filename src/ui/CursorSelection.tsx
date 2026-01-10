import { useLinkAsState } from "marked-subbable";
import { useContainer, usePrimitive } from "structured-state";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "./pressedState";

export function CursorSelection({ project, track }: { project: AudioProject; track: AudioTrack | MidiTrack | null }) {
  const [cursorPos] = usePrimitive(project.cursorPos);
  const [selectionWidthRaw] = usePrimitive(project.selectionWidth);
  const cursorTracks = useContainer(project.cursorTracks);
  const [selected] = useLinkAsState(project.selected);
  const [pressed] = usePrimitive(pressedState);
  const selectionWidth = selectionWidthRaw == null ? 0 : selectionWidthRaw;

  const show =
    // global
    ((pressed?.status === "selecting_track_time" || selected?.status === "track_time") &&
      track &&
      cursorTracks.has(track)) ||
    // track
    pressed?.status === "selecting_global_time" ||
    selected?.status === "time";

  if (!show) {
    return null;
  }

  let left =
    // it's in the header if track == null
    track == null
      ? //
        project.viewport.secsToViewportPx(cursorPos)
      : project.viewport.secsToPx(cursorPos);
  let width = project.viewport.secsToPx(Math.abs(selectionWidth));

  if (selectionWidth < 0) {
    left = left - width;
    width = Math.abs(width);
  }

  return (
    <div
      className="absolute h-full top-0"
      style={{
        backdropFilter: "invert(100%) brightness(0.9) saturate(0.8)",
        left,
        width,
      }}
    ></div>
  );
}
