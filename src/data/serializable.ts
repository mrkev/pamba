import { WamParameterDataMap } from "@webaudiomodules/api";
import { arrayOf, boolean, number, set, SPrimitive, string } from "structured-state";
import { liveAudioContext } from "../constants";
import { FaustEffectID } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject, PointerTool, SecondaryTool } from "../lib/project/AudioProject";
import { time, TimeUnit } from "../lib/project/TimelineT";
import { SMidiViewport } from "../lib/viewport/MidiViewport";
import { MidiClip } from "../midi/MidiClip";
import { MidiInstrument } from "../midi/MidiInstrument";
import { MidiTrack } from "../midi/MidiTrack";
import { Note } from "../midi/SharedMidiTypes";
import { exhaustive } from "../utils/exhaustive";
import { nullthrows } from "../utils/nullthrows";
import { mutable } from "../utils/types";
import { PambaWamNode } from "../wam/PambaWamNode";
import { StandardTrack } from "../lib/ProjectTrack";

export type SAudioClip = {
  kind: "AudioClip";
  name: string;
  bufferURL: string;
  bufferOffset: number;
  timelineStartSec: number;
  clipLengthSec: number;
};

export type SMidiClip = Readonly<{
  kind: "MidiClip";
  name: string;
  startOffsetPulses: number;
  lengthPulses: number;
  notes: readonly Note[];
  viewport: SMidiViewport;
  bufferTimelineStart: number;
}>;

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
  instrument: SMidiInstrument;
};

export type SMidiInstrument = {
  kind: "MidiInstrument";
  url: string;
  state: WamParameterDataMap;
};

export type SAudioProject = {
  kind: "AudioProject";
  projectId: string;
  projectName: string;
  tempo: number;
  tracks: Array<SAudioTrack | SMidiTrack>;
  solodTracks: Array<number>;
  dspExpandedTracks: Array<number>;
  lockedTracks: Array<number>;
  loopStart: STimelineT;
  loopEnd: STimelineT;
  loopOnPlayback: boolean;
  scaleFactor: number;
  viewportStartPx: number;
  snapToGrid: boolean;
  pointerTool: PointerTool;
  panelTool: SecondaryTool;
};

export type STimelineT = Readonly<{ t: number; u: TimeUnit }>;

