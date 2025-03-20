import { MidiClip } from "../midi/MidiClip";
import { getOneTickLen } from "../ui/Axis";
import { clamp, returnClosest, stepNumber } from "../utils/math";
import { PPQN } from "../wam/miditrackwam/MIDIConfiguration";
import { AudioClip } from "./AudioClip";
import { AudioProject } from "./project/AudioProject";
import { TimelineT } from "./project/TimelineT";

export function clipResizeEndSec(clip: AudioClip, newLengthSec: number, project: AudioProject, snap: boolean) {
  const newClipEnd = clamp(
    // We can't trim a clip to end before it's beggining
    0,
    newLengthSec,
    // and also prevent it from extending beyond its original length
    clip.bufferLength - clip.bufferOffset.ensureSecs(),
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

export function clipResizeEndPulses(clip: MidiClip, newLengthPulses: number, originalEndPulses: number, snap: boolean) {
  // We can't trim a clip to end before it's beggining
  // note: we don't clamp because midi clips can grow as long as we want them to
  const newClipEnd = Math.min(0, newLengthPulses);

  if (!snap) {
    clip.timelineLength.set(newLengthPulses, "pulses");
  } else {
    const steppedToTick = stepNumber(newClipEnd, PPQN);
    const steppedToOriginalEnd = stepNumber(newLengthPulses, PPQN * 4, originalEndPulses);
    const result = returnClosest(newLengthPulses, steppedToTick, steppedToOriginalEnd);
    clip.timelineLength.set(result, "pulses");
  }
}

export function clipResizeStartSec(
  clip: AudioClip,
  newClipLengthS: number,
  newBufferOffset: number,
  newTimelineStartSec: number,
  project: AudioProject,
  snap: boolean,
) {
  if (!snap) {
    clip.bufferOffset.set(newBufferOffset, "seconds");
    clip.timelineStart.set(newTimelineStartSec, "seconds");
    clip.timelineLength.set(newClipLengthS, "seconds");
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    const startStepped = stepNumber(newTimelineStartSec, tickBeatLength);

    const delta2 = startStepped - newTimelineStartSec;
    const bufferOffsetStepped = newBufferOffset + delta2;
    const lengthStepped = newClipLengthS - delta2;

    clip.bufferOffset.set(bufferOffsetStepped, "seconds");
    clip.timelineStart.set(startStepped, "seconds");
    clip.timelineLength.set(lengthStepped, "seconds");
  }
}

export function clipMoveSec(
  clip: AudioClip,
  newOffsetSec: number,
  originalStart: TimelineT,
  project: AudioProject,
  snap: boolean,
) {
  if (!snap) {
    clip.timelineStart.set(newOffsetSec, "seconds");
  } else {
    const tempo = project.tempo.get();
    const tickBeatLength = getOneTickLen(project, tempo);
    const steppedToTick = stepNumber(newOffsetSec, tickBeatLength);
    const steppedToOriginalStart = stepNumber(newOffsetSec, tickBeatLength, originalStart.secs(project));
    const result = returnClosest(newOffsetSec, steppedToTick, steppedToOriginalStart);
    clip.timelineStart.set(result, "seconds");
  }
}

export function clipMovePPQN(
  clip: MidiClip,
  newOffsetPulses: number,
  originalStart: TimelineT,
  project: AudioProject,
  snap: boolean,
) {
  if (!snap) {
    clip.timelineStart.set(newOffsetPulses, "pulses");
  } else {
    const steppedToTick = stepNumber(newOffsetPulses, PPQN);
    const steppedToOriginalStart = stepNumber(newOffsetPulses, PPQN * 4, originalStart.pulses(project));
    const result = returnClosest(newOffsetPulses, steppedToTick, steppedToOriginalStart);
    clip.timelineStart.set(result, "pulses");
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
