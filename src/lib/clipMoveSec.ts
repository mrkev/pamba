import { MidiClip } from "../midi/MidiClip";
import { getOneTickLen } from "../ui/Axis";
import { clamp, returnClosest, stepNumber } from "../utils/math";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";
import { secs } from "./AbstractClip";
import { AudioClip } from "./AudioClip";
import { AudioProject } from "./project/AudioProject";
import { TimelineT } from "./project/TimelineT";

export function clipResizeEndSec(clip: AudioClip, newLengthSec: number, project: AudioProject, snap: boolean) {
  const newClipEnd = clamp(
    // We can't trim a clip to end before it's beggining
    0,
    newLengthSec,
    // and also prevent it from extending beyond its original length
    clip.bufferLength - clip.bufferOffset,
  );

  if (!snap) {
    clip.timelineLength.set(newLengthSec, "seconds");
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    const steppedToTick = stepNumber(newClipEnd, tickBeatLength);
    // TODO: add original location too as tick too
    clip.timelineLength.set(steppedToTick, "seconds");
  }
}

export function clipResizeStartSec(
  clip: AudioClip,
  newBufferOffset: number,
  newTimelineStartSec: number,
  newClipLength: number,
  project: AudioProject,
  snap: boolean,
) {
  if (!snap) {
    clip.bufferOffset = secs(newBufferOffset);
    clip.timelineStart.set(newTimelineStartSec, "seconds");
    clip.timelineLength.set(newClipLength, "seconds");
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    const startStepped = stepNumber(newTimelineStartSec, tickBeatLength);

    const delta = startStepped - newTimelineStartSec;
    const bufferOffsetStepped = newBufferOffset + delta;
    const lengthStepped = newClipLength + delta;

    clip.bufferOffset = secs(bufferOffsetStepped);
    clip.timelineStart.set(startStepped, "seconds");
    clip.timelineLength.set(lengthStepped, "seconds");
  }
}

export function clipMoveSec(
  clip: AudioClip,
  newOffsetSec: number,
  originalStartOffsetSec: number,
  project: AudioProject,
  snap: boolean,
) {
  if (!snap) {
    clip.timelineStart.set(newOffsetSec, "seconds");
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    const steppedToTick = stepNumber(newOffsetSec, tickBeatLength);
    const steppedToOriginalStart = stepNumber(newOffsetSec, tickBeatLength, originalStartOffsetSec);
    const result = returnClosest(newOffsetSec, steppedToTick, steppedToOriginalStart);
    clip.timelineStart.set(result, "seconds");
  }
}

export function clipMovePPQN(clip: MidiClip, newOffsetPulses: number, project: AudioProject, snap: boolean) {
  if (!snap) {
    clip.timelineStart.set(newOffsetPulses, "pulses");
  } else {
    // todo: snap arg to snap to larger grid, vs just PPQN
    const pulses = stepNumber(newOffsetPulses, PPQN);
    clip.timelineStart.set(pulses, "pulses");
  }
}

export function pointMoveSec(
  project: AudioProject,
  point: TimelineT,
  newOffsetSec: number,
  snap: boolean,
  originalStartOffsetSec?: number,
) {
  if (!snap) {
    point.set(newOffsetSec);
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    let steppedToTick = stepNumber(newOffsetSec, tickBeatLength);
    if (typeof originalStartOffsetSec === "number") {
      steppedToTick = stepNumber(newOffsetSec, tickBeatLength, originalStartOffsetSec);
    }
    const result = returnClosest(newOffsetSec, steppedToTick, steppedToTick);
    point.set(result);
  }
}

export function pointMovePulses(project: AudioProject, point: TimelineT, newOffsetPulses: number, snap: boolean) {
  // todo: snap arg to snap to larger grid, vs PPQN

  if (!snap) {
    point.set(newOffsetPulses, "pulses");
  } else {
    const actualNewOffsetPulses = stepNumber(newOffsetPulses, PPQN);
    point.set(actualNewOffsetPulses, "pulses");
  }
}
