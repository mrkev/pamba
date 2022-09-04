export const FAUST_EFFECTS = {
  PANNER: () => import("./Panner.dsp"),
  REVERB: () => import("./dattorro.dsp"),
} as const;

export type EffectID = keyof typeof FAUST_EFFECTS;
