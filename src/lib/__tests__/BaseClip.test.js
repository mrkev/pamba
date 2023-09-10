import { BaseClip } from "../BaseClip";

function clip(startOffset, endOffset) {
  const DEFAULT_SAMPLE_RATE = 1000;
  const result = new BaseClip(endOffset - startOffset, DEFAULT_SAMPLE_RATE);
  result.startOffsetSec = startOffset;
  return result;
}

describe("startOffsetSec", () => {
  it("changing startOffsetSec moves the clip", () => {
    const foo = clip(0, 1);
    foo.startOffsetSec = 10;

    expect(foo.startOffsetSec).toBe(10);
    expect(foo.endOffsetSec).toBe(11);
    expect(foo.trimStartSec).toBe(0);
    expect(foo.trimEndSec).toBe(1);
  });
});

describe("endOffsetSec", () => {
  it("setting when clip offset is 0", () => {
    const foo = clip(0, 10);
    foo.endOffsetSec = 5;

    expect(foo.startOffsetSec).toBe(0);
    expect(foo.endOffsetSec).toBe(5);
    expect(foo.trimStartSec).toBe(0);
    expect(foo.trimEndSec).toBe(5);
  });

  it("setting when clip offset isn't 0", () => {
    const foo = clip(2, 6);
    foo.endOffsetSec = 5;

    expect(foo.startOffsetSec).toBe(2);
    expect(foo.endOffsetSec).toBe(5);
    expect(foo.trimStartSec).toBe(0);
    expect(foo.trimEndSec).toBe(3);
  });
});
