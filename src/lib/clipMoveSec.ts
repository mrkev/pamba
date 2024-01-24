import { MidiClip, secsToPulses } from "../midi/MidiClip";
import { getOneTickLen } from "../ui/Axis";
import { returnClosest, stepNumber } from "../utils/math";
import { AudioClip } from "./AudioClip";
import { secs } from "./BaseClip";
import { AudioProject } from "./project/AudioProject";

export function clipMoveSec(
  clip: AudioClip,
  newOffsetSec: number,
  originalStartOffsetSec: number,
  project: AudioProject,
  snap: boolean,
) {
  if (!snap) {
    clip.timelineStartSec = secs(newOffsetSec);
    clip._notifyChange();
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    const steppedToTick = stepNumber(newOffsetSec, tickBeatLength);
    const steppedToOriginalStart = stepNumber(newOffsetSec, tickBeatLength, originalStartOffsetSec);
    const result = returnClosest(newOffsetSec, steppedToTick, steppedToOriginalStart);
    clip.timelineStartSec = secs(result);
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
