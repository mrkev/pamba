import { SArray } from "structured-state";
import { describe, expect, it } from "vitest";
import { nullthrows } from "../../utils/nullthrows";
import { BaseClip } from "../BaseClip";
import { addClip, assertClipInvariants, deleteTime, printClips, pushClip, removeClip, splitClip } from "../BaseClipFn";

function bclip(startOffset: number, endOffset: number): BaseClip {
  const result = BaseClip.of(startOffset, endOffset - startOffset, 0, endOffset - startOffset);
  result.timelineStartSec = startOffset;
  return result;
}

function clips(clips: BaseClip[]) {
  return SArray.create(clips);
}

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
    console.log(printClips(all), "\n");
    deleteTime(1, 2, all);
    console.log(printClips(all));

    expect(all.length).toBe(2);
    expect(all.at(0)?.timelineStartSec).toBe(0);
    expect(all.at(0)?.timelineEndSec).toBe(1);
    expect(all.at(1)?.timelineStartSec).toBe(2);
    expect(all.at(1)?.timelineEndSec).toBe(3);
  });
});

describe("pushClip", () => {
  it("pushes to right after the last clip", () => {
    const all = clips([bclip(0, 1), bclip(1, 2)]);
    const foo = bclip(0, 1);
    const res = pushClip(foo, all);

    expect(res).toContain(foo);
    expect(foo.timelineStartSec).toEqual(2);
    expect(res.indexOf(foo)).toEqual(2);
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
    expect(all.at(0)?.timelineEndSec).toEqual(5);
  });

  it("adds correctly simple overlap at start", () => {
    const all = clips([bclip(5, 15)]);
    const foo = bclip(0, 10);
    addClip(foo, all);

    expect(all).toContain(foo);
    expect(all.indexOf(foo)).toEqual(0);
    expect(all.at(1)?.timelineStartSec).toEqual(10);
    expect(all.at(1)?.timelineEndSec).toEqual(15);
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
    expect(all.at(0)?.timelineEndSec).toBe(2);
    expect(all.at(2)?.timelineStartSec).toBe(8);
  });
});

describe("splitClip", () => {
  it("splits a clip, idk", () => {
    const foo = bclip(0, 10);
    const all = clips([foo]);
    splitClip(foo, 5, all);

    expect(all.length).toBe(2);
    expect(all.at(0)?.timelineStartSec).toBe(0);
    expect(all.at(0)?.timelineEndSec).toBe(5);
    expect(all.at(1)?.timelineStartSec).toBe(5);
    expect(all.at(1)?.timelineEndSec).toBe(10);
  });

  it("returns the two clips", () => {
    const foo = bclip(0, 10);
    const all = clips([foo]);

    const [before, after] = nullthrows(splitClip(foo, 5, all));

    expect(all.length).toBe(2);
    expect(all).toContain(before);
    expect(all).toContain(after);
    expect(before.timelineStartSec).toBe(0);
    expect(before.timelineEndSec).toBe(5);
    expect(after.timelineStartSec).toBe(5);
    expect(after.timelineEndSec).toBe(10);
  });

  it("splits a clip with start offset, chained", () => {
    const foo = bclip(2, 8);
    const all = clips([foo]);
    const [_before, after] = nullthrows(splitClip(foo, 4, all));
    const [_, __] = nullthrows(splitClip(after, 6, all));

    expect(all.length).toBe(3);
    expect(all.at(0)?.timelineStartSec).toBe(2);
    expect(all.at(0)?.timelineEndSec).toBe(4);
    expect(all.at(1)?.timelineStartSec).toBe(4);
    expect(all.at(1)?.timelineEndSec).toBe(6);
    expect(all.at(2)?.timelineStartSec).toBe(6);
    expect(all.at(2)?.timelineEndSec).toBe(8);
  });
});
