import { MarkedValue } from "marked-subbable";
import { SAudioClip, SMidiClip, construct, serializable } from "../../data/serializable";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { NoteT } from "../../midi/SharedMidiTypes";
import { exhaustive } from "../../utils/exhaustive";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { standardTrack } from "../StandardTrack";
import { AudioProject } from "./AudioProject";
import { pulsesToSec } from "./TimelineT";

export type ClipboardState =
  | {
      kind: "clips";
      // Clips are stored serialized (not as live instances) so a clipboard entry is an immutable
      // snapshot that can't drift with later edits, and reconstructs into fresh clips (new ids)
      // on paste. See serializeClip / placeClipCopy.
      clips: ReadonlyArray<SAudioClip | SMidiClip>;
    }
  | {
      kind: "tracks";
      tracks: ReadonlyArray<AudioTrack | MidiTrack>;
    }
  | {
      kind: "effects";
      effects: ReadonlyArray<{ effect: FaustAudioEffect | PambaWamNode }>;
    }
  | {
      // MIDI notes copied from a clip editor, as immutable `[tick, number, duration, velocity]`
      // snapshots. Pasted into the active MIDI editor at the playhead (see midiClip.pasteNotes).
      kind: "notes";
      notes: ReadonlyArray<NoteT>;
    };

export const clipboard = MarkedValue.create<ClipboardState | null>(null);

export async function serializeClip(clip: AudioClip | MidiClip): Promise<SAudioClip | SMidiClip | null> {
  if (clip instanceof AudioClip) {
    return serializable(clip);
  }
  return serializable(clip);
}

/**
 * Reconstructs a serialized clip and places it onto `track` starting at `startSec`, when their
 * kinds match (audio↔audio, midi↔midi). Returns the new clip's end time in seconds, or null on
 * mismatch. `construct` yields a fresh instance (new id), so this is safe to call repeatedly from
 * a clipboard that outlives its source — unlike the index-locator resources used by drag-and-drop.
 * A future `audioclipinstance` drop handler can route through here too.
 */
export async function placeClipCopy(
  project: AudioProject,
  track: AudioTrack | MidiTrack,
  serialized: SAudioClip | SMidiClip,
  startSec: number,
): Promise<number | null> {
  if (track instanceof MidiTrack && serialized.kind === "MidiClip") {
    const clip = await construct(serialized);
    clip.timelineStart.set(project.viewport.secsToPulses(startSec), "pulses");
    standardTrack.addClip(project, track, clip);
    return pulsesToSec(clip.timelineEndPulses(), project.tempo.get());
  }

  if (track instanceof AudioTrack && serialized.kind === "AudioClip") {
    const clip = await construct(serialized);
    clip.timelineStart.set(startSec, "seconds");
    standardTrack.addClip(project, track, clip);
    return clip.getTimelineEndSec();
  }

  return null;
}

export async function doPaste(project: AudioProject) {
  const copied = clipboard.get();
  if (copied == null) {
    return;
  }

  switch (copied.kind) {
    case "clips": {
      const pasteAt = project.cursorPos.get();
      let lastOffset = pasteAt;
      for (const track of project.cursorTracks) {
        for (const clip of copied.clips) {
          const endSec = await placeClipCopy(project, track, clip, pasteAt);
          if (endSec == null) {
            console.warn("paste: clip/track mismatch");
            continue;
          }
          lastOffset = Math.max(lastOffset, endSec);
        }
      }

      if (lastOffset !== pasteAt) {
        project.cursorPos.set(lastOffset);
      }

      break;
    }
    case "notes":
      // Notes paste into the focused MIDI editor; that path is handled in the paste command
      // (which has the active clip/track), so there's nothing to do for a generic paste here.
      break;
    case "effects":
    case "tracks":
      break;
    default:
      exhaustive(copied);
  }
}
