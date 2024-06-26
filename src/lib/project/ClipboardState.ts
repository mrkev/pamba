import { AudioTrack } from "../AudioTrack";
import { AudioClip } from "../AudioClip";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { MidiTrack } from "../../midi/MidiTrack";
import { MidiClip, pulsesToSec } from "../../midi/MidiClip";
import { LinkedState } from "../state/LinkedState";
import { AudioProject } from "./AudioProject";
import { exhaustive } from "../state/Subbable";
import { secs } from "../AbstractClip";
import { ProjectTrack } from "../ProjectTrack";

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

export const clipboard = LinkedState.of<ClipboardState | null>(null);

export function doPaste(project: AudioProject) {
  const copied = clipboard.get();
  if (copied == null) {
    return;
  }

  switch (copied.kind) {
    case "clips": {
      let lastOffset = project.cursorPos.get();
      for (const track of project.cursorTracks) {
        for (const clip of copied.clips) {
          if (track instanceof MidiTrack && clip instanceof MidiClip) {
            const clone = clip.clone();
            clone.setStartOffsetPulses(project.viewport.secsToPulses(project.cursorPos.get()));
            ProjectTrack.addClip(project, track, clone);
            const endOffsetSec = pulsesToSec(clone._timelineEndU, project.tempo.get());
            if (lastOffset < endOffsetSec) {
              lastOffset = endOffsetSec;
            }
            continue;
          }

          if (track instanceof AudioTrack && clip instanceof AudioClip) {
            const clone = clip.clone();
            clone.timelineStartSec = secs(project.cursorPos.get());

            ProjectTrack.addClip(project, track, clone);
            if (lastOffset < clone.timelineEndSec) {
              lastOffset = clone.timelineEndSec;
            }

            continue;
          }

          console.warn("paste: clip/track mismatch");
        }
      }

      if (lastOffset !== project.cursorPos.get()) {
        project.cursorPos.set(lastOffset);
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
