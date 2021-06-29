import { AudioClip } from "./AudioClip";
import { audioContext } from "./globals";
import { mixDown } from "./mixDown";

const assertNonNil = function <T>(val: T | null | void): T {
  if (val == null) {
    throw new Error(`Expected ${val} to be non nil.`);
  }
  return val;
};

function assertClipInvariants(clips: Array<AudioClip>) {
  let cStart = 0;
  let cEnd = 0;
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (clip.startOffsetSec < cStart) {
      console.log(`Out of place clip at position ${i}!`, clip, clips);
      throw new Error("Failed invariant: clips are not sorted.");
    }

    if (cEnd > clip.startOffsetSec) {
      console.log(
        `Clip at position ${i} overlaps with previous!`,
        clip.toString(),
        cEnd
      );
      console.log(`${cEnd} > ${clip.startOffsetSec}`);
      throw new Error("Failed invariant: clips overlap.");
    }

    cStart = clip.startOffsetSec;
    cEnd = clip.endOffsetSec;
  }
}

let trackNo = 0;

export class AudioTrack {
  name: string = `Track ${trackNo++}`;
  // Idea: can we use a mutation counter to keep track of state changes?
  mutations: number = 0;
  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  clips: Array<AudioClip> = [];

  gainNode: GainNode = new GainNode(audioContext);

  getSourceNode(): AudioBufferSourceNode {
    const trackBuffer = mixDown(this.clips, 2);
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = trackBuffer;
    sourceNode.loop = false;
    sourceNode.connect(this.gainNode);
    return sourceNode;
  }

  // New track with a single clip
  static fromClip(clip: AudioClip) {
    const track = new AudioTrack();
    track.pushClip(clip);
    return track;
  }

  toString() {
    return this.clips.map((c) => c.toString()).join("\n");
  }

  addClip(newClip: AudioClip) {
    console.log("adding", newClip.toString(), "\n", "into:\n", this.toString());
    // Essentially, we want to insert in order, sorted
    // by the startOffsetSec of each clip.
    let i = 0;
    let prev;
    let next;
    for (; i < this.clips.length; i++) {
      prev = this.clips[i];
      next = this.clips[i + 1];

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

    console.log("inserting between", prev?.toString(), "and", next?.toString());

    this.deleteTime(newClip.startOffsetSec, newClip.endOffsetSec);

    // Insert the clip
    this.clips.splice(i + 1, 0, newClip);
    this.mutations++;
    console.log("IN AFTER", i);
    console.log("NEW CLIPS\n", this.toString());

    // if (prev && prev.endOffsetSec > newClip.startOffsetSec) {
    //   // TODO: delete time range within current clip and insert it.

    //   prev.endOffsetSec = newClip.startOffsetSec;

    //   console.log("TODO: CLIP PREV");
    //   // prev.endPosSec = newClip.startOffsetSec;
    // }
    // if (next && next.startOffsetSec < newClip.endOffsetSec) {
    //   next.startOffsetSec = newClip.endOffsetSec;
    // }

    this.mutations++;
    assertClipInvariants(this.clips);
  }

  // Adds a clip right after the last clip
  pushClip(newClip: AudioClip): void {
    const lastClip =
      this.clips.length > 0 ? this.clips[this.clips.length - 1] : null;

    if (!lastClip) {
      newClip.startOffsetSec = 0;
    } else {
      newClip.startOffsetSec = lastClip.endOffsetSec;
    }

    this.clips.push(newClip);

    this.mutations++;
    assertClipInvariants(this.clips);
  }

  removeClip(clip: AudioClip) {
    const i = this.clips.indexOf(clip);
    if (i === -1) {
      return;
    }
    this.clips.splice(i, 1);

    this.mutations++;
    assertClipInvariants(this.clips);
  }

  /** Splits a clip into two at the specified time */
  splitClip(clip: AudioClip, timeSec: number): [AudioClip, AudioClip] | null {
    if (timeSec > clip.endOffsetSec || timeSec < clip.startOffsetSec) {
      return null;
    }

    const i = this.clips.indexOf(clip);
    if (i === -1) {
      return null;
    }

    //         [         clip         |     clipAfter    ]
    // ^0:00   ^clip.startOffsetSec   ^timeSec

    const clipAfter = clip.clone();
    clipAfter.startOffsetSec = timeSec;
    clipAfter.trimStartSec = timeSec - clip.startOffsetSec;

    clip.endOffsetSec = timeSec;
    this.clips.splice(i + 1, 0, clipAfter);

    this.mutations++;
    assertClipInvariants(this.clips);
    return [clip, clipAfter];
  }

  deleteTime(startSec: number, endSec: number): void {
    console.log("deleteTime", startSec, endSec);
    if (startSec === endSec) {
      return;
    }

    if (startSec > endSec) {
      throw new Error("Invariant Violation: startSec > endSec in deleteTime");
    }

    // deletes/trims clips to make time from startSec to endSec be blank

    const toRemove = [];

    for (let i = 0; i < this.clips.length; i++) {
      const current = this.clips[i];

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
        const [_, after] = assertNonNil(this.splitClip(current, startSec));
        const [before, __] = assertNonNil(this.splitClip(after, endSec));
        this.removeClip(before);

        // End the loop, this is the only case and we just messed up
        // the indexes so we very much don't want to keep going
      }
    }

    this.mutations++;
    assertClipInvariants(this.clips);
  }
}
