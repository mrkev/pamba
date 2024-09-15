export const FAUST_EFFECTS = {
  PANNER: () => import("./Panner.dsp"),
  REVERB: () => import("./dattorro.dsp"),
  PITCH_SHIFTER: () => import("./pitchShifter.dsp"),
} as const;

export type FaustEffectID = keyof typeof FAUST_EFFECTS;

export function validateFaustEffectId(val: string): FaustEffectID {
  if ((FAUST_EFFECTS as any)[val] == null) {
    throw new Error(`Invalid FaustEffectID: ${val}`);
  }
  return val as FaustEffectID;
}
