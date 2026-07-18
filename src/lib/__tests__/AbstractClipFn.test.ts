import "./mockWebAudio";

import { SArray } from "structured-state";
import { describe, expect, it } from "vitest";
import { nullthrows } from "../../utils/nullthrows";
import {
  addClip,
  assertClipInvariants,
  deleteTime,
  // printClips,
  pushClip,
  removeClip,
  splitClip,
} from "../AbstractClip";
import { AudioClip } from "../AudioClip";
import { SharedAudioBuffer } from "../SharedAudioBuffer";

function bclip(startOffset: number, endOffset: number) {
  const buffer = new AudioBuffer({ length: 44100 * 15, sampleRate: 44100 });
  return AudioClip.fromBuffer(new SharedAudioBuffer(buffer), "url", "foo", {
    bufferOffset: 0,
    timelineStartSec: startOffset,
    clipLengthSec: endOffset - startOffset,
  });
}

// function clip(startOffset: number, endOffset: number): BaseClip {
//   const result = BaseClip.of(startOffset, endOffset - startOffset, 0, endOffset - startOffset);
//   result.timelineStartSec = secs(startOffset);
//   return result;
// }

function clips(clips: AudioClip[]) {
  return SArray.create(clips);
}

describe("assertClipInvariants", () => {
  it("passes for an empty array", () => {
    expect(() => assertClipInvariants(clips([]))).not.toThrow();
  });

  it("passes for a single clip", () => {
    expect(() => assertClipInvariants(clips([bclip(0, 1)]))).not.toThrow();
  });

  it("passes for sorted, non-overlapping clips", () => {
    expect(() => assertClipInvariants(clips([bclip(0, 1), bclip(2, 3), bclip(5, 8)]))).not.toThrow();
  });

  it("allows clips that touch at a boundary", () => {
    expect(() => assertClipInvariants(clips([bclip(0, 1), bclip(1, 2)]))).not.toThrow();
  });

  it("throws when clips overlap", () => {
    expect(() => assertClipInvariants(clips([bclip(0, 2), bclip(1, 3)]))).toThrow(/overlap/);
  });

  it("throws when clips are out of order", () => {
    expect(() => assertClipInvariants(clips([bclip(2, 3), bclip(0, 1)]))).toThrow(/sorted/);
  });
});

describe("removeClip", () => {
  it("removes the clip", () => {
    const foo = bclip(0, 1);
    const all = clips([foo]);
    removeClip(foo, all);
    expect(all).not.toContain(foo);
  });

  it("keeps clips sorted", () => {
    const foo = bclip(1, 2);
    const all = clips([bclip(0, 1), foo, bclip(2, 3)]);
    removeClip(foo, all);

    expect(all).not.toContain(foo);
    assertClipInvariants(all);
  });

  it("is a no-op when the clip is not present", () => {
    const foo = bclip(0, 1);
    const orphan = bclip(2, 3);
    const all = clips([foo]);
    removeClip(orphan, all);

    expect(all.length).toBe(1);
    expect(all).toContain(foo);
  });
});

