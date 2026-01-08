import { AudioProject } from "./AudioProject";
import { TimelineT, TimeUnit } from "./TimelineT";

export class TimelineOperation {
  constructor(
    readonly op: "+",
    readonly a: TimelineT,
    readonly b: TimelineT,
  ) {}

  solve(u: TimeUnit, project: AudioProject): number {
    switch (this.op) {
      case "+":
        return this.a.asUnit(u, project) + this.b.asUnit(u, project);
    }
  }
}

export function timeop(a: TimelineT, op: "+", b: TimelineT) {
  return new TimelineOperation(op, a, b);
}
