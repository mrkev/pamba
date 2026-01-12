import { JSONOfAuto, Structured } from "structured-state";
import { liveAudioContext, PULSES_PER_BAR, SECS_IN_MIN } from "../../constants";
import { STimelineT } from "../../data/serializable";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { Pulses, Seconds } from "../AbstractClip";
import { exhaustive } from "../state/Subbable";
import { AudioProject } from "./AudioProject";
import { TimelineOperation } from "./TimelineOperation";

// bars might be good to differentiate the future, when
// we work on different time signatures (ie, variable pulses per bar)
export type TimeUnit = "pulses" | "seconds" | "bars";

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
    public unit: TimeUnit,
  ) {
    super();
  }

  /// std

  // TODO: just use autoForm where this is used?
  serialize(): STimelineT {
    return { t: this.t, u: this.unit };
  }

  override autoSimplify(): AutoTimelineT {
    return { t: this.t, u: this.unit };
  }

  override replace(auto: JSONOfAuto<AutoTimelineT>): void {
    this.t = auto.t;
    this.unit = auto.u;
  }

  static construct(auto: AutoTimelineT): TimelineT {
    return Structured.create(TimelineT, auto.t, auto.u);
  }

  /////////////////

  public set(t: TimelineT): void;
  public set(t: number, u?: TimeUnit): void;
  public set(t: number | TimelineT, u?: TimeUnit): void {
    this.featuredMutation(() => {
      if (t instanceof TimelineT) {
        this.set(t.t, t.unit);
        return;
      }

      this.t = t;
      if (u != null) {
        this.unit = u;
      }
    });
  }

  public setTo(op: TimelineOperation, project: AudioProject) {
    this.set(op.solve(this.unit, project));
  }

  public normalize(u: TimeUnit, project: AudioProject): this {
    if (this.unit !== u) {
      this.t = this.asUnit(u, project);
      this.unit = u;
    }
    return this;
  }

  secs(project: AudioProject): Seconds {
    switch (this.unit) {
      case "seconds":
        return this.t as Seconds;
      case "pulses":
        return pulsesToSec(this.t, project.tempo.get()) as Seconds;
      case "bars":
        return pulsesToSec(this.pulses(project), project.tempo.get()) as Seconds;
      default:
        exhaustive(this.unit);
    }
  }

  pulses(project: AudioProject): Pulses {
    return TimelineT.pulses(project, this.t, this.unit);
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
    switch (this.unit) {
      case "seconds":
        return secsToPulses(this.t, project.tempo.get()) / PULSES_PER_BAR;
      case "pulses":
        return this.t / PULSES_PER_BAR;
      case "bars":
        return this.t;
      default:
        exhaustive(this.unit);
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
    return Structured.create(TimelineT, this.t, this.unit);
  }

  addTime(t: number, u: TimeUnit, project: AudioProject) {
    this.featuredMutation(() => {
      if (this.unit === u) {
        this.t += t;
      } else {
        const p = time(t, u);
        this.t += p.asUnit(this.unit, project);
      }
    });
    return this;
  }

  add(p: TimelineT, project: AudioProject) {
    this.featuredMutation(() => {
      if (this.unit === p.unit) {
        this.t += p.t;
      } else {
        this.t += p.asUnit(this.unit, project);
      }
    });
    return this;
  }

  subtract(p: TimelineT, project: AudioProject) {
    this.featuredMutation(() => {
      if (this.unit === p.unit) {
        this.t -= p.t;
      } else {
        this.t -= p.asUnit(this.unit, project);
      }
    });
    return this;
  }

  eq(b: TimelineT, project: AudioProject): boolean {
    if (this.unit === b.unit) {
      return this.t === b.t;
    }
    return timelineT.compare(project, this, "=", b);
  }

  operate(op: (x: number) => number) {
    this.featuredMutation(() => {
      this.t = op(this.t);
    });
    return this;
  }

  ensurePulses() {
    switch (this.unit) {
      case "seconds":
        throw new Error("expected pulses, found " + this.unit);
      case "bars":
        return this.t * PULSES_PER_BAR;
      case "pulses":
        return this.t;
      default:
        exhaustive(this.unit);
    }
  }

  ensureSecs() {
    switch (this.unit) {
      case "seconds":
        return this.t;
      case "bars":
      case "pulses":
        throw new Error("expected pulses, found " + this.unit);
      default:
        exhaustive(this.unit);
    }
  }

  override toString() {
    return `TT.${this._id}(${this.t.toFixed(2)}${this.unit.substring(0, 3)})`;
  }

  renderSimple() {
    return `${this.t}${this.unit[0]}`;
  }
}

export function time(t: number, u: TimeUnit): TimelineT {
  return Structured.create(TimelineT, t, u);
}

export const timelineT = {
  compare(project: AudioProject, a: TimelineT, op: "<" | ">" | "=" | "<=" | ">=" | "!=", b: TimelineT): boolean {
    const aSecs = a.secs(project);
    const bSecs = b.secs(project);
    switch (op) {
      case "<":
        return aSecs < bSecs;
      case "=":
        return aSecs === bSecs;
      case ">":
        return aSecs > bSecs;
      case "!=":
        return aSecs != bSecs;
      case "<=":
        return aSecs <= bSecs;
      case ">=":
        return aSecs >= bSecs;
      default:
        throw exhaustive(op);
    }
  },
};
