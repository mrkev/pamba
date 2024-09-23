import "./mockWebAudio";

import { AudioBuffer } from "standardized-audio-context-mock";
import { describe, expect, it } from "vitest";
import { AudioClip } from "../AudioClip";

function clip(startOffset: number, endOffset: number) {
  const buffer = new AudioBuffer({ length: 44100 * 15, sampleRate: 44100 });
  return AudioClip.fromBuffer(buffer, "url", "foo", {
    bufferOffset: 0,
    timelineStartSec: startOffset,
    clipLengthSec: endOffset - startOffset,
  });
}

describe("timelineStartSec", () => {
  it("changing timelineStartSec moves the clip", () => {
    const foo = clip(0, 1);
    foo.timelineStart.set(10, "seconds");

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
