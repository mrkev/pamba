import type { AudioClip } from "../lib/AudioClip";
import type { AudioTrack } from "../lib/AudioTrack";
import type { AudioProject } from "../lib/project/AudioProject";
import { selection } from "../lib/project/selection";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "./pressedState";

// import { dataWaveformToCanvas } from "../lib/waveformAsync";
type ClipTrackCombo =
  | { kind: "audio"; clip: AudioClip; track: AudioTrack }
  | { kind: "midi"; clip: MidiClip; track: MidiTrack };

export function clipMouseDownToMove(e: MouseEvent, cliptrack: ClipTrackCombo, project: AudioProject) {
  const { clip, track } = cliptrack;
  if (e.button !== 0) {
    return;
  }
  const clipForRendering = clip.clone();
  pressedState.set({
    status: "moving_clip",
    clientX: e.clientX,
    clientY: e.clientY,
    clip,
    track,
    originalTrack: track,
    originalClipStart: clip.timelineStart.clone(),
    clipForRendering,
    inHistory: false,
  });

  const selectAdd = e.metaKey || e.shiftKey;
  selection.selectClip(project, cliptrack, selectAdd);
  project.selectionWidth.set(null);
}
