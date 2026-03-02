export const FAUST_EFFECTS = {
  PANNER: () => import("./Panner.dsp"),
  REVERB: () => import("./dattorro.dsp"),
  PITCH_SHIFTER: () => import("./pitchShifter.dsp"),
  TRACK_UTILITY: () => import("./TrackUtility.dsp"),
} as const;

/** Special faust effect, since it's used on all tracks */
export const TRACK_UTILITY_ID = "TRACK_UTILITY";

export type FaustEffectID = keyof typeof FAUST_EFFECTS;

export function validateFaustEffectId(val: string): FaustEffectID {
  if ((FAUST_EFFECTS as any)[val] == null) {
    throw new Error(`Invalid FaustEffectID: ${val}`);
  }
  return val as FaustEffectID;
}
