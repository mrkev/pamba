import { BaseClip } from "./BaseClip";
import nullthrows from "./nullthrows";

export function printClips(clips: Array<BaseClip>) {
  return clips.map((c) => c.toString()).join("\n");
}

export function assertClipInvariants(clips: Array<BaseClip>) {
  let cStart = 0;
  let cEnd = 0;
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (clip.startOffsetSec < cStart) {
      // console.log(`Out of place clip at position ${i}!`, clip, clips);
      throw new Error(
        "Failed invariant: clips are not sorted.\n" +
          "They look like this:\n" +
          printClips(clips)
      );
    }

    if (cEnd > clip.startOffsetSec) {
      // console.log(
      //   `Clip at position ${i} overlaps with previous!`,
      //   clip.toString(),
      //   cEnd
      // );
      // console.log(`${cEnd} > ${clip.startOffsetSec}`);
      throw new Error(
        "Failed invariant: clips overlap.\n" +
          "They look like this:\n" +
          printClips(clips)
      );
    }

    cStart = clip.startOffsetSec;
    cEnd = clip.endOffsetSec;
  }
}

export function addClip<Clip extends BaseClip>(
  newClip: Clip,
  clips: Array<Clip>
): Array<Clip> {
  // Essentially, we want to insert in order, sorted
  // by the startOffsetSec of each clip.
  let i = 0;
  let prev;
  let next;
  for (; i < clips.length; i++) {
    prev = clips[i - 1];
    next = clips[i];

    // We want to iterate until i
    // we find a spot where if we were to keep going we'd be
    // later than the next clip
    if (next && next.startOffsetSec < newClip.startOffsetSec) {
      continue;
    }

    if (next && next.startOffsetSec === newClip.startOffsetSec) {
      // Overlap
    }

    if (
      (prev && prev.startOffsetSec === newClip.startOffsetSec) ||
      (next && next.startOffsetSec === newClip.startOffsetSec)
    ) {
      // perfect overlap, TODO
      throw new Error("OOPS");
    } else {
      break;
    }
  }

  deleteTime(newClip.startOffsetSec, newClip.endOffsetSec, clips);

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
  return [...clips];
}

/**
 * deletes/trims clips as necessary to make the time from
 * startSec to endSec is blank
 */
export function deleteTime<Clip extends BaseClip>(
  startSec: number,
  endSec: number,
  clips: Array<Clip>
): Array<Clip> {
  if (startSec === endSec) {
    return clips;
  }

  if (startSec > endSec) {
    throw new Error("Invariant Violation: startSec > endSec in deleteTime");
  }

  const toRemove = [];

  for (let i = 0; i < clips.length; i++) {
    const current = clips[i];

    const remStart =
      startSec < current.startOffsetSec && current.startOffsetSec < endSec;
    const remEnd =
      startSec < current.endOffsetSec && current.endOffsetSec < endSec;

    // remove the whole clip
    if (remStart && remEnd) {
      toRemove.push(current);
      continue;
    }

    // Trim the start of the clip
    if (remStart) {
      current.trimToOffsetSec(endSec);
      continue;
    }

    // Trim the end of the clip
    if (remEnd) {
      current.endOffsetSec = startSec;
      continue;
    }

    // lastly, there's the case where the whole range to be removed lies within
    // this clip, in which case we would split this clip into three parts and
    // remove the one corresponding to the time we want to delete
    if (
      current.startOffsetSec < startSec &&
      startSec < current.endOffsetSec &&
      current.startOffsetSec < endSec &&
      endSec < current.endOffsetSec
    ) {
      // console.log("CLIPS HERE\n", printClips(clips));
      const [_, after] = nullthrows(splitClip(current, startSec, clips));
      // console.log("CLIPS HERE\n", printClips(clips));

      const [before, __] = nullthrows(splitClip(after, endSec, clips));
      // console.log("CLIPS HERE\n", printClips(clips));

      // console.log("BEFORE", before.toString(), "aaaaaaaa", __.toString());
      removeClip(before, clips);

      // End the loop, this is the only case and we just messed up
      // the indexes so we very much don't want to keep going
    }
  }

  for (let clip of toRemove) {
    removeClip(clip, clips);
  }

  assertClipInvariants(clips);
  return [...clips];
}

// TODO: idea, LinkedArray and LinkedMap, for collection linked state?
/**
 * Deletes a clip.
 * Returns new array if modified, same if unchaged.
 */
export function removeClip<Clip extends BaseClip>(
  clip: Clip,
  clips: Array<Clip>
): Array<Clip> {
  const i = clips.indexOf(clip);
  if (i === -1) {
    return clips;
  }
  clips.splice(i, 1);
  assertClipInvariants(clips);
  return [...clips];
}

/**
 * Splits a clip into two at the specified time
 */
export function splitClip<T extends BaseClip>(
  clip: T,
  timeSec: number,
  clips: Array<BaseClip>
): [T, BaseClip] | null {
  if (timeSec > clip.endOffsetSec || timeSec < clip.startOffsetSec) {
    return null;
  }

  const i = clips.indexOf(clip);
  if (i === -1) {
    return null;
  }

  //         [         clip         |     clipAfter    ]
  // ^0:00   ^clip.startOffsetSec   ^timeSec

  const clipAfter = clip.clone();

  clipAfter.trimToOffsetSec(timeSec);
  clip.endOffsetSec = timeSec;

  clips.splice(i + 1, 0, clipAfter);

  assertClipInvariants(clips);
  return [clip, clipAfter];
}

/**
 * Adds a clip right after the last clip
 */
export function pushClip<Clip extends BaseClip>(
  newClip: Clip,
  clips: Array<Clip>
): Array<Clip> {
  const lastClip = clips.length > 0 ? clips[clips.length - 1] : null;

  if (!lastClip) {
    newClip.startOffsetSec = 0;
  } else {
    newClip.startOffsetSec = lastClip.endOffsetSec;
  }

  clips.push(newClip);
  assertClipInvariants(clips);
  return [...clips];
}
