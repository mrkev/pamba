import { SECS_IN_MIN } from "../../constants";
import { AudioProject } from "../../lib/project/AudioProject";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";

export const MIN_TICK_DISTANCE = 60; // 60px

/**
 * returns an array of ticks (beat number, time of beat in seconds)
 * for a viewport that starts at startS px and ends at endS
 */
export function getBeatTickData(
  project: AudioProject,
  startS: number,
  endS: number,
): (readonly [beatNum: number, time: number])[] {
  // the length of a quarter note, in seconds
  const oneBeatLen = project.viewport.pulsesToSecs(PPQN);
  const oneBeatSizePx = project.viewport.pulsesToPx(PPQN, "len");

  // 1 = show every beat. 2 = show every other beat. etc.
  const tickBeatFactor = getBeatScaleFactorForOneBeatSize(oneBeatSizePx);
  const tickBeatLengthS = tickBeatFactor * oneBeatLen;

  // Find the first beat after `startS` that fits our tick beat length.
  // NOTE: technically, Math.ceil. But we render one beat before the viewport start
  // so text doesn't just "disappear" when the "beat line" scrolls out of view
  const firstBeatNum = Math.floor(startS / tickBeatLengthS);

  const ticksToShow = [];
  for (
    let i = firstBeatNum * tickBeatFactor, //
      s = tickBeatLengthS * firstBeatNum;
    //
    s < endS;
    i += tickBeatFactor, s += tickBeatLengthS
  ) {
    ticksToShow.push([i, s] as const);
  }

  return ticksToShow;
}

/**
 * returns an array of seconds at which to show a tick
 * for a viewport that starts at startS px and ends at endS
 */
export function getTimeTickData(project: AudioProject, startS: number, endS: number) {
  const MIN_DIST_BEETWEEN_TICKS_SEC = project.viewport.pxToSecs(MIN_TICK_DISTANCE, "len");
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

export function getOneTickLen(project: AudioProject, tempo: number) {
  const oneBeatLen = SECS_IN_MIN / tempo;
  const oneBeatSizePx = project.viewport.secsToPx(oneBeatLen, "len");
  const tickBeatFactor = getBeatScaleFactorForOneBeatSize(oneBeatSizePx);
  const tickBeatLength = tickBeatFactor * oneBeatLen;
  return tickBeatLength;
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
