import { SPrimitive, SSchemaArray } from "structured-state";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { MidiTrack } from "../midi/MidiTrack";
import { AbstractClip, addClip, deleteTime, pushClip, removeClip, splitClip } from "./AbstractClip";
import { AudioTrack } from "./AudioTrack";
import { ProjectTrackDSP } from "./ProjectTrackDSP";
import { AudioContextInfo } from "./initAudioContext";
import { AudioProject } from "./project/AudioProject";

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

  didAddClip(clip: T): void;
}

export const standardTrack = {
  //////////// CLIPS ////////////

  addClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, newClip: T): void {
    if (!project.canEditTrack(project, track)) {
      return;
    }

    if (track.clips.indexOf(newClip) > -1) {
      return;
    }
    addClip(newClip, track.clips);
    track.didAddClip(newClip);
  },

  // Adds a clip right after the last clip
  pushClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, newClip: T): void {
    if (!project.canEditTrack(project, track)) {
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
    // In this order to maintain clip array invariants
    standardTrack.removeClip(project, srcTrack, clip);
    standardTrack.deleteTime(project, destTrack, clip._timelineStartU, clip._timelineEndU);
    standardTrack.addClip(project, destTrack, clip);
    // moveClip(clip, this.clips);
    // this.clips._setRaw(clips as any);
  },

  removeClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, clip: T): void {
    if (!project.canEditTrack(project, track)) {
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
    if (!project.canEditTrack(project, track)) {
      return;
    }

    console.log("AT deleteTime");
    const notifyClips = deleteTime(start, end, track.clips);
    notifyClips.forEach((clip) => {
      console.log("clip", clip);
      clip.notifyChange();
    });
  },

  splitClip<T extends AbstractClip<any>>(
    project: AudioProject,
    track: StandardTrack<T>,
    clip: T,
    offset: number,
  ): void {
    if (!project.canEditTrack(project, track)) {
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