describe("deleteTime", () => {
  it("does nothing if nothing to delete", () => {
    const all = clips([bclip(0, 1), bclip(1, 2), bclip(2, 3)]);
    const [foo, bar, baz] = all;

    deleteTime(10, 20, all);

    expect(all).toContain(foo);
    expect(all).toContain(bar);
    expect(all).toContain(baz);
  });

  it("deletes wide", () => {
    const all = clips([bclip(1, 2)]);
    deleteTime(0, 3, all);
    expect(all.length).toBe(0);
  });

  it("deletes narrow", () => {
    const all = clips([bclip(0, 3)]);
    // console.log(printClips(all), "\n");
    deleteTime(1, 2, all);
    // console.log(printClips(all));

    expect(all.length).toBe(2);
    expect(all.at(0)?.getTimelineStartSec()).toBe(0);
    expect(all.at(0)?.getTimelineEndSec()).toBe(1);
    expect(all.at(1)?.getTimelineStartSec()).toBe(2);
    expect(all.at(1)?.getTimelineEndSec()).toBe(3);
  });

  it("is a no-op and returns [] when start === end", () => {
    const all = clips([bclip(0, 1), bclip(2, 3)]);
    expect(deleteTime(2, 2, all)).toEqual([]);
    expect(all.length).toBe(2);
  });

  it("throws when start > end", () => {
    const all = clips([bclip(0, 1)]);
    expect(() => deleteTime(5, 1, all)).toThrow();
  });

  it("removes a clip whose range exactly matches the deleted range", () => {
    const all = clips([bclip(0, 1), bclip(2, 4), bclip(5, 6)]);
    deleteTime(2, 4, all);

    expect(all.length).toBe(2);
    expect(all.at(0)?.getTimelineStartSec()).toBe(0);
    expect(all.at(1)?.getTimelineStartSec()).toBe(5);
    assertClipInvariants(all);
  });

  it("removes a fully-contained clip that shares the start boundary (no sliver)", () => {
    const all = clips([bclip(0, 1), bclip(2, 4)]);
    deleteTime(2, 5, all);

    expect(all.length).toBe(1);
    expect(all.at(0)?.getTimelineStartSec()).toBe(0);
    expect(all.at(0)?.getTimelineEndSec()).toBe(1);
  });

  it("removes a fully-contained clip that shares the end boundary (no sliver)", () => {
    const all = clips([bclip(2, 4), bclip(6, 7)]);
    deleteTime(1, 4, all);

    expect(all.length).toBe(1);
    expect(all.at(0)?.getTimelineStartSec()).toBe(6);
  });

  it("leaves an abutting clip untouched", () => {
    const all = clips([bclip(0, 2), bclip(2, 4)]);
    deleteTime(2, 3, all);

    expect(all.length).toBe(2);
    expect(all.at(0)?.getTimelineStartSec()).toBe(0);
    expect(all.at(0)?.getTimelineEndSec()).toBe(2);
    expect(all.at(1)?.getTimelineStartSec()).toBe(3);
    expect(all.at(1)?.getTimelineEndSec()).toBe(4);
  });

  it("trims the end of a clip overlapping from the left", () => {
    const all = clips([bclip(0, 3)]);
    deleteTime(2, 5, all);

    expect(all.length).toBe(1);
    expect(all.at(0)?.getTimelineStartSec()).toBe(0);
    expect(all.at(0)?.getTimelineEndSec()).toBe(2);
  });

  it("trims the start of a clip overlapping from the right", () => {
    const all = clips([bclip(3, 6)]);
    deleteTime(1, 4, all);

    expect(all.length).toBe(1);
    expect(all.at(0)?.getTimelineStartSec()).toBe(4);
    expect(all.at(0)?.getTimelineEndSec()).toBe(6);
  });

  it("removes and trims across multiple clips", () => {
    const all = clips([bclip(0, 2), bclip(3, 5), bclip(6, 8), bclip(10, 12)]);
    deleteTime(1, 7, all);

    // [0-1] (trailing trim), [3-5] removed, [6-8] -> [7-8], [10-12] untouched
    expect(all.length).toBe(3);
    expect(all.at(0)?.getTimelineStartSec()).toBe(0);
    expect(all.at(0)?.getTimelineEndSec()).toBe(1);
    expect(all.at(1)?.getTimelineStartSec()).toBe(7);
    expect(all.at(1)?.getTimelineEndSec()).toBe(8);
    expect(all.at(2)?.getTimelineStartSec()).toBe(10);
    assertClipInvariants(all);
  });

  it("returns the trimmed clip so callers can notify it", () => {
    const all = clips([bclip(0, 3)]);
    const clip = all.at(0);
    const notified = deleteTime(2, 5, all);

    expect(notified).toContain(clip);
  });

  it("returns both pieces when the deleted range splits a clip", () => {
    const all = clips([bclip(0, 10)]);
    const notified = deleteTime(3, 6, all);

    expect(notified.length).toBe(2);
    expect(all.length).toBe(2);
    expect(all.at(0)?.getTimelineEndSec()).toBe(3);
    expect(all.at(1)?.getTimelineStartSec()).toBe(6);
  });
});

describe("pushClip", () => {
  it("pushes to right after the last clip", () => {
    const all = clips([bclip(0, 1), bclip(1, 2)]);
    const foo = bclip(0, 1);
    const res = pushClip(foo, all);

    expect(res).toContain(foo);
    expect(foo.getTimelineStartSec()).toEqual(2);
    expect(res.indexOf(foo)).toEqual(2);
  });

  it("pushes to 0 on an empty track", () => {
    const all = clips([]);
    const foo = bclip(3, 5);
    pushClip(foo, all);

    expect(foo.getTimelineStartSec()).toBe(0);
    expect(all.indexOf(foo)).toBe(0);
  });
});

