import { AudioProject } from "./AudioProject";

export class ProjectViewportUtil {
  readonly project: AudioProject;
  constructor(project: AudioProject) {
    this.project = project;
  }

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
