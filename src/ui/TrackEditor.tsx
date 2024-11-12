import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiTrack } from "../midi/MidiTrack";
import { EffectRack } from "./EffectRack";

export function TrackEditor({
  track,
  project,
  renderer,
}: {
  track: MidiTrack | AudioTrack;
  project: AudioProject;
  renderer: AudioRenderer;
}) {
  return (
    <>
      <EffectRack track={track} project={project} renderer={renderer} />
    </>
  );
}
