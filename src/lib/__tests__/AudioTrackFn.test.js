import { BaseClip } from "../BaseClip";
import {
  addClip,
  deleteTime,
  removeClip,
  pushClip,
  assertClipInvariants,
  printClips,
  splitClip,
} from "../AudioTrackFn";

function clip(startOffset, endOffset) {
  const DEFAULT_SAMPLE_RATE = 1000;
  const result = new BaseClip({
    lengthSec: endOffset - startOffset,
    sampleRate: DEFAULT_SAMPLE_RATE,
  });
  result.startOffsetSec = startOffset;
  return result;
}

describe("removeClip", () => {
  it("removes the clip", () => {
    const foo = clip(0, 1);
    const all = removeClip(foo, [foo]);
    expect(all).not.toContain(foo);
  });

  it("keeps clips sorted", () => {
    const foo = clip(1, 2);
    const all = removeClip(foo, [clip(0, 1), foo, clip(2, 3)]);

    expect(all).not.toContain(foo);
    assertClipInvariants(all);
  });
});

describe("deleteTime", () => {
  it("does nothing if nothing to delete", () => {
    const all = [clip(0, 1), clip(1, 2), clip(2, 3)];
    const [foo, bar, baz] = all;

    const res = deleteTime(10, 20, all);

    expect(res).toContain(foo);
    expect(res).toContain(bar);
    expect(res).toContain(baz);
  });

  it("deletes wide", () => {
    const track = [clip(1, 2)];
    const res = deleteTime(0, 3, track);

    expect(res.length).toBe(0);
  });

  it("deletes narrow", () => {
    const all = [clip(0, 3)];
    const res = deleteTime(1, 2, all);

    expect(res.length).toBe(2);
    expect(res[0].startOffsetSec).toBe(0);
    expect(res[0].endOffsetSec).toBe(1);
    expect(res[1].startOffsetSec).toBe(2);
    expect(res[1].endOffsetSec).toBe(3);
  });
});

describe("pushClip", () => {
  it("pushes to right after the last clip", () => {
    const all = [clip(0, 1), clip(1, 2)];
    const foo = clip(0, 1);
    const res = pushClip(foo, all);

    expect(res).toContain(foo);
    expect(foo.startOffsetSec).toEqual(2);
    expect(res.indexOf(foo)).toEqual(2);
  });
});

describe("addClip", () => {
  it("adds correctly on empty space after", () => {
    const all = [clip(0, 1), clip(1, 2)];
    const foo = clip(2, 3);
    const res = addClip(foo, all);

    expect(res).toContain(foo);
    expect(res.indexOf(foo)).toEqual(2);
  });

  it("adds correctly on empty space before", () => {
    const all = [clip(1, 2), clip(2, 3)];
    const foo = clip(0, 1);
    const res = addClip(foo, all);

    expect(res).toContain(foo);
    expect(res.indexOf(foo)).toEqual(0);
  });

  it("adds correctly on empty space in between", () => {
    const all = [clip(0, 1), clip(2, 3)];
    const foo = clip(1, 2);
    const res = addClip(foo, all);

    expect(res).toContain(foo);
    expect(res.indexOf(foo)).toEqual(1);
  });

  it("adds correctly simple overlap at end", () => {
    const all = [clip(0, 10)];
    const foo = clip(5, 15);
    const res = addClip(foo, all);

    expect(res).toContain(foo);
    expect(res.indexOf(foo)).toEqual(1);
    expect(res[0].endOffsetSec).toEqual(5);
  });

  it("adds correctly simple overlap at start", () => {
    const all = [clip(5, 15)];
    const foo = clip(0, 10);
    const res = addClip(foo, all);

    expect(res).toContain(foo);
    expect(res.indexOf(foo)).toEqual(0);
    expect(res[1].startOffsetSec).toEqual(10);
    expect(res[1].endOffsetSec).toEqual(15);
  });

  it("adds correctly when wide overlap over another clip", () => {
    const all = [clip(2, 8)];
    const foo = clip(0, 10);
    const [bar] = all;
    const res = addClip(foo, all);

    expect(res).toContain(foo);
    expect(res).not.toContain(bar);
  });

  it("splits clips correctly when doing a narrow overlap", () => {
    const all = [clip(0, 10)];
    const foo = clip(2, 8);
    const res = addClip(foo, all);
    // expect 0-2,2-8,8-10

    expect(res).toContain(foo);
    expect(res.length).toBe(3);
    expect(res[0].endOffsetSec).toBe(2);
    expect(res[2].startOffsetSec).toBe(8);
  });
});

describe("splitClip", () => {
  it("splits a clip, idk", () => {
    const foo = clip(0, 10);
    const [_, __, all] = splitClip(foo, 5, [foo]);

    expect(all.length).toBe(2);
    expect(all[0].startOffsetSec).toBe(0);
    expect(all[0].endOffsetSec).toBe(5);
    expect(all[1].startOffsetSec).toBe(5);
    expect(all[1].endOffsetSec).toBe(10);
  });

  it("returns the two clips", () => {
    const foo = clip(0, 10);
    const all = [foo];

    const [before, after, res] = splitClip(foo, 5, all);

    expect(res.length).toBe(2);
    expect(res).toContain(before);
    expect(res).toContain(after);
    expect(before.startOffsetSec).toBe(0);
    expect(before.endOffsetSec).toBe(5);
    expect(after.startOffsetSec).toBe(5);
    expect(after.endOffsetSec).toBe(10);
  });

  it("splits a clip with start offset, chained", () => {
    const foo = clip(2, 8);
    const all = [foo];
    const [_before, after, res1] = splitClip(foo, 4, all);
    const [_, __, res2] = splitClip(after, 6, res1);

    expect(res2.length).toBe(3);
    expect(res2[0].startOffsetSec).toBe(2);
    expect(res2[0].endOffsetSec).toBe(4);
    expect(res2[1].startOffsetSec).toBe(4);
    expect(res2[1].endOffsetSec).toBe(6);
    expect(res2[2].startOffsetSec).toBe(6);
    expect(res2[2].endOffsetSec).toBe(8);
  });
});
