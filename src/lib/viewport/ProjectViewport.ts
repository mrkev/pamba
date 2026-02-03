import { ScaleLinear } from "d3-scale";
import { InitFunctions, JSONOfAuto, number, ReplaceFunctions, SNumber, Structured } from "structured-state";
import { SECS_IN_MIN } from "../../constants";
import { clamp, stepNumber } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { appEnvironment } from "../AppEnvironment";
import { AudioProject } from "../project/AudioProject";
import { TimelineT, TimeUnit } from "../project/TimelineT";
import { StandardViewport } from "./StandardViewport";

type AutoProjectViewport = {
  viewportStartPx: SNumber;
  scaleFactor: SNumber;
};

export type XScale = ScaleLinear<number, number>;

export const START_PADDING_PX = 0;

export class ProjectViewport
  extends Structured<AutoProjectViewport, typeof ProjectViewport>
  implements StandardViewport
{
  constructor(
    readonly project: AudioProject,
    readonly projectDivWidth: SNumber,
    // the zoom level. min scale is 0.64, max is 1000.
    // how many pixels are in a second. Therefore, small = zoom out. big = zoom in.
    readonly pxPerSecond: SNumber,
    // the "left" CSS position for the first second visible in the project div
    readonly scrollLeftPx: SNumber,
  ) {
    super();
  }

  override replace(autoJson: JSONOfAuto<AutoProjectViewport>, replace: ReplaceFunctions): void {
    replace.number(autoJson.scaleFactor, this.pxPerSecond);
    replace.number(autoJson.viewportStartPx, this.scrollLeftPx);
  }

  override autoSimplify(): AutoProjectViewport {
    return {
      viewportStartPx: this.scrollLeftPx,
      scaleFactor: this.pxPerSecond,
    };
  }

  static construct(auto: JSONOfAuto<AutoProjectViewport>, init: InitFunctions): ProjectViewport {
    return Structured.create(
      ProjectViewport,
      nullthrows(appEnvironment.activeProject()), // should always be already loaded
      number(0), // will be set by UI later
      init.number(auto.scaleFactor),
      init.number(auto.viewportStartPx),
    );
  }

  // Scale

  setScale(expectedNewScale: number, mouseX: number = 0) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(0.64, expectedNewScale, 1000);
    const currentScaleFactor = this.pxPerSecond.get();
    const scaleFactorFactor = expectedNewScale / currentScaleFactor;

    this.pxPerSecond.set(newScale);
    const newStartPx = (this.scrollLeftPx.get() + mouseX) * scaleFactorFactor - mouseX;
    if (newStartPx < 0) {
      this.scrollLeftPx.set(0);
    } else {
      this.scrollLeftPx.set(newStartPx);
    }
  }

  // Conversions

  timeToPx(p: TimelineT, b = 0) {
    switch (p.unit) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pulsesToPx(p.ensurePulses(), b);
      case "seconds":
        return this.secsToPx(p.ensureSecs(), b);
    }
  }

  timeToViewportPx(p: TimelineT, b = 0) {
    switch (p.unit) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pulsesToViewportPx(p.ensurePulses(), b);
      case "seconds":
        return this.secsToViewportPx(p.ensureSecs(), b);
    }
  }

  secsToPx(s: number, b = 0) {
    const factor = this.pxPerSecond.get();
    return ymxb(factor, s, b); // y = mx + b
  }

  secsToViewportPx(s: number, b = 0): number {
    const factor = this.pxPerSecond.get();
    const viewportStartPx = this.scrollLeftPx.get();

    return ymxb(factor, s, -viewportStartPx + b);
  }

  pulsesToPx(p: number, b = 0) {
    const bpm = this.project.tempo.get();
    // const secs = pulsesToSec(p, bpm);

    const factor = this.pxPerSecond.get();
    const m = (factor * SECS_IN_MIN) / (PPQN * bpm);

    return ymxb(m, p, b);
  }

  pulsesToViewportPx(p: number, b = 0) {
    const bpm = this.project.tempo.get();
    const factor = this.pxPerSecond.get();
    const m = (factor * SECS_IN_MIN) / (PPQN * bpm);

    const viewportStartPx = this.scrollLeftPx.get();

    return ymxb(m, p, -viewportStartPx + b);
  }

  pxToSecs(px: number, b = 0) {
    const factor = this.pxPerSecond.get();
    return inv_ymxb(factor, px, b);
  }

  pxToPulses(px: number) {
    const bpm = this.project.tempo.get();
    const secs = this.pxToSecs(px);
    return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
  }

  pxTo(px: number, unit: TimeUnit) {
    switch (unit) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pxToPulses(px);
      case "seconds":
        return this.pxToSecs(px);
    }
    throw new Error("unimplemented");
  }

  secsToPulses(secs: number) {
    const bpm = this.project.tempo.get();
    return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
  }

  pulsesToSecs(pulses: number) {
    const bpm = this.project.tempo.get();
    return (pulses * SECS_IN_MIN) / (PPQN * bpm);
  }

  // snapping

  snapToTempo(s: number) {
    const tempo = this.project.tempo.get();
    const oneBeatLen = SECS_IN_MIN / tempo;
    const snappedTime = stepNumber(s, oneBeatLen);
    return snappedTime;
  }
}

export function shouldSnap(project: AudioProject, e: MouseEvent) {
  let snap = project.snapToGrid.get();
  if (e.metaKey) {
    snap = !snap;
  }
  return snap;
}

export function snapped(project: AudioProject, e: MouseEvent, s: number) {
  let snap = project.snapToGrid.get();
  if (e.metaKey) {
    snap = !snap;
  }
  return snap ? project.viewport.snapToTempo(s) : s;
}

/** y = mx + b */
export function ymxb(m: number, x: number, b: number) {
  return m * x + b;
}

// x = (y - b) / m
export function inv_ymxb(m: number, y: number, b: number) {
  return (y - b) / m;
}
