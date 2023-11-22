import { SECS_IN_MIN, pulsesToSec } from "../../midi/MidiClip";
import { clamp, stepNumber } from "../../utils/math";
import { PPQN } from "../../wam/pianorollme/MIDIConfiguration";
import { SPrimitive } from "../state/LinkedState";
import { AudioProject } from "./AudioProject";

export class ProjectViewportUtil {
  readonly project: AudioProject;
  readonly projectDivWidth = SPrimitive.of(0);

  constructor(project: AudioProject) {
    this.project = project;
    (window as any).vp = this;
  }

  // Scale

  // scaleFactor: how many pixels are in one second

  setScale(expectedNewScale: number, centerOnTimeS: number = 0) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(0.64, expectedNewScale, 1000);
    const currentScaleFactor = this.project.scaleFactor.get();
    const scaleFactorFactor = expectedNewScale / currentScaleFactor;
    this.project.scaleFactor.set(newScale);
    // const realSDelta = newScale / this.project.scaleFactor.get();

    // const xs = 1;

    // const v = -centerOnTimeS * xs + centerOnTimeS;
    // console.log("v", v);

    this.project.viewportStartPx.setDyn((prev) => {
      const newStartPx = prev * scaleFactorFactor;
      console.log("newStartPx", newStartPx);
      return newStartPx;
    });

    // const widthUpToMouse = e.clientX + viewportStartPx;
    // const deltaX = widthUpToMouse - widthUpToMouse * realSDelta;
    // const newStart = viewportStartPx - deltaX;
    // project.viewportStartPx.set(newStart);
  }

  // Conversions

  secsToPx(s: number, factorOverride?: number) {
    // console.log("using factor", factorOverride, "instead of ", this.project.scaleFactor.get());
    const factor = factorOverride ?? this.project.scaleFactor.get();
    return s * factor;
  }

  pxToSecs(px: number, factorOverride?: number) {
    const factor = factorOverride ?? this.project.scaleFactor.get();
    return px / factor;
  }

  pxForTime(s: number): number {
    const viewportStartPx = this.project.viewportStartPx.get();
    return this.secsToPx(s) - viewportStartPx;
  }

  timeForPx(px: number): number {
    const viewportStartPx = this.project.viewportStartPx.get();
    return this.pxToSecs(px + viewportStartPx);
  }

  // TODO: more direct method?
  pulsesToPx(p: number) {
    const bpm = this.project.tempo.get();
    return this.secsToPx(pulsesToSec(p, bpm));
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
