import { Structured } from "structured-state";
import { pulsesToSec, secsToPulses } from "../../midi/MidiClip";
import { Pulses, Seconds } from "../AbstractClip";
import { exhaustive } from "../state/Subbable";
import { AudioProject } from "./AudioProject";

export type STimelineT = Readonly<{ t: number; u: TimeUnit }>;

export type TimeUnit = "pulses" | "seconds" | "bars";

// TODO: assuming constant 4/4
const PULSES_PER_BAR = 6 * 4;

// 1 pulse
// 6 puleses = 1 beat
// 4 beats = 1 bar

export class TimelineT extends Structured<STimelineT, typeof TimelineT> {
  constructor(private t: number, public u: TimeUnit) {
    super();
  }

  override serialize(): STimelineT {
    return { t: this.t, u: this.u };
  }

  override replace({ t, u }: STimelineT): void {
    this.t = t;
    this.u = u;
  }

  static construct({ t, u }: STimelineT): TimelineT {
    return Structured.create(TimelineT, t, u);
  }

  public set(t: number, u?: TimeUnit) {
    this.t = t;
    if (u != null) {
      this.u = u;
    }
    this.notifyChange();
  }

  public replaceWith(b: TimelineT) {
    this.set(b.t, b.u);
  }

  secs(project: AudioProject): Seconds {
    switch (this.u) {
      case "seconds":
        return this.t as Seconds;
      case "pulses":
        return pulsesToSec(this.t, project.tempo.get()) as Seconds;
      case "bars":
        return pulsesToSec(this.pulses(project), project.tempo.get()) as Seconds;
      default:
        exhaustive(this.u);
    }
  }

  pulses(project: AudioProject): Pulses {
    return TimelineT.pulses(project, this.t, this.u);
  }

  static pulses(project: AudioProject, t: number, u: TimeUnit): Pulses {
    switch (u) {
      case "seconds":
        return secsToPulses(t, project.tempo.get()) as Pulses;
      case "pulses":
        return t as Pulses;
      case "bars":
        return (t * PULSES_PER_BAR) as Pulses;
      default:
        exhaustive(u);
    }
  }

  // TODO: could replace with get/set function that takes "note" argument, uses pulses setup
  bars(project: AudioProject): number {
    switch (this.u) {
      case "seconds":
        return secsToPulses(this.t, project.tempo.get()) / PULSES_PER_BAR;
      case "pulses":
        return this.t / PULSES_PER_BAR;
      case "bars":
        return this.t;
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
      case "bars":
        throw new Error("TODO: Cant convert bars to px");
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
      case "bars":
        return this.bars(project);
      default:
        exhaustive(u);
    }
  }

  clone() {
    return Structured.create(TimelineT, this.t, this.u);
  }

  add(p: TimelineT, project: AudioProject) {
    if (this.u === p.u) {
      this.t += p.t;
    } else {
      this.t += p.asUnit(this.u, project);
    }
    return this;
  }

  subtract(p: TimelineT, project: AudioProject) {
    if (this.u === p.u) {
      this.t -= p.t;
    } else {
      this.t -= p.asUnit(this.u, project);
    }
    return this;
  }

  eq(b: TimelineT, project: AudioProject): boolean {
    if (this.u === b.u) {
      return this.t === b.t;
    }
    return TimelineT.compare(project, this, "=", b);
  }

  static compare(project: AudioProject, a: TimelineT, op: "<" | ">" | "=", b: TimelineT): boolean {
    const aSecs = a.secs(project);
    const bSecs = b.secs(project);

    switch (op) {
      case "<":
        return aSecs < bSecs;
      case "=":
        return aSecs === bSecs;
      case ">":
        return aSecs > bSecs;
    }
  }

  operate(op: (x: number) => number) {
    this.t = op(this.t);
    return this;
  }

  ensurePulses() {
    switch (this.u) {
      case "seconds":
        throw new Error("expected pulses, found " + this.u);
      case "bars":
        return this.t * PULSES_PER_BAR;
      case "pulses":
        return this.t;
      default:
        exhaustive(this.u);
    }
  }

  ensureSecs() {
    switch (this.u) {
      case "seconds":
        return this.t;
      case "bars":
      case "pulses":
        throw new Error("expected pulses, found " + this.u);
      default:
        exhaustive(this.u);
    }
  }

  override toString() {
    return `${this.t.toFixed(2)}${this.u.substring(0, 3)}`;
  }
}

export function time(t: number, u: "pulses" | "seconds"): TimelineT {
  return Structured.create(TimelineT, t, u);
}
