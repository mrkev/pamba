import { describe, expect, it } from "vitest";
import { stepNumber } from "../math";

describe("stepNumber", () => {
  it("rounds to the nearest step", () => {
    expect(stepNumber(1.01, 0.5)).toBe(1);
    expect(stepNumber(1.24, 0.5)).toBe(1);
    expect(stepNumber(1.26, 0.5)).toBe(1.5);
    expect(stepNumber(2.1, 2)).toBe(2);
    expect(stepNumber(3.4, 2)).toBe(4);
  });

  it("rounds pulses to the nearest beat", () => {
    expect(stepNumber(23, 24)).toBe(24);
    expect(stepNumber(13, 24)).toBe(24);
    expect(stepNumber(11, 24)).toBe(0);
    expect(stepNumber(48, 24)).toBe(48);
  });

  it("rounds to a grid offset by origin", () => {
    // grid: ..., -3, 1, 5, 9, ...
    expect(stepNumber(3.5, 4, 1)).toBe(5);
    expect(stepNumber(2.5, 4, 1)).toBe(1);
    expect(stepNumber(10, 4, 1)).toBe(9);
    // origin past the value, and origin larger than step, describe the same grid
    expect(stepNumber(3.5, 4, 13)).toBe(5);
    expect(stepNumber(-2, 4, 1)).toBe(-3);
  });

  it("returns values already on the grid unchanged", () => {
    expect(stepNumber(0, 24)).toBe(0);
    expect(stepNumber(96, 96, 0)).toBe(96);
    expect(stepNumber(7, 4, 3)).toBe(7);
  });

  it("returns the number unchanged for a non-positive step", () => {
    expect(stepNumber(3.3, 0)).toBe(3.3);
    expect(stepNumber(3.3, -1)).toBe(3.3);
  });
});
