import { AudioTrack } from "../AudioTrack";
import { AudioClip } from "../AudioClip";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { MidiTrack } from "../../midi/MidiTrack";
import { MidiClip } from "../../midi/MidiClip";
import { SPrimitive } from "../state/LinkedState";
import { AudioProject } from "./AudioProject";
import { exhaustive } from "../state/Subbable";

export type ClipboardState =
  | {
      kind: "clips";
      clips: ReadonlyArray<AudioClip | MidiClip>;
    }
  | {
      kind: "tracks";
      tracks: ReadonlyArray<AudioTrack | MidiTrack>;
    }
  | {
      kind: "effects";
      effects: ReadonlyArray<{ effect: FaustAudioEffect | PambaWamNode }>;
    };

export const clipboard = SPrimitive.of<ClipboardState | null>(null);

export function doPaste(project: AudioProject) {
  const copied = clipboard.get();
  if (copied == null) {
    return;
  }

  switch (copied.kind) {
    case "clips": {
      for (const track of project.cursorTracks) {
        for (const clip of copied.clips) {
          if (track instanceof MidiTrack && clip instanceof MidiClip) {
            const clone = clip.clone();
            clone.startOffsetPulses = project.viewport.secsToPulses(project.cursorPos.get());
            track.addClip(clone);
            continue;
          }

          if (track instanceof AudioTrack && clip instanceof AudioClip) {
            const clone = clip.clone();
            clone.startOffsetSec = project.cursorPos.get();

            track.addClip(clone);
            continue;
          }

          console.warn("paste: clip/track mismatch");
        }
      }

      break;
    }
    case "effects":
    case "tracks":
      break;
    default:
      exhaustive(copied);
  }
}
