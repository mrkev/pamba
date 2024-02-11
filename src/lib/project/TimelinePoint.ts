import { Structured } from "structured-state";
import { exhaustive } from "../state/Subbable";
import { AudioProject } from "./AudioProject";
import { pulsesToSec } from "../../midi/MidiClip";
import { Seconds } from "../AbstractClip";

type TimeUnit = "pulses" | "seconds";

export type STimelinePoint = { t: number; u: TimeUnit };

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
    public t: number,
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
}

export function time(t: number, u: "pulses" | "seconds"): TimelinePoint {
  return Structured.create(TimelinePoint, t, u);
}
