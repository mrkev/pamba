import { CLIP_MIN_SIZE_PULSES } from "../constants";
import { MidiClip } from "../midi/MidiClip";
import { getOneTickLen } from "../ui/axis/getBeatTickData";
import { clamp, returnClosest, stepNumber } from "../utils/math";
import { PPQN } from "../wam/miditrackwam/MIDIConfiguration";
import { AudioClip } from "./AudioClip";
import { AudioProject } from "./project/AudioProject";
import { time, TimelineT } from "./project/TimelineT";

/** A clip's edges as they were when a resize drag started. */
export type ClipEdgesOriginal = { start: TimelineT; len: TimelineT; bufferOffset: TimelineT };

/**
 * Snaps a dragged clip edge (in the clip's unit) to the grid, or to a grid offset by where the
 * edge started, whichever is closer. Same grids as moving a clip (clipMoveSec, clipMovePPQN).
 */
function snapClipEdge(project: AudioProject, clip: AudioClip | MidiClip, edge: number, originalEdge: number) {
  if (clip instanceof MidiClip) {
    return returnClosest(edge, stepNumber(edge, PPQN), stepNumber(edge, PPQN * 4, originalEdge));
  }
  const tickBeatLength = getOneTickLen(project, project.tempo.get());
  return returnClosest(edge, stepNumber(edge, tickBeatLength), stepNumber(edge, tickBeatLength, originalEdge));
}

/** Snaps a dragged edge if `snap`; otherwise just keeps MIDI edges on whole pulses. */
function dragClipEdge(
  project: AudioProject,
  clip: AudioClip | MidiClip,
  edge: number,
  originalEdge: number,
  snap: boolean,
) {
  if (snap) {
    return snapClipEdge(project, clip, edge, originalEdge);
  }
  return clip.timelineLength.unit === "pulses" ? Math.round(edge) : edge;
}

/**
 * The shortest a resize drag makes a clip, in the clip's unit. A clip that's already shorter
 * can't be shrunk further, but keeps its length.
 */
function minDragLength(project: AudioProject, clip: AudioClip | MidiClip, originalLen: number) {
  const minLen = time(CLIP_MIN_SIZE_PULSES, "pulses").asUnit(clip.timelineLength.unit, project);
  return Math.min(minLen, originalLen);
}

/**
 * The length (in the clip's unit) a clip gets when its end edge is dragged by `deltaU` (also in
 * the clip's unit). Snaps the absolute end, keeps a minimum length, and doesn't grow an audio
 * clip past the end of its buffer. MIDI clips can grow as long as we want them to.
 */
export function clipResizeEndTarget(
  project: AudioProject,
  clip: AudioClip | MidiClip,
  original: ClipEdgesOriginal,
  deltaU: number,
  snap: boolean,
): number {
  const unit = clip.timelineLength.unit;
  const start = original.start.asUnit(unit, project);
  const originalLen = original.len.asUnit(unit, project);
  const originalEnd = start + originalLen;
  const end = dragClipEdge(project, clip, originalEnd + deltaU, originalEnd, snap);
  const maxLen =
    clip instanceof AudioClip ? clip.getBufferLength() - original.bufferOffset.asUnit(unit, project) : Infinity;
  return clamp(minDragLength(project, clip, originalLen), end - start, maxLen);
}

/**
 * The start (in the clip's unit) a clip gets when its start edge is dragged by `deltaU` (also
 * in the clip's unit), keeping its end in place. Snaps the start, keeps a minimum length, and
 * doesn't extend an audio clip before the start of its buffer.
 */
export function clipResizeStartTarget(
  project: AudioProject,
  clip: AudioClip | MidiClip,
  original: ClipEdgesOriginal,
  deltaU: number,
  snap: boolean,
): number {
  const unit = clip.timelineLength.unit;
  const originalStart = original.start.asUnit(unit, project);
  const originalLen = original.len.asUnit(unit, project);
  const end = originalStart + originalLen;
  const start = dragClipEdge(project, clip, originalStart + deltaU, originalStart, snap);
  const minStart =
    clip instanceof AudioClip ? Math.max(0, originalStart - original.bufferOffset.asUnit(unit, project)) : 0;
  return clamp(minStart, start, end - minDragLength(project, clip, originalLen));
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
