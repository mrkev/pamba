import { AudioClip } from "./AudioClip";
import { audioContext } from "./globals";

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

  // New track with a single clip
  static fromClip(clip: AudioClip) {
    const track = new AudioTrack();
    track.pushClip(clip);
    return track;
  }

  addClip(newClip: AudioClip) {
    // console.log("track", this.clips);
    // if (this.clips.length === 0) {
    //   this.clips.push(newClip);
    //   return;
    // }

    let i = 0;
    let prev;
    let next;
    for (; i < this.clips.length; i++) {
      prev = this.clips[i];
      next = this.clips[i + 1];
      console.log(
        prev?.name,
        prev?.startOffsetSec,
        ":",
        newClip?.name,
        newClip?.startOffsetSec,
        ":",
        next?.name,
        next?.startOffsetSec
      );
      // We're inserting somewhere ahead, not here
      if (next && next.startOffsetSec < newClip.startOffsetSec) {
        continue;
      } else if (
        (prev && prev.startOffsetSec === newClip.startOffsetSec) ||
        (next && next.startOffsetSec === newClip.startOffsetSec)
      ) {
        // perfect overlap, TODO
        throw new Error("OOPS");
      } else {
        break;
      }
    }
    // Insert the clip
    this.clips.splice(i, 0, newClip);
    this.mutations++;
    console.log("IN AFTER", i);

    if (prev && prev.endOffsetSec > newClip.startOffsetSec) {
      // TODO: clip prev clip
      console.log("CLIP PREV");
      // prev.endPosSec = newClip.startOffsetSec;
    }
    if (next && next.startOffsetSec < newClip.endOffsetSec) {
      next.startOffsetSec = newClip.endOffsetSec;
    }
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
  }

  removeClip(clip: AudioClip) {
    const i = this.clips.indexOf(clip);
    if (i === -1) {
      return;
    }
    this.clips.splice(i, 1);
    this.mutations++;
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
    clipAfter.startPosSec = timeSec - clip.startOffsetSec;

    clip.endOffsetSec = timeSec;
    this.clips.splice(i + 1, 0, clipAfter);
    this.mutations++;

    return [clip, clipAfter];
  }

  deleteTime(startSec: number, endSec: number): void {
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
        // TODO: split into three
        // remove middle part
        // End the loop, this is the only case and we just messed up
        // the indexes so we very much don't want to keep going
      }
    }
  }
}
