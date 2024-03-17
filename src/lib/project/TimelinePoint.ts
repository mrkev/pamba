import { Structured } from "structured-state";
import { pulsesToSec, secsToPulses } from "../../midi/MidiClip";
import { Pulses, Seconds } from "../AbstractClip";
import { exhaustive } from "../state/Subbable";
import { AudioProject } from "./AudioProject";

export type TimeUnit = "pulses" | "seconds";

export type STimelinePoint = Readonly<{ t: number; u: TimeUnit }>;

export class TimelinePoint extends Structured<STimelinePoint, typeof TimelinePoint> {
  override serialize(): STimelinePoint {
    return { t: this.t, u: this.u };
  }

  override replace({ t, u }: STimelinePoint): void {
    this.t = t;
    this.u = u;
  }

  static construct({ t, u }: STimelinePoint): TimelinePoint {
    return Structured.create(TimelinePoint, t, u);
  }

  public set(t: number, u?: TimeUnit) {
    this.t = t;
    if (u != null) {
      this.u = u;
    }
    this._notifyChange();
  }

  constructor(
    private t: number,
    public u: "pulses" | "seconds",
  ) {
    super();
  }

  secs(project: AudioProject): Seconds {
    switch (this.u) {
      case "seconds":
        return this.t as Seconds;
      case "pulses":
        return pulsesToSec(this.t, project.tempo.get()) as Seconds;
      default:
        exhaustive(this.u);
    }
  }

  pulses(project: AudioProject): Pulses {
    switch (this.u) {
      case "seconds":
        return secsToPulses(this.t, project.tempo.get()) as Pulses;
      case "pulses":
        return this.t as Pulses;
      default:
        exhaustive(this.u);
    }
  }

  px(project: AudioProject) {
    switch (this.u) {
      case "seconds":
        return project.viewport.pxForTime(this.t);
      case "pulses":
        return project.viewport.pxForPulse(this.t);
      default:
        exhaustive(this.u);
    }
  }

  asUnit(u: TimeUnit, project: AudioProject) {
    switch (u) {
      case "seconds":
        return this.secs(project);
      case "pulses":
        return this.pulses(project);
      default:
        exhaustive(u);
    }
  }

  clone() {
    return new TimelinePoint(this.t, this.u);
  }

  add(p: TimelinePoint, project: AudioProject) {
    if (this.u === p.u) {
      this.t += p.t;
    } else {
      this.t += p.asUnit(this.u, project);
    }
    return this;
  }

  subtract(p: TimelinePoint, project: AudioProject) {
    if (this.u === p.u) {
      this.t -= p.t;
    } else {
      this.t -= p.asUnit(this.u, project);
    }
    return this;
  }

  operate(op: (x: number) => number) {
    this.t = op(this.t);
    return this;
  }
}

export function time(t: number, u: "pulses" | "seconds"): TimelinePoint {
  return Structured.create(TimelinePoint, t, u);
}
