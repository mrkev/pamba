import { ScaleLinear } from "d3-scale";
import { InitFunctions, JSONOfAuto, number, ReplaceFunctions, SNumber, Structured } from "structured-state";
import { SECS_IN_MIN } from "../../constants";
import { clamp, stepNumber } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { appEnvironment } from "../AppEnvironment";
import { AudioProject } from "../project/AudioProject";
import { pulsesToSec, TimelineT } from "../project/TimelineT";

type AutoProjectViewport = {
  viewportStartPx: SNumber;
  scaleFactor: SNumber;
};

export type XScale = ScaleLinear<number, number>;

const START_PADDING_PX = 10;

export class ProjectViewport extends Structured<AutoProjectViewport, typeof ProjectViewport> {
  // 1 sec corresponds to 10 px
  // readonly secsToPxDS: DerivedState<(factor: number) => XScale>;
  // factor 2: 1sec => 2px
  // factor 3: 1sec => 3px
  // etc

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
    // this.secsToPxDS = DerivedState.from(
    //   [this.pxPerSecond],
    //   (factor: number) =>
    //     scaleLinear()
    //       .domain([0, 1])
    //       .range([0, 1 * factor]) as XScale,
    // );
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

  timeToPx(p: TimelineT) {
    switch (p.u) {
      case "bars":
        throw new Error("UNSUPPORTED");
      case "pulses":
        return this.pulsesToPx(p.ensurePulses());
      case "seconds":
        return this.secsToPx(p.ensureSecs());
    }
  }

  secsToPx(s: number) {
    const factor = this.pxPerSecond.get();

    return ymxb(factor, s, 0);
  }

  secsToViewportPx(s: number): number {
    const factor = this.pxPerSecond.get();
    const viewportStartPx = this.scrollLeftPx.get();

    return ymxb(factor, s, -viewportStartPx);
  }

  pulsesToPx(p: number) {
    const bpm = this.project.tempo.get();
    return this.secsToPx(pulsesToSec(p, bpm));
  }

  // TODO: more direct method?
  pulsesToViewportPx(p: number) {
    const bpm = this.project.tempo.get();
    const viewportStartPx = this.scrollLeftPx.get();
    return this.secsToPx(pulsesToSec(p, bpm)) - viewportStartPx;
  }

  pxToSecs(px: number) {
    const factor = this.pxPerSecond.get();
    return px / factor;
  }

  pxToPulses(px: number) {
    const bpm = this.project.tempo.get();
    const secs = this.pxToSecs(px);
    return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
  }

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

/** y = mx + b */
function ymxb(m: number, x: number, b: number) {
  return m * x + b;
}
