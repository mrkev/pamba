import { clamp } from "../../utils/math";
import { SPrimitive } from "../state/LinkedState";
import { AudioProject } from "./AudioProject";

export class ProjectViewportUtil {
  readonly project: AudioProject;
  readonly projectDivWidth = SPrimitive.of(0);

  constructor(project: AudioProject) {
    this.project = project;
  }

  // Scale

  setScale(expectedNewScale: number, centerOnTimeS: number = 0) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(0.64, expectedNewScale, 1000);
    this.project.scaleFactor.set(newScale);
    // const realSDelta = newScale / this.project.scaleFactor.get();

    const xs = 1;

    const v = -centerOnTimeS * xs + centerOnTimeS;
    this.project.viewportStartPx.set(v);

    // const widthUpToMouse = e.clientX + viewportStartPx;
    // const deltaX = widthUpToMouse - widthUpToMouse * realSDelta;
    // const newStart = viewportStartPx - deltaX;
    // project.viewportStartPx.set(newStart);
  }

  // Conversions

  secsToPx(s: number, factorOverride?: number) {
    console.log("using factor", factorOverride, "instead of ", this.project.scaleFactor.get());
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

  timeForPx(s: number): number {
    const viewportStartPx = this.project.viewportStartPx.get();
    return this.pxToSecs(s + viewportStartPx);
  }
}