describe("addClip", () => {
  it("adds correctly on empty space after", () => {
    const all = clips([bclip(0, 1), bclip(1, 2)]);
    const foo = bclip(2, 3);
    addClip(foo, all);

    expect(all).toContain(foo);
    expect(all.indexOf(foo)).toEqual(2);
  });

  it("adds correctly on empty space before", () => {
    const all = clips([bclip(1, 2), bclip(2, 3)]);
    const foo = bclip(0, 1);
    addClip(foo, all);

    expect(all).toContain(foo);
    expect(all.indexOf(foo)).toEqual(0);
  });

  it("adds correctly on empty space in between", () => {
    const all = clips([bclip(0, 1), bclip(2, 3)]);
    const foo = bclip(1, 2);
    addClip(foo, all);

    expect(all).toContain(foo);
    expect(all.indexOf(foo)).toEqual(1);
  });

  it("adds correctly simple overlap at end", () => {
    const all = clips([bclip(0, 10)]);
    const foo = bclip(5, 15);
    addClip(foo, all);

    expect(all).toContain(foo);
    expect(all.indexOf(foo)).toEqual(1);
    expect(all.at(0)?.getTimelineEndSec()).toEqual(5);
  });

  it("adds correctly simple overlap at start", () => {
    const all = clips([bclip(5, 15)]);
    const foo = bclip(0, 10);
    addClip(foo, all);

    expect(all).toContain(foo);
    expect(all.indexOf(foo)).toEqual(0);
    expect(all.at(1)?.getTimelineStartSec()).toEqual(10);
    expect(all.at(1)?.getTimelineEndSec()).toEqual(15);
  });

  it("adds correctly when wide overlap over another clip", () => {
    const all = clips([bclip(2, 8)]);
    const foo = bclip(0, 10);
    const bar = all.at(0);
    addClip(foo, all);

    expect(all).toContain(foo);
    expect(all).not.toContain(bar);
  });

  it("splits clips correctly when doing a narrow overlap", () => {
    const all = clips([bclip(0, 10)]);
    const foo = bclip(2, 8);
    addClip(foo, all);
    // expect 0-2,2-8,8-10

    expect(all).toContain(foo);
    expect(all.length).toBe(3);
    expect(all.at(0)?.getTimelineEndSec()).toBe(2);
    expect(all.at(2)?.getTimelineStartSec()).toBe(8);
  });
});

describe("splitClip", () => {
  it("splits a clip, idk", () => {
    const foo = bclip(0, 10);
    const all = clips([foo]);
    splitClip(foo, 5, all);

    expect(all.length).toBe(2);
    expect(all.at(0)?.getTimelineStartSec()).toBe(0);
    expect(all.at(0)?.getTimelineEndSec()).toBe(5);
    expect(all.at(1)?.getTimelineStartSec()).toBe(5);
    expect(all.at(1)?.getTimelineEndSec()).toBe(10);
  });

  it("returns the two clips", () => {
    const foo = bclip(0, 10);
    const all = clips([foo]);

    const [before, after] = nullthrows(splitClip(foo, 5, all));

    expect(all.length).toBe(2);
    expect(all).toContain(before);
    expect(all).toContain(after);
    expect(before.getTimelineStartSec()).toBe(0);
    expect(before.getTimelineEndSec()).toBe(5);
    expect(after.getTimelineStartSec()).toBe(5);
    expect(after.getTimelineEndSec()).toBe(10);
  });

  it("splits a clip with start offset, chained", () => {
    const foo = bclip(2, 8);
    const all = clips([foo]);
    const [_before, after] = nullthrows(splitClip(foo, 4, all));
    const [_, __] = nullthrows(splitClip(after, 6, all));

    expect(all.length).toBe(3);
    expect(all.at(0)?.getTimelineStartSec()).toBe(2);
    expect(all.at(0)?.getTimelineEndSec()).toBe(4);
    expect(all.at(1)?.getTimelineStartSec()).toBe(4);
    expect(all.at(1)?.getTimelineEndSec()).toBe(6);
    expect(all.at(2)?.getTimelineStartSec()).toBe(6);
    expect(all.at(2)?.getTimelineEndSec()).toBe(8);
  });

  it("returns null when the split point is past the clip end", () => {
    const foo = bclip(0, 10);
    const all = clips([foo]);

    expect(splitClip(foo, 15, all)).toBe(null);
    expect(all.length).toBe(1);
  });

  it("returns null when the split point is before the clip start", () => {
    const foo = bclip(2, 8);
    const all = clips([foo]);

    expect(splitClip(foo, 1, all)).toBe(null);
    expect(all.length).toBe(1);
  });

  it("returns null when the clip is not in the array", () => {
    const foo = bclip(0, 10);
    const orphan = bclip(0, 10);
    const all = clips([foo]);

    expect(splitClip(orphan, 5, all)).toBe(null);
    expect(all.length).toBe(1);
  });
});
