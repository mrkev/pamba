import { ScaleLinear, scaleLinear } from "d3-scale";
import { InitFunctions, JSONOfAuto, number, ReplaceFunctions, SNumber, Structured } from "structured-state";
import { SECS_IN_MIN } from "../../constants";
import { clamp, stepNumber } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/pianorollme/MIDIConfiguration";
import { appEnvironment } from "../AppEnvironment";
import { AudioProject } from "../project/AudioProject";
import { pulsesToSec, TimelineT } from "../project/TimelineT";
import { DerivedState } from "../state/DerivedState";

type AutoProjectViewport = {
  viewportStartPx: SNumber;
  scaleFactor: SNumber;
};

export type XScale = ScaleLinear<number, number>;

export class ProjectViewport extends Structured<AutoProjectViewport, typeof ProjectViewport> {
  readonly project: AudioProject;

  // 1 sec corresponds to 10 px
  readonly secsToPxDS: DerivedState<(factor: number) => XScale>;
  // factor 2: 1sec => 2px
  // factor 3: 1sec => 3px
  // etc

  constructor(
    project: AudioProject,
    readonly projectDivWidth: SNumber,

    // the zoom level. min scale is 0.64, max is 1000.
    // Px per second. Therefore, small = zoom out. big = zoom in.
    readonly scaleFactor: SNumber,
    // the "left" CSS position for the first second visible in the project div
    readonly viewportStartPx: SNumber,
  ) {
    super();
    this.project = project;
    this.secsToPxDS = DerivedState.from(
      [this.scaleFactor],
      (factor: number) =>
        scaleLinear()
          .domain([0, 1])
          .range([0, 1 * factor]) as XScale,
    );

    (window as any).vp = this;
  }

  override replace(autoJson: JSONOfAuto<AutoProjectViewport>, replace: ReplaceFunctions): void {
    replace.number(autoJson.scaleFactor, this.scaleFactor);
    replace.number(autoJson.viewportStartPx, this.viewportStartPx);
  }
  override autoSimplify(): AutoProjectViewport {
    return {
      viewportStartPx: this.viewportStartPx,
      scaleFactor: this.scaleFactor,
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

  // scaleFactor: how many pixels are in one second

  setScale(expectedNewScale: number, mouseX: number = 0) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(0.64, expectedNewScale, 1000);
    const currentScaleFactor = this.scaleFactor.get();
    const scaleFactorFactor = expectedNewScale / currentScaleFactor;

    this.scaleFactor.set(newScale);
    const newStartPx = (this.viewportStartPx.get() + mouseX) * scaleFactorFactor - mouseX;
    if (newStartPx < 0) {
      this.viewportStartPx.set(0);
    } else {
      this.viewportStartPx.set(newStartPx);
    }

    // this.viewportStartPx.setDyn((prev) => {
    //   const newStartPx = (prev + mouseX) * scaleFactorFactor - mouseX;
    //   if (newStartPx < 0) {
    //     return 0;
    //   }
    //   return newStartPx;
    // });
  }

  // Conversions

  pxOfTime(p: TimelineT) {
    switch (p.u) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pulsesToPx(p.ensurePulses());
      case "seconds":
        return this.secsToPx(p.ensureSecs());
    }
  }

  secsToPx(s: number, factorOverride?: number) {
    // console.log("using factor", factorOverride, "instead of ", this.project.scaleFactor.get());
    const factor = factorOverride ?? this.scaleFactor.get();
    return s * factor;
  }

  pulsesToPx(p: number) {
    const bpm = this.project.tempo.get();
    return this.secsToPx(pulsesToSec(p, bpm));
  }

  pxToSecs(px: number, factorOverride?: number) {
    const factor = factorOverride ?? this.scaleFactor.get();
    return px / factor;
  }

  pxToPulses(px: number) {
    const bpm = this.project.tempo.get();
    const secs = this.pxToSecs(px);
    return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
  }

  secsToViewportPx(s: number): number {
    const viewportStartPx = this.viewportStartPx.get();
    return this.secsToPx(s) - viewportStartPx;
  }

  // TODO: more direct method?
  pxForPulse(p: number) {
    const bpm = this.project.tempo.get();
    return this.secsToViewportPx(pulsesToSec(p, bpm));
  }

  timeForPx(px: number): number {
    const viewportStartPx = this.viewportStartPx.get();
    return this.pxToSecs(px + viewportStartPx);
  }

  // pxForBeat(b: number) {
  //   return this.pxForPulse(b * PPQN);
  // }

  secsToPulses(secs: number) {
    const bpm = this.project.tempo.get();
    return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
  }

  // snapping

  snapToTempo(s: number) {
    const tempo = this.project.tempo.get();
    const oneBeatLen = 60 / tempo;
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
