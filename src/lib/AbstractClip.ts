import { SArray, Structured } from "structured-state";
import { nullthrows } from "../utils/nullthrows";
import { TimelinePoint } from "./project/TimelinePoint";

export function printClips(clips: SArray<AbstractClip<any>>) {
  return clips.map((c) => c.toString()).join("\n");
}

export function assertClipInvariants<U extends Pulses | Seconds>(clips: SArray<AbstractClip<U>>) {
  let cStart = 0;
  let cEnd = 0;
  for (let i = 0; i < clips.length; i++) {
    const clip = nullthrows(clips.at(i));
    if (clip._timelineStartU < cStart) {
      // console.log(`Out of place clip at position ${i}!`, clip, clips);
      throw new Error("Failed invariant: clips are not sorted.\n" + "They look like this:\n" + printClips(clips));
    }

    if (cEnd > clip._timelineStartU) {
      // console.log(
      //   `Clip at position ${i} overlaps with previous!`,
      //   clip.toString(),
      //   cEnd
      // );
      // console.log(`${cEnd} > ${clip.startOffsetSec}`);
      throw new Error("Failed invariant: clips overlap.\n" + "They look like this:\n" + printClips(clips));
    }

    cStart = clip._timelineStartU;
    cEnd = clip._timelineStartU;
  }
}

export function addClip<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  newClip: Clip,
  clips: SArray<Clip>,
): void {
  // Essentially, we want to insert in order, sorted
  // by the startOffsetSec of each clip.
  let i = 0;
  let prev: Clip | undefined;
  let next: Clip | undefined;
  for (; i < clips.length; i++) {
    prev = i == 0 ? undefined : clips.at(i - 1);
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
  let res = clips;
  for (let i = 0; i < clips.length; i++) {
    const current = nullthrows(clips.at(i));

    const remStart = start < current._timelineStartU && current._timelineStartU < end;
    const remEnd = start < current._timelineEndU && current._timelineEndU < end;

    // remove the whole clip
    if (remStart && remEnd) {
      toRemove.push(current);
      continue;
    }

    // Trim the start of the clip
    if (remStart) {
      // need to remove and re-sort clip
      current.trimStartToTimelineU(end as U);
      toRemove.push(current);
      toResort.push(current);
      notifyClips.push(current);
      continue;
    }

    // Trim the end of the clip
    if (remEnd) {
      current._setTimelineEndU(start as U);
      notifyClips.push(current);
      continue;
    }

    // lastly, there's the case where the whole range to be removed lies within
    // this clip, in which case we would split this clip into three parts and
    // remove the one corresponding to the time we want to delete
    if (
      current._timelineStartU < start &&
      start < current._timelineEndU &&
      current._timelineStartU < end &&
      end < current._timelineEndU
    ) {
      const first = current;
      const second = current.clone();

      toResort.push(second);

      first._setTimelineEndU(start as U);
      second.trimStartToTimelineU(end as U);
      // console.log("HERE");
    }
  }

  // console.log("clips", clips, toRemove, toResort);

  for (let clip of toRemove) {
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
  const lastClip = clips.length > 0 ? clips.at(-1) : null;

  if (!lastClip) {
    newClip._setTimelineStartU(0 as U);
  } else {
    newClip._setTimelineStartU(lastClip._timelineEndU);
  }

  clips.push(newClip);
  assertClipInvariants(clips);
  return clips;
}

/**
 * Moves a clip to the right spot in the array
 */
export function moveClip<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  clip: Clip,
  clips: SArray<Clip>,
): SArray<Clip> {
  if (clips.length === 0) {
    throw new Error("moving in empty array");
  }

  const newArr = [];

  let placed = false;
  let removed = false;

  for (let i = 0; i < clips.length; i++) {
    const c = nullthrows(clips.at(i));

    if (clip._timelineStartU <= c._timelineStartU) {
      newArr.push(clip);
      placed = true;
    }

    if (c === clip) {
      removed = true;
      continue;
    } else {
      newArr.push(c);
    }
  }

  if (!removed) {
    throw new Error("move: Clip not found in array");
  }

  if (!placed) {
    newArr.push(clip);
  }

  clips._replace(newArr);

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
  get _timelineStartU(): U;
  _setTimelineStartU(num: U): void;

  get _timelineEndU(): U;
  _setTimelineEndU(num: U): void;

  trimStartToTimelineU(offset: U): void;
  clone(): AbstractClip<U>;
}
