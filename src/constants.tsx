export const sampleSize = 1024;
export const staticAudioContext = new AudioContext(); // we use to decode data
export const liveAudioContext = new AudioContext(); // we play from this one
export const LIVE_SAMPLE_RATE = liveAudioContext.sampleRate;
export const CLIP_HEIGHT = 88;
export const TRACK_SEPARATOR_HEIGHT = 3;
export const EFFECT_HEIGHT = CLIP_HEIGHT + 46;
export const MIN_TRACK_HEIGHT = 64;
export const TRACK_HEADER_WIDTH = 150;

export const PX_PER_SEC = 10;
export const PX_OVER_SEC = PX_PER_SEC;
export const SECS_PER_PX = 1 / PX_PER_SEC;
export const SECS_OVER_PX = SECS_PER_PX;

export const CANVAS_HEIGHT = 256 / 6;
export const CANVAS_WIDTH = TRACK_HEADER_WIDTH; //512 / 3;

export const TIME_SIGNATURE = [4, 4] as const;
export const SECS_IN_MINUTE = 60;
export const DEFAULT_TEMPO = 75;

import PIANO_ROLL_PLUGIN_URL from "./midi/pianoroll/index?url";

// WAM

export const WAM_PLUGINS: { url: string; kind: "-m" | "-a" | "m-a" | "a-a" }[] = [
  { url: "https://mainline.i3s.unice.fr/wam2/packages/StonePhaserStereo/index.js", kind: "a-a" },
  { url: "https://mainline.i3s.unice.fr/wam2/packages/BigMuff/index.js", kind: "a-a" },
  { url: "https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js", kind: "m-a" },
  { url: "https://mainline.i3s.unice.fr/wam2/packages/synth101/dist/index.js", kind: "m-a" },
  { url: PIANO_ROLL_PLUGIN_URL, kind: "-m" },
];

export const SYNTH_101_URL = "https://mainline.i3s.unice.fr/wam2/packages/synth101/dist/index.js";
export const OBXD_URL = "https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js";

export { PIANO_ROLL_PLUGIN_URL };
