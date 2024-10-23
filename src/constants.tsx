import { boxUp } from "./boxed";

export const sampleSize = 1024;
export const CLIP_HEIGHT = 88;
export const TRACK_SEPARATOR_HEIGHT = 3;
export const EFFECT_HEIGHT = CLIP_HEIGHT + 46;
export const MIN_TRACK_HEIGHT = 76;
export const TRACK_HEADER_WIDTH = 150;

export const staticAudioContext = boxUp(() => {
  console.log("created static");
  const audioContext = new AudioContext();
  return audioContext;
}, "staticAudioContext"); // we use to decode data
export const liveAudioContext = boxUp(() => {
  console.log("created live");
  const audioContext = new AudioContext();
  return audioContext;
}, "liveAudioContext"); // we play from this one
(window as any).liveAudioContext = liveAudioContext;

export const PX_PER_SEC = 10;
export const PX_OVER_SEC = PX_PER_SEC;
export const SECS_PER_PX = 1 / PX_PER_SEC;
export const SECS_OVER_PX = SECS_PER_PX;

export const SECS_IN_MIN = 60;

export const FIREBASE_ENABLED = false;

export const CANVAS_HEIGHT = 46; // 256 / 6 + 4
export const CANVAS_WIDTH = TRACK_HEADER_WIDTH + 11; //512 / 3; // 11px from scrollbar + padding of the timeline view

export const TIME_SIGNATURE = [4, 4] as const;
export const SECS_IN_MINUTE = 60;
export const DEFAULT_TEMPO = 75;

export const TOTAL_VERTICAL_NOTES = 128; // number of midi notes in piano roll

export const LIBRARY_SEARCH_INPUT_ID = "library-search";

import PIANO_ROLL_PLUGIN_URL from "./midi/pianoroll/index?url";

// TODO: assuming constant 4/4
// 1 pulse
// 6 puleses = 1 beat
// 4 beats = 1 bar
export const PULSES_PER_BAR = 6 * 4;

// WAM

export const SYNTH_101_URL = "https://mainline.i3s.unice.fr/wam2/packages/synth101/dist/index.js";
// export const OBXD_URL = "https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js";
export const SOUND_FONT_URL = "https://www.webaudiomodules.com/community/plugins/burns-audio/soundfont/index.js";

export const WAM_PLUGINS: { url: string; kind: "-m" | "-a" | "m-a" | "a-a" }[] = [
  { url: "https://mainline.i3s.unice.fr/wam2/packages/StonePhaserStereo/index.js", kind: "a-a" },
  { url: "https://mainline.i3s.unice.fr/wam2/packages/BigMuff/index.js", kind: "a-a" },
  // { url: "https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js", kind: "m-a" },
  { url: "https://mainline.i3s.unice.fr/wam2/packages/synth101/dist/index.js", kind: "m-a" },
  { url: SOUND_FONT_URL, kind: "m-a" },
  { url: "https://www.webaudiomodules.com/community/plugins/burns-audio/modal/index.js", kind: "m-a" },
  { url: "https://www.webaudiomodules.com/community/plugins/burns-audio/drumsampler/index.js", kind: "m-a" },
  { url: PIANO_ROLL_PLUGIN_URL, kind: "-m" },
];

export { PIANO_ROLL_PLUGIN_URL };
