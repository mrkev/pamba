import { SPrimitive, SSchemaArray } from "structured-state";
import { AbstractClip, addClip, deleteTime, pushClip, removeClip, splitClip } from "./AbstractClip";
import { ProjectTrackDSP } from "./ProjectTrackDSP";
import { AudioContextInfo } from "./initAudioContext";
import type { AudioProject } from "./project/AudioProject";
import { AudioTrack } from "./AudioTrack";
import { MidiTrack } from "../midi/MidiTrack";

// TODO: move these things out of the abstract class
export interface StandardTrack<T extends AbstractClip<any>> {
  readonly dsp: ProjectTrackDSP<T>;
  readonly name: SPrimitive<string>;
  readonly height: SPrimitive<number>;
  readonly clips: SSchemaArray<T>;

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
  public abstract readonly clips: SSchemaArray<T>;

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

  // // TODO: UNUSED
  // moveClip(clip: T): void {
  //   moveClip(clip, this.clips);
  //   // this.clips._setRaw(clips as any);
  // }

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
      clip._notifyChange();
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
