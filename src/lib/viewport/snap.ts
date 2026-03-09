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
