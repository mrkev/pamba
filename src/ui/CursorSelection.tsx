import { useLinkAsState } from "marked-subbable";
import { useContainer, usePrimitive } from "structured-state";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "./pressedState";

export function CursorSelection({
  project,
  track,
  leftOffset = 0,
}: {
  project: AudioProject;
  track: AudioTrack | MidiTrack | null;
  leftOffset?: number;
}) {
  const [cursorPos] = usePrimitive(project.cursorPos);
  const [selectionWidth] = usePrimitive(project.selectionWidth);
  const cursorTracks = useContainer(project.cursorTracks);
  const [selected] = useLinkAsState(project.selected);
  const [pressed] = usePrimitive(pressedState);

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

  return (
    <div
      className="absolute h-full"
      style={{
        backdropFilter: "invert(100%) brightness(0.9) saturate(0.8)",
        left:
          (selectionWidth == null || selectionWidth >= 0
            ? project.viewport.secsToPx(cursorPos)
            : project.viewport.secsToPx(cursorPos + selectionWidth)) + leftOffset,
        width: selectionWidth == null || selectionWidth === 0 ? 1 : project.viewport.secsToPx(Math.abs(selectionWidth)),
      }}
    ></div>
  );
}
