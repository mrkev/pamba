import { ScaleLinear } from "d3-scale";
import { InitFunctions, JSONOfAuto, number, ReplaceFunctions, SNumber, Structured } from "structured-state";
import { SECS_IN_MIN } from "../../constants";
import { clamp } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { appEnvironment } from "../AppEnvironment";
import { AudioProject } from "../project/AudioProject";
import { TimelineT, TimeUnit } from "../project/TimelineT";
import { StandardViewport } from "./StandardViewport";
import { inv_ymxb, ymxb } from "./linear";

type AutoProjectViewport = {
  viewportStartPx: SNumber;
  scaleFactor: SNumber;
};

export type XScale = ScaleLinear<number, number>;

export const START_PADDING_PX = 8;

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

  // Conversions

  timeToPx(p: TimelineT, mode: "len" | "pos") {
    switch (p.unit) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pulsesToPx(p.ensurePulses(), mode);
      case "seconds":
        return this.secsToPx(p.ensureSecs(), mode);
    }
  }

  timeToViewportPx(p: TimelineT, mode: "pos") {
    switch (p.unit) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pulsesToViewportPx(p.ensurePulses(), mode);
      case "seconds":
        return this.secsToViewportPx(p.ensureSecs(), mode);
    }
  }

  secsToPx(s: number, mode: "len" | "pos") {
    const b = mode === "len" ? 0 : START_PADDING_PX;
    const factor = this.pxPerSecond.get();
    // y = mx + b
    return ymxb(factor, s, b);
  }

  secsToViewportPx(s: number, mode: "pos"): number {
    const factor = this.pxPerSecond.get();
    const viewportStartPx = this.scrollLeftPx.get();
    const b = START_PADDING_PX;

    return ymxb(factor, s, -viewportStartPx + b);
  }

  pulsesToPx(p: number, mode: "len" | "pos") {
    const b = mode === "len" ? 0 : START_PADDING_PX;
    const bpm = this.project.tempo.get();
    // const secs = pulsesToSec(p, bpm);

    const factor = this.pxPerSecond.get();
    const m = (factor * SECS_IN_MIN) / (PPQN * bpm);

    return ymxb(m, p, b);
  }

  pulsesToViewportPx(p: number, mode: "pos") {
    const bpm = this.project.tempo.get();
    const factor = this.pxPerSecond.get();
    const m = (factor * SECS_IN_MIN) / (PPQN * bpm);
    const b = START_PADDING_PX;

    const viewportStartPx = this.scrollLeftPx.get();

    return ymxb(m, p, -viewportStartPx + b);
  }

  pxToSecs(px: number, mode: "len" | "pos") {
    const b = mode === "len" ? 0 : START_PADDING_PX;
    const factor = this.pxPerSecond.get();
    return inv_ymxb(factor, px, b);
  }

  pxToPulses(px: number, mode: "len" | "pos") {
    const bpm = this.project.tempo.get();
    const secs = this.pxToSecs(px, mode);
    return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
  }

  pxTo(px: number, unit: TimeUnit, mode: "len" | "pos") {
    switch (unit) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pxToPulses(px, mode);
      case "seconds":
        return this.pxToSecs(px, mode);
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
}

export const projectViewport = {
  /**
   * Sets the horizontal scale, zooming in our out relative ot a specific point x
   */
  setXScale(viewport: ProjectViewport, expectedNewScale: number, mouseX: number = 0) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(0.64, expectedNewScale, 1000);
    const currentScaleFactor = viewport.pxPerSecond.get();
    const scaleFactorFactor = expectedNewScale / currentScaleFactor;

    viewport.pxPerSecond.set(newScale);
    const newStartPx = (viewport.scrollLeftPx.get() + mouseX) * scaleFactorFactor - mouseX;
    if (newStartPx < 0) {
      viewport.scrollLeftPx.set(0);
    } else {
      viewport.scrollLeftPx.set(newStartPx);
    }
  },
};
