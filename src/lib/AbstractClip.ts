import { SArray, Structured } from "structured-state";
import { nullthrows } from "../utils/nullthrows";
import { TimelineT } from "./project/TimelineT";

export function printClips(clips: SArray<AbstractClip<any>>) {
  return clips.map((c) => c.toString()).join("\n");
}

export function assertClipInvariants<U extends Pulses | Seconds>(clips: SArray<AbstractClip<U>>) {
  if (clips.length == 0) {
    return;
  }

  // All clips on a track are stored in the same unit (seconds for audio,
  // pulses for midi), so we measure everything against the first clip's unit.
  // `ensure` throws if a clip disagrees, which enforces that invariant here.
  // (bars/frames are not a valid clip storage unit.)
  const unit = nullthrows(clips.at(0)).timelineStart.unit;

  let cStart = 0;
  let cEnd = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = nullthrows(clips.at(i));
    const clipStart = clip.timelineStart.ensure(unit);
    const clipEnd = clipStart + clip.timelineLength.ensure(unit);

    if (clipStart < cStart) {
      throw new Error("Failed invariant: clips are not sorted.\n" + "They look like this:\n" + printClips(clips));
    }

    if (cEnd > clipStart) {
      throw new Error("Failed invariant: clips overlap.\n" + "They look like this:\n" + printClips(clips));
    }

    cStart = clipStart;
    cEnd = clipEnd;
  }
}

export function addClip<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  newClip: Clip,
  clips: SArray<Clip>,
): void {
  // Essentially, we want to insert in order, sorted
  // by the _timelineStartU of each clip.
  let i = 0;
  let _prev: Clip | undefined;
  let next: Clip | undefined;
  for (; i < clips.length; i++) {
    _prev = i == 0 ? undefined : clips.at(i - 1);
    next = clips.at(i);

    // We want to iterate until i
    // we find a spot where if we were to keep going we'd be
    // later than the next clip
    if (next && next._timelineStartU < newClip._timelineStartU) {
      continue;
    }

    if (next && next._timelineStartU >= newClip._timelineStartU) {
      // we insert here
      break;
    }
  }

  deleteTime(newClip._timelineStartU, newClip._timelineEndU, clips);

  // Insert the clip

  clips.splice(i, 0, newClip);

  // if (prev && prev.endOffsetSec > newClip.startOffsetSec) {
  //   // TODO: delete time range within current clip and insert it.

  //   prev.endOffsetSec = newClip.startOffsetSec;

  //   console.log("TODO: CLIP PREV");
  //   // prev.endPosSec = newClip.startOffsetSec;
  // }
  // if (next && next.startOffsetSec < newClip.endOffsetSec) {
  //   next.startOffsetSec = newClip.endOffsetSec;
  // }

  assertClipInvariants(clips);
}

function simplyAddSorted<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  newClips: Clip[],
  clips: SArray<Clip>,
): void {
  if (newClips.length === 0) {
    return;
  }

  // TODO: add pushAll to substate to avoid possible stack overflows
  clips.push(...newClips);
  clips.sort((a, b) => a._timelineStartU - b._timelineStartU);
}

/**
 * deletes/trims clips as necessary to make the time from
 * start to end, using track units
 */
