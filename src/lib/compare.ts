import { exhaustive } from "../utils/exhaustive";

export type CompareOp = "<" | ">" | "=" | "<=" | ">=" | "!=";

export function compare(a: number, op: CompareOp, b: number): boolean {
  switch (op) {
    case "<":
      return a < b;
    case "=":
      return a === b;
    case ">":
      return a > b;
    case "!=":
      return a != b;
    case "<=":
      return a <= b;
    case ">=":
      return a >= b;
    default:
      throw exhaustive(op);
  }
}
