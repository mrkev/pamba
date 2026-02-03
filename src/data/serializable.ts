import { WamParameterDataMap } from "@webaudiomodules/api";
import {
  arrayOf,
  boolean,
  number,
  SArray,
  SBoolean,
  set,
  SPrimitive,
  SString,
  string,
  Structured,
} from "structured-state";
import { liveAudioContext } from "../constants";
import { FaustEffectID } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { StandardTrack } from "../lib/ProjectTrack";
import { ProjectTrackDSP } from "../lib/ProjectTrackDSP";
import { PBGainNode } from "../lib/offlineNodes";
import { AudioProject, PointerTool, SecondaryTool } from "../lib/project/AudioProject";
import { time, TimeUnit } from "../lib/project/TimelineT";
import { MidiViewport, SMidiViewport } from "../lib/viewport/MidiViewport";
import { MidiClip } from "../midi/MidiClip";
import { MidiInstrument } from "../midi/MidiInstrument";
import { MidiTrack } from "../midi/MidiTrack";
import { NoteT } from "../midi/SharedMidiTypes";
import { isInstrumentPlugin } from "../midi/isInstrumentPlugin";
import { exhaustive } from "../utils/exhaustive";
import { nullthrows } from "../utils/nullthrows";
import { mutable } from "../utils/types";
import { PambaWamNode } from "../wam/PambaWamNode";
import { MidiBuffer } from "../midi/MidiBuffer";
import { MidiNote, mnote } from "../midi/MidiNote";

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
  notes: readonly NoteT[];
  viewport: SMidiViewport;
  bufferTimelineStart: number;
  muted: boolean;
}>;

export type SAudioTrack = {
  kind: "AudioTrack";
  clips: Array<SAudioClip>;
  height: number;
  name: string;
  dsp: SProjectTrackDSP;
};

export type SMidiTrack = {
  kind: "MidiTrack";
  clips: Array<SMidiClip>;
  name: string;
  instrument: SMidiInstrument;
};

