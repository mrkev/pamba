import { timelineGridBeats } from "../../ui/axis/getBeatTickData";
import { returnClosest, stepNumber } from "../../utils/math";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { AudioProject } from "../project/AudioProject";
import { time, TimeUnit } from "../project/TimelineT";

// Timeline snapping. Everything dragged or clicked on the timeline (cursor, time selections,
// clip moves and resizes, loop markers) snaps through snapToTimelineGrid, to the beat lines
// the ruler shows at the current zoom. The piano roll has its own grid (snapPulses, below).

/** Whether a timeline gesture snaps: the project's snap toggle, inverted while holding meta. */
export function shouldSnap(project: AudioProject, e: { metaKey: boolean }): boolean {
  const snap = project.snapToGrid.get();
  return e.metaKey ? !snap : snap;
}

/**
 * The timeline's grid size in pulses: the beat lines the ruler shows at the current zoom,
 * from a 16th note zoomed all the way in to 64 beats zoomed all the way out.
 */
export function timelineGridPulses(project: AudioProject): number {
  const oneBeatSizePx = project.viewport.pulsesToPx(PPQN, "len");
  return timelineGridBeats(oneBeatSizePx) * PPQN;
}

/**
 * Snaps the timeline time `t` (in unit `u`) to the closest grid line. When dragging something
 * that started at `original` (same unit), the grid shifted to pass through `original` counts
 * too, so an off-grid clip can move by whole grid steps and keep its offset; whichever line is
 * closest wins. Pulses come back whole.
 */
export function snapToTimelineGrid(project: AudioProject, t: number, u: TimeUnit, original?: number): number {
  const step = time(timelineGridPulses(project), "pulses").asUnit(u, project);
  const onGrid = stepNumber(t, step);
  const result = original == null ? onGrid : returnClosest(t, onGrid, stepNumber(t, step, original));
  return u === "pulses" ? Math.round(result) : result;
}

/**
 * Where a clicked or dragged timeline time `t` (in unit `u`) lands: snapped to the grid if
 * `snap` (usually shouldSnap; see snapToTimelineGrid for `original`), otherwise where it is,
 * on whole pulses.
 */
export function timelinePos(project: AudioProject, snap: boolean, t: number, u: TimeUnit, original?: number): number {
  if (snap) {
    return snapToTimelineGrid(project, t, u, original);
  }
  return u === "pulses" ? Math.round(t) : t;
}

/**
 * Snaps an absolute pulse value to the piano-roll grid, honoring the MIDI editor's snap
 * toggle (`project.midi.snap`) and the meta-key bypass convention (holding meta inverts it).
 * Returns `pulses` unchanged when snapping is off. `"round"` snaps to the nearest grid line (for
 * drags); `"floor"` snaps to the start of the cell containing `pulses` (for click-to-create, so the
 * note lands in the cell that was clicked).
 */
export function snapPulses(
  project: AudioProject,
  e: MouseEvent,
  pulses: number,
  mode: "round" | "floor" = "round",
): number {
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
  return (mode === "floor" ? Math.floor : Math.round)(pulses / division) * division;
}
