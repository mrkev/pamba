import type { AbstractClip, Pulses, Seconds } from "../AbstractClip";
import type { AudioProject } from "./AudioProject";
import { timelineT, TimelineT } from "./TimelineT";

// TODO: can we assume clips are sorted?
export function clipsLimits<Clip extends AbstractClip<U>, U extends Pulses | Seconds>(
  project: AudioProject,
  clips: Clip[],
): [min: TimelineT, max: TimelineT] | null {
  if (clips.length < 1) {
    return null;
  }

  let min = clips[0].timelineStart;
  let max = clips[0].timelineStart.clone().add(clips[0].timelineLength, project);
  for (const clip of clips) {
    min = timelineT.compare(project, min, "<", clip.timelineStart) ? min : clip.timelineStart;
    const clipEnd = clip.timelineStart.clone().add(clip.timelineLength, project);
    max = timelineT.compare(project, max, ">", clipEnd) ? max : clipEnd;
  }

  return [min, max];
}
