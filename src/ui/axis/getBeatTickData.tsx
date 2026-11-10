import { AudioProject } from "../../lib/project/AudioProject";
import { standardViewport } from "../../lib/viewport/StandardViewport";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";

export const MIN_TICK_DISTANCE = 60; // 60px

/**
 * returns an array of ticks (beat number, time of beat in seconds)
 * for a viewport that starts at startS px and ends at endS. Zoomed in, beat numbers can be
 * fractional (sub-beat grid lines).
 */
export function getBeatTickData(
  project: AudioProject,
  startS: number,
  endS: number,
): (readonly [beatNum: number, time: number])[] {
  // the length of a quarter note, in seconds
  const oneBeatLen = project.viewport.pulsesToSecs(PPQN);
  const oneBeatSizePx = project.viewport.pulsesToPx(PPQN, "len");

  // 1 = show every beat. 2 = show every other beat. 1/4 = show every 16th note. etc.
  const tickBeats = timelineGridBeats(oneBeatSizePx);
  const tickLenS = tickBeats * oneBeatLen;

  // Find the first tick after `startS`.
  // NOTE: technically, Math.ceil. But we render one tick before the viewport start
  // so text doesn't just "disappear" when the "beat line" scrolls out of view
  const firstTick = Math.floor(startS / tickLenS);

  const ticksToShow = [];
  // multiply instead of accumulating, so fractional beats don't drift
  for (let k = firstTick; k * tickLenS < endS; k++) {
    ticksToShow.push([k * tickBeats, k * tickLenS] as const);
  }

  return ticksToShow;
}

/**
 * returns an array of seconds at which to show a tick
 * for a viewport that starts at startS px and ends at endS
 */
export function getTimeTickData(project: AudioProject, startS: number, endS: number) {
  const MIN_DIST_BEETWEEN_TICKS_SEC = standardViewport.pxToSecs(project.viewport, MIN_TICK_DISTANCE, "len");
  const STEP_SECS = getTimeStepForRes(MIN_DIST_BEETWEEN_TICKS_SEC);

  const backtrack = startS % STEP_SECS;
  // (startS - backtrack) gives us a time before the start of our viewport.
  // we do want to render this one though, so that it doesn't just disappear as soon
  // as part of it is out of view, and it does appear like we're scrolling it gradually
  const startingTickSecs = startS - backtrack;

  const ticksToShow: Array<number> = [];
  for (let s = startingTickSecs; s < endS; s += STEP_SECS) {
    ticksToShow.push(s);
  }
  return ticksToShow;
}

/**
 * Beats between the timeline's grid lines (ruler ticks, snapping) at a zoom where one beat is
 * `oneBeatSizePx` wide: down to a 16th note zoomed in, up to 64 beats zoomed out. Sub-beat
 * steps stay on whole pulses (PPQN 24: 12 and 6).
 */
export function timelineGridBeats(oneBeatSizePx: number): number {
  if (oneBeatSizePx >= 160) {
    return 1 / 4;
  }
  if (oneBeatSizePx >= 80) {
    return 1 / 2;
  }
  return getBeatScaleFactorForOneBeatSize(oneBeatSizePx);
}

export function getBeatScaleFactorForOneBeatSize(oneBeatSizePx: number): number {
  switch (true) {
    case oneBeatSizePx < 60 / 16:
      return 16 * 4; // ie, only show every 16 * 4 beats
    case oneBeatSizePx < 60 / 8:
      return 16;
    case oneBeatSizePx < 60 / 4:
      return 4;
    case oneBeatSizePx < 40:
      return 2;
    default:
      return 1; // ie, show every beat
  }
}

export function getTimeStepForRes(dist: number): number {
  switch (true) {
    case dist < 1:
      return 1;
    case dist < 3:
      return 3;
    case dist < 5:
      return 5;
    case dist < 10:
      return 10;
    case dist < 30:
      return 30;
    default:
      return 60;
  }
}
