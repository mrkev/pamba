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

export function addClip(newClip: BaseClip, clips: Array<BaseClip>) {
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

  // if (i === clips.length) {
  //   console.log(`at the end: ${i}`);
  // } else {
  //   console.log(
  //     `inserting here:\n   ${i - 1}:`,
  //     prev?.toString(),
  //     `\n-->\n   ${i}:`,
  //     next?.toString()
  //   );
  // }

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
}

export function deleteTime(
  startSec: number,
  endSec: number,
  clips: Array<BaseClip>
): void {
  if (startSec === endSec) {
    return;
  }

  if (startSec > endSec) {
    throw new Error("Invariant Violation: startSec > endSec in deleteTime");
  }

  // deletes/trims clips to make time from startSec to endSec be blank

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
      current.startOffsetSec = endSec;
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
      const [_, after] = nullthrows(splitClip(current, startSec, clips));
      const [before, __] = nullthrows(splitClip(after, endSec, clips));
      removeClip(before, clips);

      // End the loop, this is the only case and we just messed up
      // the indexes so we very much don't want to keep going
    }
  }

  assertClipInvariants(clips);
}

export function removeClip(clip: BaseClip, clips: Array<BaseClip>): void {
  const i = clips.indexOf(clip);
  if (i === -1) {
    return;
  }
  clips.splice(i, 1);
  assertClipInvariants(clips);
}

/** Splits a clip into two at the specified time */
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
  clipAfter.startOffsetSec = timeSec;
  clipAfter.trimStartSec = timeSec - clip.startOffsetSec;

  clip.endOffsetSec = timeSec;
  clips.splice(i + 1, 0, clipAfter);
  assertClipInvariants(clips);
  return [clip, clipAfter];
}

export function pushClip(newClip: BaseClip, clips: Array<BaseClip>): void {
  const lastClip = clips.length > 0 ? clips[clips.length - 1] : null;

  if (!lastClip) {
    newClip.startOffsetSec = 0;
  } else {
    newClip.startOffsetSec = lastClip.endOffsetSec;
  }

  clips.push(newClip);
  assertClipInvariants(clips);
}