export function deleteTime<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  start: number, // in timeline units
  end: number, // in timeline units
  clips: SArray<Clip>,
): Clip[] {
  if (start === end) {
    return [];
  }

  if (start > end) {
    throw new Error("Invariant Violation: startSec > endSec in deleteTime");
  }

  const toRemove = [];
  const toResort = [];

  const notifyClips = [];
  const res = clips;
  for (let i = 0; i < clips.length; i++) {
    const current = nullthrows(clips.at(i));
    const cStart = current._timelineStartU;
    const cEnd = current._timelineEndU;

    // No overlap with the deleted range. Touching at a single boundary
    // (cEnd === start or cStart === end) counts as no overlap, so a clip that
    // merely abuts the range is left alone rather than trimmed to nothing.
    if (cEnd <= start || cStart >= end) {
      continue;
    }

    // The clip lies entirely within the deleted range → remove it whole.
    if (cStart >= start && cEnd <= end) {
      toRemove.push(current);
      continue;
    }

    // The deleted range is strictly interior to the clip → split into two,
    // leaving a gap where the range was.
    if (cStart < start && end < cEnd) {
      const first = current;
      const second = current.clone() as Clip;

      toResort.push(second);

      first._setTimelineEndU(start as U);
      second.trimStartToTimelineU(end as U);

      notifyClips.push(first);
      notifyClips.push(second);
      continue;
    }

    // The clip's leading edge is inside the range → push its start to `end`.
    // Its position changes, so remove and re-sort it.
    if (cStart >= start) {
      current.trimStartToTimelineU(end as U);
      toRemove.push(current);
      toResort.push(current);
      notifyClips.push(current);
      continue;
    }

    // Otherwise the clip's trailing edge is inside the range → pull end to `start`.
    current._setTimelineEndU(start as U);
    notifyClips.push(current);
  }

  // console.log("clips", clips, toRemove, toResort);

  for (const clip of toRemove) {
    // todo: optimize
    removeClip(clip, clips);
  }

  simplyAddSorted(toResort, clips);

  // console.log(clips);
  assertClipInvariants(res);
  return notifyClips;
}

/**
 * Deletes a clip.
 * Returns new array if modified, same if unchaged.
 */
export function removeClip<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  clip: Clip,
  clips: SArray<Clip>,
): void {
  const i = clips.indexOf(clip);
  if (i === -1) {
    return;
  }

  clips.splice(i, 1);

  assertClipInvariants(clips);
}

/**
 * Splits a clip into two at the specified time
 */
export function splitClip<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  clip: Clip,
  timelineTime: number,
  clips: SArray<Clip>,
): [before: Clip, after: Clip] | null {
  if (timelineTime > clip._timelineEndU || timelineTime < clip._timelineStartU) {
    return null;
  }

  const i = clips.indexOf(clip);
  if (i === -1) {
    return null;
  }

  //         [         clip         |     clipAfter    ]
  // ^0:00   ^clip.startOffsetSec   ^timeSec

  const clipAfter = clip.clone() as Clip;

  clipAfter.trimStartToTimelineU(timelineTime as U);
  clip._setTimelineEndU(timelineTime as U);
  clips.splice(i + 1, 0, clipAfter);

  assertClipInvariants(clips);
  return [clip, clipAfter];
}

/**
 * Adds a clip right after the last clip
 */
export function pushClip<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  newClip: Clip,
  clips: SArray<Clip>,
): SArray<Clip> {
  const lastClip = clips.at(-1);

  if (lastClip == null) {
    newClip.timelineStart.set(0);
  } else {
    // Start the new clip right at the end of the last clip, expressed in that
    // clip's native unit (seconds for audio, pulses for midi).
    newClip.timelineStart.set(lastClip._timelineEndU, lastClip.timelineStart.unit);
  }

  clips.push(newClip);
  assertClipInvariants(clips);
  return clips;
}
declare const UNIT_SECOND: unique symbol;
export type Seconds = number & { [UNIT_SECOND]: never };

declare const UNIT_PULSE: unique symbol;
export type Pulses = number & { [UNIT_PULSE]: never };

export function secs(num: number) {
  return num as Seconds;
}

export function secsAsNum(num: Seconds) {
  return num as number;
}
// rn mostly used for invariants

export interface AbstractClip<U extends Seconds | Pulses> extends Structured<any, any> {
  readonly timelineStart: TimelineT;
  readonly timelineLength: TimelineT;

  get _timelineStartU(): U;
  get _timelineEndU(): U;

  _setTimelineEndU(num: U): void;

  trimStartToTimelineU(offset: U): void;
  clone(): AbstractClip<U>;
}

export class TimelineRegion {
  constructor(
    readonly timelineStart: TimelineT,
    readonly timelineLength: TimelineT,
    // readonly contentOffset: TimelineT,
    // readonly contentLength: TimelineT,
  ) {}
}
