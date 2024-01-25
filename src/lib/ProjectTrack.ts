import { SPrimitive, SSchemaArray } from "structured-state";
import { AbstractClip, Seconds, addClip, deleteTime, pushClip, removeClip, splitClip } from "./AbstractClip";
import { AudioClip } from "./AudioClip";
import { AudioContextInfo } from "./initAudioContext";
import type { AudioProject } from "./project/AudioProject";
import { ProjectTrackDSP } from "./ProjectTrackDSP";

// TODO: move these things out of the abstract class
export interface StandardTrack<T extends AbstractClip<any>> {
  readonly dsp: ProjectTrackDSP<T>;
  readonly name: SPrimitive<string>;
  readonly height: SPrimitive<number>;

  prepareForPlayback(context: AudioContext): void;
  prepareForBounce(context: OfflineAudioContext, offlineContextInfo: AudioContextInfo): Promise<AudioNode>;

  // NOTE: needs to be called right after .prepareForPlayback
  startPlayback(tempo: number, context: BaseAudioContext, offset?: number): void;
  stopPlayback(context: BaseAudioContext): void;
}

export abstract class ProjectTrack<T extends AbstractClip<any>> {
  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  public abstract readonly clips: SSchemaArray<any>; // TODO: <T>, not there cause midi clip isn't ready

  //////////// CLIPS ////////////

  addClip(project: AudioProject, newClip: T): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }
    addClip(newClip, this.clips);
  }

  // Adds a clip right after the last clip
  pushClip(project: AudioProject, newClip: T): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }
    pushClip(newClip, this.clips);
  }

  // // TODO: UNUSED
  // moveClip(clip: T): void {
  //   moveClip(clip, this.clips);
  //   // this.clips._setRaw(clips as any);
  // }

  removeClip(project: AudioProject, clip: T): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }
    removeClip(clip, this.clips);
  }

  deleteTime(project: AudioProject, start: number, end: number): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    console.log("AT deleteTime");
    const notifyClips = deleteTime<AudioClip, Seconds>(start, end, this.clips);
    notifyClips.forEach((clip) => {
      console.log("clip", clip);
      clip._notifyChange();
    });
  }

  splitClip(project: AudioProject, clip: T, offset: number): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    splitClip(clip, offset, this.clips);
  }

  /////////////// DEBUGGING /////////////////

  toString() {
    return this.clips
      ._getRaw()
      .map((c) => c.toString())
      .join("\n");
  }
}
