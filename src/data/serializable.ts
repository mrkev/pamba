import AudioClip from "../lib/AudioClip";
import { AudioProject } from "../lib/AudioProject";
import { AudioTrack } from "../lib/AudioTrack";
import { exhaustive } from "../lib/exhaustive";

export type SAudioClip = {
  kind: "AudioClip";
  name: string;
  bufferURL: string;
};

export type SAudioTrack = {
  kind: "AudioTrack";
  clips: Array<SAudioClip>;
  effects: Array<any>;
  name: string;
};

export type SAudioProject = {
  kind: "AudioProject";
  tracks: Array<SAudioTrack>;
};

type Constructable = AudioClip | AudioTrack | AudioProject;
type Serializable = SAudioClip | SAudioTrack | SAudioProject;

export function serializable(obj: AudioProject): SAudioProject;
export function serializable(obj: AudioTrack): SAudioTrack;
export function serializable(obj: AudioClip): SAudioClip;
export function serializable(obj: Constructable): Serializable {
  if (obj instanceof AudioClip) {
    const { name, bufferURL } = obj;
    return { kind: "AudioClip", name, bufferURL };
  }

  if (obj instanceof AudioTrack) {
    return {
      kind: "AudioTrack",
      clips: obj.clips._getRaw().map((clip) => serializable(clip)),
      effects: [], // todo
      name: obj.name.get(),
    };
  }

  if (obj instanceof AudioProject) {
    return {
      kind: "AudioProject",
      tracks: obj.allTracks._getRaw().map((track) => serializable(track)),
    };
  }
  exhaustive(obj);
}

export async function construct(rep: SAudioProject): Promise<AudioProject>;
export async function construct(rep: SAudioClip): Promise<AudioClip>;
export async function construct(rep: SAudioTrack): Promise<AudioTrack>;
export async function construct(rep: Serializable): Promise<Constructable> {
  switch (rep.kind) {
    case "AudioClip": {
      const { bufferURL, name } = rep;
      return AudioClip.fromURL(bufferURL, name);
    }
    case "AudioTrack": {
      const { name, clips: sClips, effects } = rep;
      const clips = await Promise.all(sClips.map((clip) => construct(clip)));
      return AudioTrack.create({ name, clips, effects });
    }
    case "AudioProject": {
      const tracks = await Promise.all(rep.tracks.map((clip) => construct(clip)));
      return new AudioProject(tracks);
    }
    default:
      exhaustive(rep);
  }
}
