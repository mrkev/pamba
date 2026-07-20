import { SECS_IN_MIN } from "../../constants";
import { stepNumber } from "../../utils/math";
import { AudioProject } from "../project/AudioProject";

export function shouldSnap(project: AudioProject, e: MouseEvent) {
  let snap = project.snapToGrid.get();
  if (e.metaKey) {
    snap = !snap;
  }
  return snap;
}

export function snapped(project: AudioProject, e: MouseEvent, s: number) {
  let snap = project.snapToGrid.get();
  if (e.metaKey) {
    snap = !snap;
  }

  if (!snap) {
    return s;
  } else {
    return snapToTempo(project, s);
  }
}

export function snapToTempo(project: AudioProject, s: number) {
  const tempo = project.tempo.get();
  const oneBeatLen = SECS_IN_MIN / tempo;
  const snappedTime = stepNumber(s, oneBeatLen);
  return snappedTime;
}

/**
 * Snaps an absolute pulse value to the piano-roll grid, honoring the MIDI editor's snap
 * toggle (`project.midi.snap`) and the meta-key bypass convention (holding meta inverts it).
 * Returns `pulses` unchanged when snapping is off.
 */
export function snapPulses(project: AudioProject, e: MouseEvent, pulses: number): number {
  let snap = project.midi.snap.get();
  if (e.metaKey) {
    snap = !snap;
  }
  if (!snap) {
    return pulses;
  }
  const division = project.midi.snapDivision.get();
  if (division <= 0) {
    return pulses;
  }
  return Math.round(pulses / division) * division;
}
