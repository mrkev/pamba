import { SPrimitive, SSchemaArray } from "structured-state";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { MidiTrack } from "../midi/MidiTrack";
import { clamp } from "../utils/math";
import { AbstractClip, addClip, deleteTime, pushClip, removeClip, splitClip } from "./AbstractClip";
import { AudioClip } from "./AudioClip";
import { AudioTrack } from "./AudioTrack";
import { ProjectTrackDSP } from "./ProjectTrackDSP";
import { AudioContextInfo } from "./initAudioContext";
import { audioProject, AudioProject } from "./project/AudioProject";
import { time, TimeUnit } from "./project/TimelineT";

// TODO: move these things out of the abstract class
export interface StandardTrack<T extends AbstractClip<any>> {
  readonly dsp: ProjectTrackDSP;
  readonly name: SPrimitive<string>;
  readonly height: SPrimitive<number>;
  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  readonly clips: SSchemaArray<T>;

  prepareForPlayback(project: AudioProject, context: AudioContext, startingAt: number): void;
  prepareForBounce(context: OfflineAudioContext, offlineContextInfo: AudioContextInfo): Promise<TrackedAudioNode>;

  // NOTE: needs to be called right after .prepareForPlayback
  startPlayback(tempo: number, context: BaseAudioContext, offset?: number): void;
  stopPlayback(context: BaseAudioContext): void;
}

/** In the clip's own storage unit. Midi clips can grow indefinitely; audio clips can't play past their buffer. */
function maxClipLength(clip: AbstractClip<any>): number {
  if (!(clip instanceof AudioClip)) {
    return Infinity;
  }
  return clip.getBufferLength() - clip.bufferOffset.ensureSecs();
}

export const standardTrack = {
  //////////// CLIPS ////////////

  addClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, newClip: T): void {
    if (!audioProject.canEditTrack(project, track)) {
      return;
    }

    if (track.clips.indexOf(newClip) > -1) {
      return;
    }
    addClip(newClip, track.clips);
  },

  // Adds a clip right after the last clip
  pushClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, newClip: T): void {
    if (!audioProject.canEditTrack(project, track)) {
      return;
    }
    pushClip(newClip, track.clips);
  },

  moveClip<T extends AbstractClip<any>>(
    project: AudioProject,
    clip: T,
    srcTrack: StandardTrack<T>,
    destTrack: StandardTrack<T>,
  ): void {
    // Guard both tracks up front so the move is all-or-nothing. Otherwise a
    // lock on one of the two tracks would let a subset of the steps run,
    // either losing the clip or aliasing it into both tracks' arrays.
    if (!audioProject.canEditTrack(project, srcTrack) || !audioProject.canEditTrack(project, destTrack)) {
      return;
    }

    // In this order to maintain clip array invariants. addClip clears the
    // destination range itself, so no separate deleteTime is needed here.
    standardTrack.removeClip(project, srcTrack, clip);
    standardTrack.addClip(project, destTrack, clip);
  },

  removeClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, clip: T): void {
    if (!audioProject.canEditTrack(project, track)) {
      return;
    }
    removeClip(clip, track.clips);
  },

  deleteTime<T extends AbstractClip<any>>(
    project: AudioProject,
    track: StandardTrack<T>,
    start: number,
    end: number,
  ): void {
    if (!audioProject.canEditTrack(project, track)) {
      return;
    }

    const notifyClips = deleteTime(start, end, track.clips);
    notifyClips.forEach((clip) => {
      clip.notifyChange();
    });
  },

  /**
   * Sets a clip's length, given in any time unit. Growing a clip deletes the time
   * it expands into, so it doesn't overlap whatever follows it on the track.
   */
  setClipLength<T extends AbstractClip<any>>(
    project: AudioProject,
    track: StandardTrack<T>,
    clip: T,
    t: number,
    u: TimeUnit,
  ): void {
    if (!audioProject.canEditTrack(project, track)) {
      return;
    }

    if (track.clips.indexOf(clip) < 0) {
      throw new Error("setClipLength: clip not in track");
    }

    // Work in the clip's own storage unit (seconds for audio, pulses for midi),
    // which is also the unit deleteTime expects.
    const unit = clip.timelineLength.unit;
    const prevLength = clip.timelineLength.ensure(unit);
    const newLength = clamp(0, time(t, u).asUnit(unit, project), maxClipLength(clip));

    if (newLength <= prevLength) {
      // Shrinking can't overlap anything, so nothing else to do.
      clip.timelineLength.set(newLength, unit);
      return;
    }

    // Clear the area we're growing into, then take it.
    const clipStart = clip.timelineStart.ensure(unit);
    standardTrack.deleteTime(project, track, clipStart + prevLength, clipStart + newLength);
    clip.timelineLength.set(newLength, unit);
  },

  splitClip<T extends AbstractClip<any>>(
    project: AudioProject,
    track: StandardTrack<T>,
    clip: T,
    offset: number,
  ): void {
    if (!audioProject.canEditTrack(project, track)) {
      return;
    }

    splitClip(clip, offset, track.clips);
  },

  /////////////// DEBUGGING /////////////////

  toString<T extends AbstractClip<any>>(track: StandardTrack<T> | AudioTrack | MidiTrack) {
    return track.clips
      ._getRaw()
      .map((c) => c.toString())
      .join("\n");
  },
};
