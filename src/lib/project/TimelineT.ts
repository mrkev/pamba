import { JSONOfAuto, Structured } from "structured-state";
import { liveAudioContext, PULSES_PER_BAR, SECS_IN_MIN } from "../../constants";
import { PPQN } from "../../wam/pianorollme/MIDIConfiguration";
import { Pulses, Seconds } from "../AbstractClip";
import { exhaustive } from "../state/Subbable";
import { AudioProject } from "./AudioProject";

export type TimeUnit = "pulses" | "seconds" | "bars";

export type STimelineT = Readonly<{ t: number; u: TimeUnit }>;
type AutoTimelineT = STimelineT;

function pulsesToFr(pulses: number, bpm: number) {
  // TODO: not a constant sample rate
  const k = (liveAudioContext().sampleRate * SECS_IN_MIN) / PPQN;
  return (k * pulses) / bpm;
}

export function pulsesToSec(pulses: number, bpm: number) {
  return (pulses * SECS_IN_MIN) / (PPQN * bpm);
}

export function secsToPulses(secs: number, bpm: number) {
  return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
}

export class TimelineT extends Structured<AutoTimelineT, typeof TimelineT> {
  constructor(
    // time and unit
    private t: number,
    public u: TimeUnit,
  ) {
    super();
  }

  /// std

  // TODO: just use autoForm where this is used?
  serialize(): STimelineT {
    return { t: this.t, u: this.u };
  }

  override autoSimplify(): AutoTimelineT {
    return { t: this.t, u: this.u };
  }

  override replace(auto: JSONOfAuto<AutoTimelineT>): void {
    this.t = auto.t;
    this.u = auto.u;
    // console.log("t is now", this.t, this._id, this._id);
  }

  static construct(auto: AutoTimelineT): TimelineT {
    return Structured.create(TimelineT, auto.t, auto.u);
  }

  /////////////////

  public set(t: number, u?: TimeUnit) {
    this.featuredMutation(() => {
      this.t = t;
      if (u != null) {
        this.u = u;
      }
    });
  }

  public replaceWith(b: TimelineT) {
    this.set(b.t, b.u);
  }

  public normalize(u: TimeUnit, project: AudioProject): this {
    if (this.u !== u) {
      this.featuredMutation(() => {
        this.t = this.asUnit(u, project);
        this.u = u;
      });
    }
    return this;
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
        return project.viewport.secsToViewportPx(this.t);
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

  addTime(t: number, u: TimeUnit, project: AudioProject) {
    this.featuredMutation(() => {
      if (this.u === u) {
        this.t += t;
      } else {
        const p = time(t, u);
        this.t += p.asUnit(this.u, project);
      }
    });
    return this;
  }

  add(p: TimelineT, project: AudioProject) {
    this.featuredMutation(() => {
      if (this.u === p.u) {
        this.t += p.t;
      } else {
        this.t += p.asUnit(this.u, project);
      }
    });
    return this;
  }

  subtract(p: TimelineT, project: AudioProject) {
    this.featuredMutation(() => {
      if (this.u === p.u) {
        this.t -= p.t;
      } else {
        this.t -= p.asUnit(this.u, project);
      }
    });
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
    this.featuredMutation(() => {
      this.t = op(this.t);
    });
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
    return `TT.${this._id}(${this.t.toFixed(2)}${this.u.substring(0, 3)})`;
  }
}

export function time(t: number, u: TimeUnit): TimelineT {
  return Structured.create(TimelineT, t, u);
}