export type SProjectTrackDSP = {
  kind: "ProjectTrackDSP";
  name: string;
  bypass: boolean;
  gain: number;
  effects: Array<SFaustAudioEffect | SPambaWamNode>;
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
export async function serializable(obj: ProjectTrackDSP): Promise<SProjectTrackDSP>;
export async function serializable(
  obj:
    | AudioClip
    | AudioTrack
    | MidiClip
    | MidiTrack
    | AudioProject
    | FaustAudioEffect
    | PambaWamNode
    | MidiInstrument
    | ProjectTrackDSP,
): Promise<
  | SAudioClip
  | SAudioTrack
  | SMidiClip
  | SMidiTrack
  | SAudioProject
  | SFaustAudioEffect
  | SPambaWamNode
  | SMidiInstrument
  | SProjectTrackDSP
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
      notes: obj.buffer.notes._getRaw().map((note) => note.t),
      viewport: obj.detailedViewport.serialize(),
      bufferTimelineStart: obj.bufferTimelineStart.ensurePulses(),
      muted: obj.muted.get(),
    };
  }

  if (obj instanceof AudioTrack) {
    return {
      kind: "AudioTrack",
      clips: await Promise.all(obj.clips._getRaw().map((clip) => serializable(clip))),
      height: obj.height.get(),
      name: obj.name.get(),
      dsp: await serializable(obj.dsp),
    };
  }

  if (obj instanceof MidiTrack) {
    return {
      kind: "MidiTrack",
      name: obj.name.get(),
      clips: await Promise.all(obj.clips.map((clip) => serializable(clip) as any)), // TODO: as any?
      instrument: await serializable(obj.instrument.get()),
    };
  }

  if (obj instanceof ProjectTrackDSP) {
    return {
      kind: "ProjectTrackDSP",
      name: obj.name.get(),
      effects: await Promise.all(obj.effects._getRaw().map((effect) => serializable(effect))),
      bypass: obj.bypass.get(),
      gain: obj.gainNode.gain.value,
    };
  }

  if (obj instanceof MidiInstrument) {
    console.log({
      kind: "MidiInstrument",
      url: obj.url,
      state: await obj.getState(),
    });
    return {
      kind: "MidiInstrument",
      url: obj.url,
      state: await obj.getState(),
    };
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
      scaleFactor: obj.viewport.pxPerSecond.get(),
      viewportStartPx: obj.viewport.scrollLeftPx.get(),
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
export async function construct(rep: SProjectTrackDSP): Promise<ProjectTrackDSP>;
export async function construct(
  rep:
    | SAudioClip
    | SMidiClip
    | SAudioTrack
    | SMidiTrack
    | SAudioProject
    | SFaustAudioEffect
    | SPambaWamNode
    | SMidiInstrument
    | SProjectTrackDSP,
): Promise<
  | AudioClip
  | MidiClip
  | AudioTrack
  | MidiTrack
  | AudioProject
  | FaustAudioEffect
  | PambaWamNode
  | MidiInstrument
  | ProjectTrackDSP
> {
  switch (rep.kind) {
    case "AudioClip": {
      const { bufferURL, name, bufferOffset, clipLengthSec, timelineStartSec } = rep;
      return AudioClip.fromURL(bufferURL, name, { bufferOffset, clipLengthSec, timelineStartSec });
    }

    case "MidiClip": {
      const { name, startOffsetPulses, lengthPulses, notes, viewport, muted } = rep;
      // TODO: `create` creates a new ID for this clip. think about implications
      return Structured.create(
        MidiClip,
        SString.create(name),
        time(startOffsetPulses, "pulses"),
        time(lengthPulses, "pulses"),
        Structured.create(MidiBuffer, arrayOf([MidiNote], notes.map(mnote)), time(lengthPulses, "pulses")),
        MidiViewport.of(viewport.pxPerPulse, viewport.pxNoteHeight, viewport.scrollLeft, viewport.scrollTop),
        set([]),
        time(startOffsetPulses, "pulses"),
        SBoolean.create(muted),
      );
    }
    case "AudioTrack": {
      const { name, clips: sClips, height } = rep;
      const clips = await Promise.all(sClips.map((clip) => construct(clip)));
      const projectTrackDSP =
        "dsp" in rep
          ? await construct(rep.dsp)
          : new ProjectTrackDSP(string("AudioTrackDSP"), PBGainNode.defaultLive(), SArray.create([]), boolean(false));
      return await AudioTrack.of(name, clips, height, projectTrackDSP);
    }

    case "MidiTrack": {
      const { clips: sClips, name } = rep;
      const clips = await Promise.all(sClips.map((clip) => construct(clip)));
      const instrument = await construct(rep.instrument);
      return MidiTrack.createWithInstrument(instrument, name, clips);
    }

    case "ProjectTrackDSP": {
      const effects = await Promise.all(rep.effects?.map((effect) => construct(effect)) ?? []);

      const result = new ProjectTrackDSP(
        string(rep.name),
        PBGainNode.of(rep.gain, liveAudioContext()),
        SArray.create(effects),
        boolean(rep.bypass),
      );
      console.log("rep.gain", rep.gain, result);

      return result;
    }

    case "MidiInstrument": {
      const [wamHostGroupId] = nullthrows(appEnvironment.wamHostGroup.get(), "wam host not initialized yet!");

      const plugin = nullthrows(
        appEnvironment.wamPlugins.get(rep.url),
        `project uses unavailable instrument: ${rep.url}`,
      );

      if (!isInstrumentPlugin(plugin)) {
        throw new Error("instrument plugin changed, it's no longer an instrument");
      }

      const instrument = await MidiInstrument.createFromInstrumentPlugin(plugin);
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
        SPrimitive.of<AudioTrack | null>(null), // todo
        SPrimitive.of<MidiTrack | null>(null), // todo
        number(tempo),
        boolean(rep.snapToGrid ?? false),
        boolean(true), // todo
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
      const plugin = nullthrows(
        appEnvironment.wamPlugins.get(pluginURL),
        `project uses unavailable plugin: ${pluginURL}`,
      );

      const pambaWamNode = nullthrows(
        await PambaWamNode.fromAvailablePlugin(plugin, wamHostGroupId, liveAudioContext(), state),
        "could not create PambaWamNode",
      );
      return pambaWamNode;
    }

    default:
      exhaustive(rep);
  }
}
