import nullthrows from "../utils/nullthrows";
import { AbstractClip } from "./BaseClip";

export function printClips(clips: ReadonlyArray<AbstractClip>) {
  return clips.map((c) => c.toString()).join("\n");
}

export function assertClipInvariants(clips: ReadonlyArray<AbstractClip>) {
  let cStart = 0;
  let cEnd = 0;
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (clip._startOffset() < cStart) {
      // console.log(`Out of place clip at position ${i}!`, clip, clips);
      throw new Error("Failed invariant: clips are not sorted.\n" + "They look like this:\n" + printClips(clips));
    }

    if (cEnd > clip._startOffset()) {
      // console.log(
      //   `Clip at position ${i} overlaps with previous!`,
      //   clip.toString(),
      //   cEnd
      // );
      // console.log(`${cEnd} > ${clip.startOffsetSec}`);
      throw new Error("Failed invariant: clips overlap.\n" + "They look like this:\n" + printClips(clips));
    }

    cStart = clip._startOffset();
    cEnd = clip._startOffset();
  }
}

export function addClip<Clip extends AbstractClip>(newClip: Clip, clips: ReadonlyArray<Clip>): ReadonlyArray<Clip> {
  // Essentially, we want to insert in order, sorted
  // by the startOffsetSec of each clip.
  let i = 0;
  let prev: Clip | undefined;
  let next: Clip | undefined;
  for (; i < clips.length; i++) {
    prev = clips[i - 1];
    next = clips[i];

    // We want to iterate until i
    // we find a spot where if we were to keep going we'd be
    // later than the next clip
    if (next && next._startOffset() < newClip._startOffset()) {
      continue;
    }

    if (next && next._startOffset() === newClip._startOffset()) {
      // Overlap
    }

    if (
      (prev && prev._startOffset() === newClip._startOffset()) ||
      (next && next._startOffset() === newClip._startOffset())
    ) {
      // perfect overlap, TODO
      throw new Error("OOPS");
    } else {
      break;
    }
  }

  const res = deleteTime(newClip._startOffset(), newClip._endOffset(), clips);

  // Insert the clip
  const clone = [...res];
  clone.splice(i, 0, newClip);

  // if (prev && prev.endOffsetSec > newClip.startOffsetSec) {
  //   // TODO: delete time range within current clip and insert it.

  //   prev.endOffsetSec = newClip.startOffsetSec;

  //   console.log("TODO: CLIP PREV");
  //   // prev.endPosSec = newClip.startOffsetSec;
  // }
  // if (next && next.startOffsetSec < newClip.endOffsetSec) {
  //   next.startOffsetSec = newClip.endOffsetSec;
  // }
  assertClipInvariants(clone);
  return clone;
}

/**
 * deletes/trims clips as necessary to make the time from
 * startSec to endSec is blank
 */
export function deleteTime<Clip extends AbstractClip>(
  startSec: number,
  endSec: number,
  clips: ReadonlyArray<Clip>,
): ReadonlyArray<Clip> {
  if (startSec === endSec) {
    return clips;
  }

  if (startSec > endSec) {
    throw new Error("Invariant Violation: startSec > endSec in deleteTime");
  }

  const toRemove = [];

  let res = clips;
  for (let i = 0; i < clips.length; i++) {
    const current = clips[i];

    const remStart = startSec < current._startOffset() && current._startOffset() < endSec;
    const remEnd = startSec < current._endOffset() && current._endOffset() < endSec;

    // remove the whole clip
    if (remStart && remEnd) {
      toRemove.push(current);
      continue;
    }

    // Trim the start of the clip
    if (remStart) {
      current.trimToOffset(endSec);
      continue;
    }

    // Trim the end of the clip
    if (remEnd) {
      current._setEndOffset(startSec);
      continue;
    }

    // lastly, there's the case where the whole range to be removed lies within
    // this clip, in which case we would split this clip into three parts and
    // remove the one corresponding to the time we want to delete
    if (
      current._startOffset() < startSec &&
      startSec < current._endOffset() &&
      current._startOffset() < endSec &&
      endSec < current._endOffset()
    ) {
      // console.log("CLIPS HERE\n", printClips(clips));
      const [, after, out] = nullthrows(splitClip(current, startSec, clips));
      // console.log("CLIPS HERE\n", printClips(clips));

      const [before, , out2] = nullthrows(splitClip(after, endSec, out));
      // console.log("CLIPS HERE\n", printClips(clips));

      // console.log("BEFORE", before.toString(), "aaaaaaaa", __.toString());
      res = removeClip(before, out2);

      // End the loop, this is the only case and we just messed up
      // the indexes so we very much don't want to keep going
    }
  }

  for (let clip of toRemove) {
    // todo: optimize
    res = removeClip(clip, clips);
  }

  assertClipInvariants(res);
  return [...res];
}

// TODO: idea, LinkedArray and LinkedMap, for collection linked state?
/**
 * Deletes a clip.
 * Returns new array if modified, same if unchaged.
 */
export function removeClip<Clip extends AbstractClip>(clip: Clip, clips: ReadonlyArray<Clip>): ReadonlyArray<Clip> {
  const i = clips.indexOf(clip);
  if (i === -1) {
    return clips;
  }
  const clone = [...clips];
  clone.splice(i, 1);
  assertClipInvariants(clips);
  return clone;
}

/**
 * Splits a clip into two at the specified time
 */
export function splitClip<Clip extends AbstractClip>(
  clip: Clip,
  timeSec: number,
  clips: ReadonlyArray<Clip>,
): [before: Clip, after: Clip, clips: ReadonlyArray<Clip>] | null {
  if (timeSec > clip._endOffset() || timeSec < clip._startOffset()) {
    return null;
  }

  const i = clips.indexOf(clip);
  if (i === -1) {
    return null;
  }

  //         [         clip         |     clipAfter    ]
  // ^0:00   ^clip.startOffsetSec   ^timeSec

  const clipAfter = clip.clone() as Clip;

  clipAfter.trimToOffset(timeSec);
  clip._setEndOffset(timeSec);

  const clone = [...clips];
  clone.splice(i + 1, 0, clipAfter);

  assertClipInvariants(clips);
  return [clip, clipAfter, clone];
}

/**
 * Adds a clip right after the last clip
 */
export function pushClip<Clip extends AbstractClip>(newClip: Clip, clips: ReadonlyArray<Clip>): ReadonlyArray<Clip> {
  const lastClip = clips.length > 0 ? clips[clips.length - 1] : null;

  if (!lastClip) {
    newClip._setStartOffset(0);
  } else {
    newClip._setStartOffset(lastClip._endOffset());
  }

  const clone = [...clips];
  clone.push(newClip);
  assertClipInvariants(clips);
  return clone;
}
