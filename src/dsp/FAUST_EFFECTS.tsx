export const FAUST_EFFECTS = {
  PANNER: () => import("./Panner.dsp"),
  REVERB: () => import("./dattorro.dsp"),
  PITCH_SHIFTER: () => import("./pitchShifter.dsp"),
} as const;

export type EffectID = keyof typeof FAUST_EFFECTS;
