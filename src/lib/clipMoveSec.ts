import { MidiClip, secsToPulses } from "../midi/MidiClip";
import { getOneTickLen } from "../ui/Axis";
import { clamp, returnClosest, stepNumber } from "../utils/math";
import { AudioClip } from "./AudioClip";
import { secs } from "./AbstractClip";
import { AudioProject } from "./project/AudioProject";
import { TimelinePoint } from "./project/TimelinePoint";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";

export function clipResizeEndSec(clip: AudioClip, newLength: number, project: AudioProject, snap: boolean) {
  const newClipEnd = clamp(
    // We can't trim a clip to end before it's beggining
    0,
    newLength,
    // and also prevent it from extending beyond its original length
    clip.bufferLength - clip.bufferOffset,
  );

  if (!snap) {
    clip.clipLengthSec = secs(newClipEnd);
    console.log("no snap");
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    const steppedToTick = stepNumber(newClipEnd, tickBeatLength);
    // TODO: add original location too as tick too
    if (clip.clipLengthSec !== steppedToTick) {
      clip.clipLengthSec = secs(steppedToTick);
      clip._notifyChange();
      console.log("snap");
    }
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
  const newClipEnd = 0; // TODO
  if (!snap) {
    clip.bufferOffset = secs(newBufferOffset);
    clip.timelineStartSec = secs(newTimelineStartSec);
    clip.clipLengthSec = secs(newClipLength);
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    const steppedToTick = stepNumber(newClipEnd, tickBeatLength);
    // TODO: add original location too
    if (
      clip.clipLengthSec !== steppedToTick ||
      clip.timelineStartSec !== newTimelineStartSec ||
      clip.bufferOffset !== newBufferOffset
    ) {
      clip.bufferOffset = secs(newBufferOffset);
      clip.timelineStartSec = secs(newTimelineStartSec);
      clip.clipLengthSec = secs(newClipLength);
      clip._notifyChange();
      console.log("snap");
    }
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
    clip._notifyChange();
  } else {
    const tempo = project.tempo.get();
    const oneBeatLen = 60 / tempo;
    const actualNewOffsetSec = stepNumber(newOffsetSec, oneBeatLen);
    const pulses = secsToPulses(actualNewOffsetSec, bpm);
    clip.startOffsetPulses = pulses;
    clip._notifyChange();
  }
}

export function pointMoveSec(
  project: AudioProject,
  point: TimelinePoint,
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

export function pointMovePulses(project: AudioProject, point: TimelinePoint, newOffsetPulses: number, snap: boolean) {
  // todo: snap arg to snap to larger grid, vs PPQN

  if (!snap) {
    point.set(newOffsetPulses, "pulses");
  } else {
    const actualNewOffsetPulses = stepNumber(newOffsetPulses, PPQN);
    point.set(actualNewOffsetPulses, "pulses");
  }
}
