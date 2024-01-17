import { describe, expect, it } from "vitest";

import { BaseClip } from "../BaseClip";

function clip(startOffset: number, endOffset: number) {
  const result = BaseClip.of(startOffset, endOffset, 0, endOffset - startOffset);
  // result.startOffsetSec = startOffset;
  return result;
}

describe("timelineStartSec", () => {
  it("changing timelineStartSec moves the clip", () => {
    const foo = clip(0, 1);
    foo.timelineStartSec = 10;

    expect(foo.timelineStartSec).toBe(10);
    expect(foo.timelineEndSec).toBe(11);
    expect(foo.trimStartSec).toBe(0);
    expect(foo.trimEndSec).toBe(1);
  });
});

describe("endOffsetSec", () => {
  it("setting when clip offset is 0", () => {
    const foo = clip(0, 10);
    foo.timelineEndSec = 5;

    expect(foo.timelineStartSec).toBe(0);
    expect(foo.timelineEndSec).toBe(5);
    expect(foo.trimStartSec).toBe(0);
    expect(foo.trimEndSec).toBe(5);
  });

  it("setting when clip offset isn't 0", () => {
    const foo = clip(2, 6);
    foo.timelineEndSec = 5;

    expect(foo.timelineStartSec).toBe(2);
    expect(foo.timelineEndSec).toBe(5);
    expect(foo.trimStartSec).toBe(0);
    expect(foo.trimEndSec).toBe(3);
  });
});
