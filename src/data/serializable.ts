import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import AudioClip from "../lib/AudioClip";
import { AudioProject } from "../lib/AudioProject";
import { AudioTrack } from "../lib/AudioTrack";
import { exhaustive } from "../utils/exhaustive";
import { liveAudioContext } from "../constants";
import { EffectID } from "../dsp/FAUST_EFFECTS";
import { PambaWamNode } from "../wam/PambaWamNode";

export type SAudioClip = {
  kind: "AudioClip";
  name: string;
  bufferURL: string;
};

export type SAudioTrack = {
  kind: "AudioTrack";
  clips: Array<SAudioClip>;
  effects: Array<SFaustAudioEffect | SPambaWamNode>;
  height: number;
  name: string;
};

export type SAudioProject = {
  kind: "AudioProject";
  projectId: string;
  tracks: Array<SAudioTrack>;
};

export type SFaustAudioEffect = {
  kind: "FaustAudioEffect";
  effectId: EffectID;
  params: Array<[address: string, value: number]>;
};

export type SPambaWamNode = {
  kind: "PambaWamNode";
};

export async function serializable(
  obj: FaustAudioEffect | PambaWamNode
): Promise<SFaustAudioEffect | SFaustAudioEffect>;
export async function serializable(obj: AudioProject): Promise<SAudioProject>;
export async function serializable(obj: AudioTrack): Promise<SAudioTrack>;
export async function serializable(obj: AudioClip): Promise<SAudioClip>;
export async function serializable(
  obj: AudioClip | AudioTrack | AudioProject | FaustAudioEffect | PambaWamNode
): Promise<SAudioClip | SAudioTrack | SAudioProject | SFaustAudioEffect> {
  if (obj instanceof AudioClip) {
    const { name, bufferURL } = obj;
    return { kind: "AudioClip", name, bufferURL };
  }

  if (obj instanceof AudioTrack) {
    return {
      kind: "AudioTrack",
      clips: await Promise.all(obj.clips._getRaw().map((clip) => serializable(clip))),
      effects: await Promise.all(obj.effects._getRaw().map((effect) => serializable(effect))),
      height: obj.height.get(),
      name: obj.name.get(),
    };
  }

  if (obj instanceof AudioProject) {
    return {
      kind: "AudioProject",
      projectId: obj.projectId,
      tracks: await Promise.all(obj.allTracks._getRaw().map((track) => serializable(track))),
    };
  }

  if (obj instanceof FaustAudioEffect) {
    return {
      kind: "FaustAudioEffect",
      effectId: obj.effectId,
      params: await obj.getAllParamValues(),
    };
  }

  if (obj instanceof PambaWamNode) {
    throw new Error("PambaWamNode: NOT SERIALIZABLE");
  }

  exhaustive(obj);
}

// export async function construct(rep: SPambaWamNode): Promise<PambaWamNode>;
export async function construct(rep: SFaustAudioEffect | SPambaWamNode): Promise<FaustAudioEffect | PambaWamNode>;
export async function construct(rep: SAudioProject): Promise<AudioProject>;
export async function construct(rep: SAudioClip): Promise<AudioClip>;
export async function construct(rep: SAudioTrack): Promise<AudioTrack>;
export async function construct(
  rep: SAudioClip | SAudioTrack | SAudioProject | SFaustAudioEffect | SPambaWamNode
): Promise<AudioClip | AudioTrack | AudioProject | FaustAudioEffect | PambaWamNode> {
  switch (rep.kind) {
    case "AudioClip": {
      const { bufferURL, name } = rep;
      return AudioClip.fromURL(bufferURL, name);
    }
    case "AudioTrack": {
      const { name, clips: sClips, effects: sEffects, height } = rep;
      const clips = await Promise.all(sClips.map((clip) => construct(clip)));
      const effects = await Promise.all(sEffects.map((effect) => construct(effect)));
      return AudioTrack.create({ name, clips, effects, height });
    }
    case "AudioProject": {
      const tracks = await Promise.all(rep.tracks.map((clip) => construct(clip)));
      const projectId = rep.projectId;
      return new AudioProject(tracks, projectId);
    }
    case "FaustAudioEffect": {
      const effect = await FaustAudioEffect.create(liveAudioContext, rep.effectId, rep.params);
      if (effect == null) {
        throw new Error(`Could not initialize effect ${rep.effectId}`);
      }
      return effect;
    }
    case "PambaWamNode": {
      throw new Error("NOT PARSABLE: PambaWamNode");
    }

    default:
      exhaustive(rep);
  }
}
