import { MarkedValue } from "marked-subbable";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { ProjectTrack } from "../ProjectTrack";
import { exhaustive } from "../state/Subbable";
import { AudioProject } from "./AudioProject";
import { pulsesToSec } from "./TimelineT";

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

export const clipboard = MarkedValue.create<ClipboardState | null>(null);

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
            clone.timelineStart.set(project.viewport.secsToPulses(project.cursorPos.get()), "pulses");
            ProjectTrack.addClip(project, track, clone);
            const endOffsetSec = pulsesToSec(clone.timelineEndPulses(), project.tempo.get());
            if (lastOffset < endOffsetSec) {
              lastOffset = endOffsetSec;
            }
            continue;
          }

          if (track instanceof AudioTrack && clip instanceof AudioClip) {
            const clone = clip.clone();
            clip.timelineStart.set(project.cursorPos.get(), "seconds");

            ProjectTrack.addClip(project, track, clone);
            if (lastOffset < clone.getTimelineEndSec()) {
              lastOffset = clone.getTimelineEndSec();
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
