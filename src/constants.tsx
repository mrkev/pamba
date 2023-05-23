export const sampleSize = 1024;
export const staticAudioContext = new AudioContext(); // we use to decode data
export const liveAudioContext = new AudioContext(); // we play from this one
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
