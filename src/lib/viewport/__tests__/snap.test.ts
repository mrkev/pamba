import "../../__tests__/mockWebAudio";

import { describe, expect, it } from "vitest";
import { timelineGridBeats } from "../../../ui/axis/getBeatTickData";
import type { AudioProject } from "../../project/AudioProject";
import { shouldSnap, snapToTimelineGrid, timelineGridPulses, timelinePos } from "../snap";

// Just what snapping reads: tempo, the snap toggle, and how wide a pulse is at this zoom.
// At 120 bpm a beat (24 pulses) is 0.5s.
function fakeProject({ beatPx, snap = true }: { beatPx: number; snap?: boolean }) {
  return {
    tempo: { get: () => 120 },
    snapToGrid: { get: () => snap },
    viewport: { pulsesToPx: (p: number) => (p * beatPx) / 24 },
  } as unknown as AudioProject;
}

describe("timelineGridBeats", () => {
  it("goes down to 16th notes zoomed in, and up to many beats zoomed out", () => {
    expect(timelineGridBeats(400)).toBe(1 / 4);
    expect(timelineGridBeats(160)).toBe(1 / 4);
    expect(timelineGridBeats(100)).toBe(1 / 2);
    expect(timelineGridBeats(50)).toBe(1);
    expect(timelineGridBeats(30)).toBe(2);
    expect(timelineGridBeats(10)).toBe(4);
    expect(timelineGridBeats(5)).toBe(16);
    expect(timelineGridBeats(1)).toBe(64);
  });

  it("keeps sub-beat steps on whole pulses", () => {
    expect(timelineGridPulses(fakeProject({ beatPx: 400 }))).toBe(6);
    expect(timelineGridPulses(fakeProject({ beatPx: 100 }))).toBe(12);
  });
});

describe("snapToTimelineGrid", () => {
  it("snaps seconds and pulses to the same grid", () => {
    const project = fakeProject({ beatPx: 50 }); // grid: 1 beat
    expect(snapToTimelineGrid(project, 1.2, "seconds")).toBe(1);
    expect(snapToTimelineGrid(project, 1.3, "seconds")).toBe(1.5);
    expect(snapToTimelineGrid(project, 37, "pulses")).toBe(48);
    expect(snapToTimelineGrid(project, 35, "pulses")).toBe(24);
  });

  it("follows the zoom", () => {
    expect(snapToTimelineGrid(fakeProject({ beatPx: 200 }), 1.2, "seconds")).toBe(1.25); // 16ths
    expect(snapToTimelineGrid(fakeProject({ beatPx: 10 }), 1.2, "seconds")).toBe(2); // 4 beats
  });

  it("also considers the grid shifted through the original position", () => {
    const project = fakeProject({ beatPx: 50 }); // grid: 24 pulses
    // grid lines 24, 48; shifted through 5: 29, 53
    expect(snapToTimelineGrid(project, 30, "pulses", 5)).toBe(29);
    expect(snapToTimelineGrid(project, 26, "pulses", 5)).toBe(24);
  });
});

describe("timelinePos", () => {
  it("snaps only when asked, keeping pulses whole", () => {
    const project = fakeProject({ beatPx: 50 });
    expect(timelinePos(project, true, 37, "pulses")).toBe(48);
    expect(timelinePos(project, false, 37.6, "pulses")).toBe(38);
    expect(timelinePos(project, false, 1.2, "seconds")).toBe(1.2);
  });
});

describe("shouldSnap", () => {
  it("follows the snap toggle, inverted while holding meta", () => {
    expect(shouldSnap(fakeProject({ beatPx: 50, snap: true }), { metaKey: false })).toBe(true);
    expect(shouldSnap(fakeProject({ beatPx: 50, snap: true }), { metaKey: true })).toBe(false);
    expect(shouldSnap(fakeProject({ beatPx: 50, snap: false }), { metaKey: true })).toBe(true);
  });
});