export type SFaustAudioEffect = {
  kind: "FaustAudioEffect";
  effectId: FaustEffectID;
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
export async function serializable(obj: MidiInstrument): Promise<SMidiInstrument>;
export async function serializable(
  obj: AudioClip | AudioTrack | MidiClip | MidiTrack | AudioProject | FaustAudioEffect | PambaWamNode | MidiInstrument,
): Promise<
  | SAudioClip
  | SAudioTrack
  | SMidiClip
  | SMidiTrack
  | SAudioProject
  | SFaustAudioEffect
  | SPambaWamNode
  | SMidiInstrument
> {
  if (obj instanceof AudioClip) {
    const { name, bufferURL, bufferOffset, timelineStart, timelineLength } = obj;
    return {
      kind: "AudioClip",
      name: name.get(),
      bufferURL,
      bufferOffset: bufferOffset.ensureSecs(),
      timelineStartSec: timelineStart.ensureSecs(),
      clipLengthSec: timelineLength.ensureSecs(),
    };
  }

  if (obj instanceof MidiClip) {
    return {
      kind: "MidiClip",
      name: obj.name.get(),
      startOffsetPulses: obj.timelineStart.ensurePulses(),
      lengthPulses: obj.timelineLength.ensurePulses(), // todo: replace for serialized timelinet to avoid ensurePulses
      notes: obj.buffer.notes._getRaw(),
      viewport: obj.detailedViewport.serialize(),
      bufferTimelineStart: obj.bufferTimelineStart.ensurePulses(),
    };
  }

  if (obj instanceof AudioTrack) {
    return {
      kind: "AudioTrack",
      clips: await Promise.all(obj.clips._getRaw().map((clip) => serializable(clip))),
      effects: await Promise.all(obj.dsp.effects._getRaw().map((effect) => serializable(effect))),
      height: obj.height.get(),
      name: obj.name.get(),
    };
  }

  if (obj instanceof MidiTrack) {
    return {
      kind: "MidiTrack",
      name: obj.name.get(),
      clips: await Promise.all(obj.clips.map((clip) => serializable(clip) as any)), // TODO: as any?
      instrument: await obj.instrument.get().serialize(),
    };
  }

  if (obj instanceof MidiInstrument) {
    return obj.serialize();
  }

  if (obj instanceof AudioProject) {
    const allTracks = obj.allTracks._getRaw();
    const solodTracks = obj.solodTracks.map((track) => allTracks.indexOf(track));
    const lockedTracks = obj.lockedTracks.map((track) => allTracks.indexOf(track as any));
    const dspExpandedTracks = obj.dspExpandedTracks.map((track) => allTracks.indexOf(track));
    return {
      kind: "AudioProject",
      projectId: obj.projectId,
      projectName: obj.projectName.get(),
      tempo: obj.tempo.get(),
      tracks: await Promise.all(allTracks.map((track) => serializable(track))),
      solodTracks,
      lockedTracks,
      dspExpandedTracks,
      loopStart: obj.loopStart.serialize(),
      loopEnd: obj.loopEnd.serialize(),
      loopOnPlayback: obj.loopOnPlayback.get(),
      scaleFactor: obj.viewport.scaleFactor.get(),
      viewportStartPx: obj.viewport.viewportStartPx.get(),
      snapToGrid: obj.snapToGrid.get(),
      pointerTool: obj.pointerTool.get(),
      panelTool: obj.panelTool.get(),
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
    console.log("Sfoo", obj);
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
export async function construct(rep: SMidiInstrument): Promise<MidiInstrument>;
export async function construct(
  rep:
    | SAudioClip
    | SMidiClip
    | SAudioTrack
    | SMidiTrack
    | SAudioProject
    | SFaustAudioEffect
    | SPambaWamNode
    | SMidiInstrument,
): Promise<
  AudioClip | MidiClip | AudioTrack | MidiTrack | AudioProject | FaustAudioEffect | PambaWamNode | MidiInstrument
> {
  switch (rep.kind) {
    case "AudioClip": {
      const { bufferURL, name, bufferOffset, clipLengthSec, timelineStartSec } = rep;
      return AudioClip.fromURL(bufferURL, name, { bufferOffset, clipLengthSec, timelineStartSec });
    }
    case "MidiClip": {
      const { name, startOffsetPulses, lengthPulses, notes } = rep;
      // TODO: `create` creates a new ID for this clip. think about implications
      return MidiClip.of(name, startOffsetPulses, lengthPulses, mutable(notes));
    }
    case "AudioTrack": {
      const { name, clips: sClips, effects: sEffects, height } = rep;
      const clips = await Promise.all(sClips.map((clip) => construct(clip)));
      const effects = await Promise.all(sEffects.map((effect) => construct(effect)));
      return AudioTrack.of(name, clips, effects, height);
    }

    case "MidiTrack": {
      const { clips: sClips, name } = rep;
      const clips = await Promise.all(sClips.map((clip) => construct(clip)));
      const instrument = await construct(rep.instrument);
      return MidiTrack.createWithInstrument(instrument, name, clips);
    }

    case "MidiInstrument": {
      const [wamHostGroupId] = nullthrows(appEnvironment.wamHostGroup.get(), "wam host not initialized yet!");
      const instrument = await MidiInstrument.createFromUrl(rep.url, wamHostGroupId, liveAudioContext());
      await instrument.setState(rep.state);
      return instrument;
    }

    case "AudioProject": {
      const tracks = await Promise.all(rep.tracks.map((clip) => construct(clip)));
      const { projectId, projectName, tempo, loopStart, loopEnd, loopOnPlayback, scaleFactor, viewportStartPx } = rep;
      const solodTracks = rep.solodTracks?.map((index) => tracks[index]) ?? [];
      const dspExpandedTracks = rep.dspExpandedTracks?.map((index) => tracks[index]) ?? [];
      const lockedTracks = rep.lockedTracks?.map((index) => tracks[index]) ?? [];
      return new AudioProject(
        projectId,
        string(projectName),
        arrayOf([AudioTrack, MidiTrack], tracks),
        set<AudioTrack | MidiTrack>(solodTracks),
        set<AudioTrack | MidiTrack>(dspExpandedTracks),
        set<AudioTrack | MidiTrack | StandardTrack<any>>(lockedTracks),
        SPrimitive.of<AudioTrack | MidiTrack | null>(null), // todo
        SPrimitive.of<AudioTrack | MidiTrack | null>(null), // todo
        number(tempo),
        boolean(rep.snapToGrid ?? false),
        time(loopStart.t, loopStart.u),
        time(loopEnd.t, loopEnd.u),
        boolean(loopOnPlayback),
        SPrimitive.of<PointerTool>(rep.pointerTool ?? "move"), // todo: save this?
        SPrimitive.of<SecondaryTool>(rep.panelTool ?? "draw"),
        SPrimitive.of<number | null>(null), // todo
        SPrimitive.of(0), // todo
        set<AudioTrack | MidiTrack>(), // todo
        scaleFactor,
        viewportStartPx,
      );
    }
    case "FaustAudioEffect": {
      const effect = await FaustAudioEffect.create(liveAudioContext(), rep.effectId, rep.params);
      if (effect == null) {
        throw new Error(`Could not initialize effect ${rep.effectId}`);
      }
      return effect;
    }
    case "PambaWamNode": {
      const { pluginURL, state } = rep;
      const [wamHostGroupId] = nullthrows(appEnvironment.wamHostGroup.get(), "wam host not initialized yet!");
      const pambaWamNode = nullthrows(
        await PambaWamNode.fromURL(pluginURL, wamHostGroupId, liveAudioContext()),
        "could not create PambaWamNode",
      );
      await pambaWamNode.setState(state);
      return pambaWamNode;
    }

    default:
      exhaustive(rep);
  }
}
