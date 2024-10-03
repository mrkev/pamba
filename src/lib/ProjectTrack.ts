import { SPrimitive, SSchemaArray } from "structured-state";
import { MidiTrack } from "../midi/MidiTrack";
import { AbstractClip, addClip, deleteTime, pushClip, removeClip, splitClip } from "./AbstractClip";
import { AudioTrack } from "./AudioTrack";
import { ProjectTrackDSP } from "./ProjectTrackDSP";
import { AudioContextInfo } from "./initAudioContext";
import type { AudioProject } from "./project/AudioProject";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";

// TODO: move these things out of the abstract class
export interface StandardTrack<T extends AbstractClip<any>> {
  readonly dsp: ProjectTrackDSP<T>;
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

export class ProjectTrack {
  //////////// CLIPS ////////////

  static addClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, newClip: T): void {
    if (!project.canEditTrack(project, track)) {
      return;
    }
    addClip(newClip, track.clips);
  }

  // Adds a clip right after the last clip
  static pushClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, newClip: T): void {
    if (!project.canEditTrack(project, track)) {
      return;
    }
    pushClip(newClip, track.clips);
  }

  // TODO: UNUSED
  static moveClip<T extends AbstractClip<any>>(
    project: AudioProject,
    clip: T,
    srcTrack: StandardTrack<T>,
    destTrack: StandardTrack<T>,
  ): void {
    // In this order to maintain clip array invariants
    ProjectTrack.removeClip(project, srcTrack, clip);
    ProjectTrack.deleteTime(project, destTrack, clip._timelineStartU, clip._timelineEndU);
    ProjectTrack.addClip(project, destTrack, clip);
    // moveClip(clip, this.clips);
    // this.clips._setRaw(clips as any);
  }

  static removeClip<T extends AbstractClip<any>>(project: AudioProject, track: StandardTrack<T>, clip: T): void {
    if (!project.canEditTrack(project, track)) {
      return;
    }
    removeClip(clip, track.clips);
  }

  static deleteTime<T extends AbstractClip<any>>(
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
  }

  static splitClip<T extends AbstractClip<any>>(
    project: AudioProject,
    track: StandardTrack<T>,
    clip: T,
    offset: number,
  ): void {
    if (!project.canEditTrack(project, track)) {
      return;
    }

    splitClip(clip, offset, track.clips);
  }

  /////////////// DEBUGGING /////////////////

  static toString<T extends AbstractClip<any>>(track: StandardTrack<T> | AudioTrack | MidiTrack) {
    return track.clips
      ._getRaw()
      .map((c) => c.toString())
      .join("\n");
  }
}
