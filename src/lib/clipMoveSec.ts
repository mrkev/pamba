import { CLIP_MIN_SIZE_PULSES } from "../constants";
import { MidiClip } from "../midi/MidiClip";
import { clamp } from "../utils/math";
import { AudioClip } from "./AudioClip";
import { AudioProject } from "./project/AudioProject";
import { time, TimelineT } from "./project/TimelineT";
import { timelinePos } from "./viewport/snap";

/** A clip's edges as they were when a resize drag started. */
export type ClipEdgesOriginal = { start: TimelineT; len: TimelineT; bufferOffset: TimelineT };

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
  const end = timelinePos(project, snap, originalEnd + deltaU, unit, originalEnd);
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
  const start = timelinePos(project, snap, originalStart + deltaU, unit, originalStart);
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
  clip.timelineStart.set(timelinePos(project, snap, newOffsetSec, "seconds", originalStart.secs(project)), "seconds");
}

export function clipMovePPQN(
  clip: MidiClip,
  newOffsetPulses: number,
  originalStart: TimelineT,
  project: AudioProject,
  snap: boolean,
) {
  clip.timelineStart.set(timelinePos(project, snap, newOffsetPulses, "pulses", originalStart.pulses(project)), "pulses");
}

export function pointMoveSec(project: AudioProject, point: TimelineT, newOffsetSec: number, snap: boolean) {
  point.set(timelinePos(project, snap, newOffsetSec, "seconds"));
}

export function pointMovePulses(project: AudioProject, point: TimelineT, newOffsetPulses: number, snap: boolean) {
  point.set(timelinePos(project, snap, newOffsetPulses, "pulses"), "pulses");
}
