import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import AudioClip from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { AudioTrack } from "../lib/AudioTrack";
import { exhaustive } from "../utils/exhaustive";
import { liveAudioContext } from "../constants";
import { EffectID } from "../dsp/FAUST_EFFECTS";
import { PambaWamNode } from "../wam/PambaWamNode";
import { appEnvironment } from "../lib/AppEnvironment";
import nullthrows from "../utils/nullthrows";
import { MidiTrack } from "../midi/MidiTrack";
import { MidiInstrument } from "../midi/MidiInstrument";
import { MidiClip } from "../midi/MidiClip";
import { Note } from "../midi/SharedMidiTypes";

export type SAudioClip = {
  kind: "AudioClip";
  name: string;
  bufferURL: string;
};

export type SMidiClip = {
  kind: "MidiClip";
  name: string;
  lengthPulses: number;
  notes: readonly Note[];
};

export type SAudioTrack = {
  kind: "AudioTrack";
  clips: Array<SAudioClip>;
  effects: Array<SFaustAudioEffect | SPambaWamNode>;
  height: number;
  name: string;
};

export type SMidiTrack = {
  kind: "MidiTrack";
  clips: Array<SMidiClip>;
  name: string;
};

export type SAudioProject = {
  kind: "AudioProject";
  projectId: string;
  tracks: Array<SAudioTrack | SMidiTrack>;
};

export type SFaustAudioEffect = {
  kind: "FaustAudioEffect";
  effectId: EffectID;
  params: Array<[address: string, value: number]>;
};

export type SPambaWamNode = {
  kind: "PambaWamNode";
  // TODO: use effectId instead
  pluginURL: string;
  state: unknown;
};

export async function serializable(
  obj: FaustAudioEffect | PambaWamNode,
): Promise<SFaustAudioEffect | SFaustAudioEffect>;
export async function serializable(obj: AudioProject): Promise<SAudioProject>;
export async function serializable(obj: AudioTrack | MidiTrack): Promise<SAudioTrack | SMidiTrack>;
export async function serializable(obj: AudioClip): Promise<SAudioClip>;
export async function serializable(obj: MidiClip): Promise<SMidiClip>;
export async function serializable(
  obj: AudioClip | AudioTrack | MidiClip | MidiTrack | AudioProject | FaustAudioEffect | PambaWamNode,
): Promise<SAudioClip | SAudioTrack | SMidiClip | SMidiTrack | SAudioProject | SFaustAudioEffect | SPambaWamNode> {
  if (obj instanceof AudioClip) {
    const { name, bufferURL } = obj;
    return { kind: "AudioClip", name, bufferURL };
  }

  if (obj instanceof MidiClip) {
    const { name, lenPulses, notes } = obj;
    return { kind: "MidiClip", name, lengthPulses: lenPulses, notes: notes._getRaw() };
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

  if (obj instanceof MidiTrack) {
    return {
      kind: "MidiTrack",
      name: obj.name.get(),
      clips: await Promise.all(obj.clips.map((clip) => serializable(clip))),
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
    return {
      kind: "PambaWamNode",
      pluginURL: obj.url,
      state: await obj.getState(),
    };
  }

  exhaustive(obj);
}

// export async function construct(rep: SPambaWamNode): Promise<PambaWamNode>;
export async function construct(rep: SFaustAudioEffect | SPambaWamNode): Promise<FaustAudioEffect | PambaWamNode>;
export async function construct(rep: SAudioProject): Promise<AudioProject>;
export async function construct(rep: SAudioClip): Promise<AudioClip>;
export async function construct(rep: SMidiClip): Promise<MidiClip>;
export async function construct(rep: SAudioTrack | SMidiTrack): Promise<AudioTrack | MidiTrack>;
export async function construct(
  rep: SAudioClip | SMidiClip | SAudioTrack | SMidiTrack | SAudioProject | SFaustAudioEffect | SPambaWamNode,
): Promise<AudioClip | MidiClip | AudioTrack | MidiTrack | AudioProject | FaustAudioEffect | PambaWamNode> {
  switch (rep.kind) {
    case "AudioClip": {
      const { bufferURL, name } = rep;
      return AudioClip.fromURL(bufferURL, name);
    }
    case "MidiClip": {
      const { name, lengthPulses, notes } = rep;
      return new MidiClip(name, lengthPulses, notes);
    }
    case "AudioTrack": {
      const { name, clips: sClips, effects: sEffects, height } = rep;
      const clips = await Promise.all(sClips.map((clip) => construct(clip)));
      const effects = await Promise.all(sEffects.map((effect) => construct(effect)));
      return AudioTrack.create({ name, clips, effects, height });
    }

    case "MidiTrack": {
      const { clips: sClips, name } = rep;
      const clips = await Promise.all(sClips.map((clip) => construct(clip)));
      const obxd = await MidiInstrument.createFromUrl("https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js");
      return MidiTrack.createWithInstrument(obxd, name, clips);
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
      const { pluginURL, state } = rep;
      const [wamHostGroupId] = nullthrows(appEnvironment.wamHostGroup.get(), "wam host not initialized yet!");
      const pambaWamNode = nullthrows(
        await PambaWamNode.fromURL(pluginURL, wamHostGroupId, liveAudioContext),
        "could not create PambaWamNode",
      );
      await pambaWamNode.setState(state);
      return pambaWamNode;
    }

    default:
      exhaustive(rep);
  }
}
