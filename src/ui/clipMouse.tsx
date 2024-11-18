import type { AudioClip } from "../lib/AudioClip";
import type { AudioTrack } from "../lib/AudioTrack";
import type { AudioProject } from "../lib/project/AudioProject";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { modifierState } from "./ModifierState";
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

  project.selected.setDyn((prev) => {
    const selectAdd = modifierState.meta || modifierState.shift;
    if (selectAdd && prev !== null && prev.status === "clips") {
      if (!prev.test.has(clip)) {
        prev.clips.push(cliptrack);
        prev.test.add(clip);
        prev.test.add(track);
      }
      return { ...prev };
    } else {
      return {
        status: "clips",
        clips: [cliptrack],
        test: new Set([clip, track]),
      };
    }
  });

  project.selectionWidth.set(null);
}

export function clipMouseDownToResize(
  e: React.MouseEvent<HTMLDivElement>,
  { clip, track }: ClipTrackCombo,
  from: "start" | "end",
) {
  if (e.button !== 0) {
    return;
  }
  pressedState.set({
    status: "resizing_clip",
    clip,
    originalBufferOffset: clip.bufferOffset.clone(),
    originalClipStart: clip.timelineStart.clone(),
    originalClipLength: clip.timelineLength.clone(),
    from,
    clientX: e.clientX,
    clientY: e.clientY,
    inHistory: false,
    track,
  });
  e.stopPropagation();
}
