import { ScaleLinear } from "d3-scale";
import { InitFunctions, JSONOfAuto, number, ReplaceFunctions, SNumber, Structured } from "structured-state";
import { SECS_IN_MIN } from "../../constants";
import { exhaustive } from "../../utils/exhaustive";
import { clamp } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { appEnvironment } from "../AppEnvironment";
import { AudioProject } from "../project/AudioProject";
import { TimelineT, TimeUnit } from "../project/TimelineT";
import { standardViewport, StandardViewport } from "./StandardViewport";
import { ymxb } from "./linear";

type AutoProjectViewport = {
  viewportStartPx: SNumber;
  scaleFactor: SNumber;
};

export type XScale = ScaleLinear<number, number>;

export class ProjectViewport
  extends Structured<AutoProjectViewport, typeof ProjectViewport>
  implements StandardViewport
{
  readonly START_PADDING_PX = 8;
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
        return standardViewport.secsToPx(this, p.ensureSecs(), mode);
      case "frames":
        throw new Error("unimplemented");
      default:
        exhaustive(p.unit);
    }
  }

  timeToViewportPx(p: TimelineT, mode: "pos") {
    switch (p.unit) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pulsesToViewportPx(p.ensurePulses(), mode);
      case "seconds":
        return standardViewport.secsToViewportPx(this, p.ensureSecs(), mode);
      case "frames":
        throw new Error("unimplemented");
      default:
        exhaustive(p.unit);
    }
  }

  pulsesToPx(p: number, mode: "len" | "pos") {
    const b = mode === "len" ? 0 : this.START_PADDING_PX;
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
    const b = this.START_PADDING_PX;

    const viewportStartPx = this.scrollLeftPx.get();

    return ymxb(m, p, -viewportStartPx + b);
  }

  pxToPulses(px: number, mode: "len" | "pos") {
    const bpm = this.project.tempo.get();
    const secs = standardViewport.pxToSecs(this, px, mode);
    return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
  }

  pxTo(px: number, unit: TimeUnit, mode: "len" | "pos") {
    switch (unit) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pxToPulses(px, mode);
      case "seconds":
        return standardViewport.pxToSecs(this, px, mode);
      case "frames":
        throw new Error("unimplemented");
      default:
        exhaustive(unit);
    }
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
