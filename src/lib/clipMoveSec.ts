import { MidiClip, secsToPulses } from "../midi/MidiClip";
import { stepNumber } from "../utils/math";
import { AudioProject } from "./project/AudioProject";
import { AudioClip } from "./AudioClip";

export function clipMoveSec(clip: AudioClip, newOffsetSec: number, project: AudioProject, snap: boolean) {
  if (!snap) {
    clip.startOffsetSec = newOffsetSec;
    clip._notifyChange();
  } else {
    const tempo = project.tempo.get();
    const oneBeatLen = 60 / tempo;
    const actualNewOffsetSec = stepNumber(newOffsetSec, oneBeatLen);
    clip.startOffsetSec = actualNewOffsetSec;
    clip._notifyChange();
  }
}

export function clipMovePPQN(clip: MidiClip, newOffsetSec: number, project: AudioProject, snap: boolean) {
  // todo: snap arg to snap to larger grid, vs PPQN
  const bpm = project.tempo.get();

  if (!snap) {
    const pulses = secsToPulses(newOffsetSec, bpm);
    clip.startOffsetPulses = pulses;
    clip.notifyUpdate();
  } else {
    const tempo = project.tempo.get();
    const oneBeatLen = 60 / tempo;
    const actualNewOffsetSec = stepNumber(newOffsetSec, oneBeatLen);
    const pulses = secsToPulses(actualNewOffsetSec, bpm);
    clip.startOffsetPulses = pulses;
    clip.notifyUpdate();
  }
}
