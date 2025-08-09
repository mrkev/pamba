import "./mockWebAudio";

import { AudioBuffer } from "standardized-audio-context-mock";
import { describe, expect, it } from "vitest";
import { AudioClip } from "../AudioClip";
import { SharedAudioBuffer } from "../SharedAudioBuffer";

function clip(startOffset: number, endOffset: number) {
  const buffer = new AudioBuffer({ length: 44100 * 15, sampleRate: 44100 });
  return AudioClip.fromBuffer(new SharedAudioBuffer(buffer as any), "url", "foo", {
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
    expect(foo.getTimelineEndSec()).toBe(11);
    expect(foo.bufferOffset.ensureSecs()).toBe(0);
  });
});

describe("endOffsetSec", () => {
  it("setting when clip offset is 0", () => {
    const foo = clip(0, 10);
    foo.setTimelineEndSec(5);

    expect(foo.timelineStartSec).toBe(0);
    expect(foo.getTimelineEndSec()).toBe(5);
    expect(foo.bufferOffset.ensureSecs()).toBe(0);
  });

  it("setting when clip offset isn't 0", () => {
    const foo = clip(2, 6);
    foo.setTimelineEndSec(5);

    expect(foo.timelineStartSec).toBe(2);
    expect(foo.getTimelineEndSec()).toBe(5);
    expect(foo.bufferOffset.ensureSecs()).toBe(0);
  });
});
