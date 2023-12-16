import { SArray } from "structured-state";
import { nullthrows } from "../utils/nullthrows";
import { AbstractClip, Pulses, Seconds } from "./BaseClip";

export function printClips(clips: SArray<AbstractClip<any>>) {
  return clips.map((c) => c.toString()).join("\n");
}

export function assertClipInvariants<U extends Pulses | Seconds>(clips: SArray<AbstractClip<U>>) {
  let cStart = 0;
  let cEnd = 0;
  for (let i = 0; i < clips.length; i++) {
    const clip = nullthrows(clips.at(i));
    if (clip._startOffsetU < cStart) {
      // console.log(`Out of place clip at position ${i}!`, clip, clips);
      throw new Error("Failed invariant: clips are not sorted.\n" + "They look like this:\n" + printClips(clips));
    }

    if (cEnd > clip._startOffsetU) {
      // console.log(
      //   `Clip at position ${i} overlaps with previous!`,
      //   clip.toString(),
      //   cEnd
      // );
      // console.log(`${cEnd} > ${clip.startOffsetSec}`);
      throw new Error("Failed invariant: clips overlap.\n" + "They look like this:\n" + printClips(clips));
    }

    cStart = clip._startOffsetU;
    cEnd = clip._startOffsetU;
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
    if (next && next._startOffsetU < newClip._startOffsetU) {
      continue;
    }

    if (next && next._startOffsetU >= newClip._startOffsetU) {
      // we insert here
      break;
    }
  }

  deleteTime(newClip._startOffsetU, newClip._endOffsetU, clips);

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

/**
 * deletes/trims clips as necessary to make the time from
 * start to end, using track units
 */
export function deleteTime<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  start: number,
  end: number,
  clips: SArray<Clip>,
): void {
  if (start === end) {
    return;
  }

  if (start > end) {
    throw new Error("Invariant Violation: startSec > endSec in deleteTime");
  }

  const toRemove = [];
  const toResort = [];

  let res = clips;
  for (let i = 0; i < clips.length; i++) {
    const current = nullthrows(clips.at(i));

    const remStart = start < current._startOffsetU && current._startOffsetU < end;
    const remEnd = start < current._endOffsetU && current._endOffsetU < end;

    // remove the whole clip
    if (remStart && remEnd) {
      toRemove.push(current);
      continue;
    }

    // Trim the start of the clip
    if (remStart) {
      // need to remove and re-sort clip
      current.trimToOffset(end as U);
      toRemove.push(current);
      toResort.push(current);
      continue;
    }

    // Trim the end of the clip
    if (remEnd) {
      current._setEndOffsetU(start as U);
      continue;
    }

    // lastly, there's the case where the whole range to be removed lies within
    // this clip, in which case we would split this clip into three parts and
    // remove the one corresponding to the time we want to delete
    if (
      current._startOffsetU < start &&
      start < current._endOffsetU &&
      current._startOffsetU < end &&
      end < current._endOffsetU
    ) {
      const first = current;
      const second = current.clone();

      toResort.push(second);

      first._setEndOffsetU(start as U);
      second.trimToOffset(end as U);
    }
  }

  // console.log("clips", clips, toRemove, toResort);

  for (let clip of toRemove) {
    // todo: optimize
    removeClip(clip, clips);
  }

  for (let clip of toResort) {
    addClip(clip, clips);
  }

  // console.log(clips);
  assertClipInvariants(res);
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
  time: number,
  clips: SArray<Clip>,
): [before: Clip, after: Clip] | null {
  if (time > clip._endOffsetU || time < clip._startOffsetU) {
    return null;
  }

  const i = clips.indexOf(clip);
  if (i === -1) {
    return null;
  }

  //         [         clip         |     clipAfter    ]
  // ^0:00   ^clip.startOffsetSec   ^timeSec

  const clipAfter = clip.clone() as Clip;

  clipAfter.trimToOffset(time as U);
  clip._setEndOffsetU(time as U);
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
    newClip._setStartOffsetU(0 as U);
  } else {
    newClip._setStartOffsetU(lastClip._endOffsetU);
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

    if (clip._startOffsetU <= c._startOffsetU) {
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
