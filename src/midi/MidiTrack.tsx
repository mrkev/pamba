import {
  JSONOfAuto,
  ReplaceFunctions,
  SArray,
  SNumber,
  SPrimitive,
  SSchemaArray,
  SString,
  Structured,
  arrayOf,
  boolean,
  string,
} from "structured-state";
import { Subbable } from "structured-state/dist/state/Subbable";
import { CLIP_HEIGHT, SECS_IN_MINUTE, TIME_SIGNATURE, liveAudioContext } from "../constants";
import { connectSerialNodes } from "../dsp/connectSerialNodes";
import { DSP } from "../dsp/DSP";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { appEnvironment, defaultInstrument, liveWamHostGroupId } from "../lib/AppEnvironment";
import { PBGainNode } from "../lib/offlineNodes";
import { AudioProject } from "../lib/project/AudioProject";
import { ProjectTrackDSP } from "../lib/ProjectTrackDSP";
import { StandardTrack } from "../lib/StandardTrack";
import { nullthrows } from "../utils/nullthrows";
import { MIDIConfiguration } from "../wam/miditrackwam/MIDIConfiguration";
import { PianoRollModule, PianoRollNode } from "../wam/miditrackwam/PianoRollModule";
import { MidiClip, midiClip, sequencerClipOfMidiClip } from "./MidiClip";
import { MidiInstrument } from "./MidiInstrument";
import type { PianoRollProcessorMessage, SequencerMidiClip } from "./SharedMidiTypes";

type AutoMidiTrack = {
  name: SString;
  clips: SSchemaArray<MidiClip>;
  instrument: string;
};

export class MidiTrack extends Structured<AutoMidiTrack, typeof MidiTrack> implements StandardTrack<MidiClip> {
  public readonly name: SString;
  public readonly dsp: ProjectTrackDSP;
  public readonly clips: SSchemaArray<MidiClip>;
  public readonly height: SNumber;

  // TODO UNUSED, FROM PianoRoll class
  readonly midiConfig = {
    pluginRecordingArmed: false,
    hostRecordingArmed: false,
    inputMidiChannel: -1,
    outputMidiChannel: 0,
  };

  _changed(target: Subbable, self: Subbable) {
    if (target === this.clips) {
      console.log("clips");
    }
    // console.log("FOOO", target, self);
  }

  updateProcessorMIDIConfig(config: MIDIConfiguration) {
    this.pianoRoll.sendMessageToProcessor({ action: "midiConfig", config });
  }

  armHostRecording(armed: boolean) {
    this.midiConfig.hostRecordingArmed = armed;
    this.updateProcessorMIDIConfig(this.midiConfig);
  }

  armPluginRecording(armed: boolean) {
    this.midiConfig.pluginRecordingArmed = armed;
    this.updateProcessorMIDIConfig(this.midiConfig);
  }

  inputMidiChanged(v: number) {
    if (v < -1 || v > 15) {
      throw `Invalid input midi value: ${v}`;
    }
    this.midiConfig.inputMidiChannel = v;
    this.updateProcessorMIDIConfig(this.midiConfig);
  }

  outputMidiChanged(v: number) {
    if (v < 0 || v > 15) {
      throw `Invalid output midi value: ${v}`;
    }
    this.midiConfig.outputMidiChannel = v;
    this.updateProcessorMIDIConfig(this.midiConfig);
  }
  /////////////////////

  // todo: instrument can be empty?
  // TODO: SPrimitive holds Structs.
  public readonly instrument: SPrimitive<MidiInstrument>;
  // readonly pianoRoll: PianoRollModule;

  // the pianoRoll to play. same as .pianoRoll when playing live,
  // a clone in an offline context when bouncing
  playingSource: PianoRollModule | null;

  override autoSimplify(): AutoMidiTrack {
    return {
      name: this.name,
      clips: this.clips,
      instrument: this.instrument.get().url,
    };
  }

  override replace(json: JSONOfAuto<AutoMidiTrack>, replace: ReplaceFunctions): void {
    replace.string(json.name, this.name);
    replace.schemaArray(json.clips, this.clips);
    // TODO: when undoing a note draw, we need to call flushClipStateToProcessor.
    //     WE CAN add a callback to history.record(). finally. it gets called:
    //            when action is first taken, when action is undone, when action is redone.
    //            with argument to wether we're currently in an "act", "undo" or "redo"
    //            wont work, cause what if track gets deleted in history. we don't have a reference to the regenerated track.
    // todo: replace instrument, with correct DSP connections
  }

  static construct(auto: JSONOfAuto<AutoMidiTrack>): MidiTrack {
    throw new Error("Need async construct to construct MidiTrack");
  }

  constructor(
    name: string,
    readonly pianoRoll: PianoRollModule,
    instrument: MidiInstrument,
    clips: MidiClip[],
  ) {
    super();
    this.clips = arrayOf([MidiClip], clips);
    this.playingSource = null;
    this.instrument = SPrimitive.of(instrument);
    this.dsp = new ProjectTrackDSP(string("MidiTrackDSP"), PBGainNode.defaultLive(), SArray.create([]), boolean(false));
    this.name = SPrimitive.of(name);
    this.height = SPrimitive.of<number>(CLIP_HEIGHT);

    // connect sequencer and instrument
    // gain.connect(liveAudioContext.destination);
    instrument.pambaWam.wamInstance.audioNode.connect(pianoRoll.audioNode);
    pianoRoll.audioNode.connectEvents(instrument.wamInstance.instanceId);

    // connect instrument to rest of track dsp
    this.dsp.connectToDSPForPlayback(this.instrument.get().pambaWam.node);

    if (clips.length === 0) {
      const newClip = midiClip.createSampleMidiClip();
      this.clips.push(newClip);
    }
  }

  static async createDefault(name: string = "midi track", clips: MidiClip[] = []) {
    const instrument = await MidiInstrument.createFromInstrumentPlugin(
      defaultInstrument(),
      liveWamHostGroupId(),
      liveAudioContext(),
    );
    return this.createWithInstrument(instrument, name, clips);
  }

  static async createWithInstrument(instrument: MidiInstrument, name: string, clips?: MidiClip[]) {
    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const pianoRoll = (await PianoRollModule.createInstance<PianoRollNode>(
      groupId,
      liveAudioContext(),
    )) as PianoRollModule;
    return Structured.create(MidiTrack, name, pianoRoll, instrument, clips ?? []);
  }

  prepareForPlayback(project: AudioProject, context: AudioContext, startingAt: number): void {
    this.playingSource = this.pianoRoll;
    // send clips to processor
    // should already be in ascending order of startOffsetPulses

    // LOOP in pulses for now, is this what we want?
    const loop = AudioProject.playbackWillLoop(project, startingAt)
      ? ([project.loopStart.pulses(project), project.loopEnd.pulses(project)] as const)
      : null;

    // lines from: called: this.pianoRoll.sendClipsForPlayback(simpleClips);
    this.messageSequencer({
      action: "prepare_playback",
      seqClips: this.clipsForProcessor(),
      loop,
    });
  }

  clipsForProcessor(): SequencerMidiClip[] {
    const simpleClips: SequencerMidiClip[] = [];
    for (const clip of this.clips) {
      simpleClips.push(sequencerClipOfMidiClip(clip));
    }
    return simpleClips;
  }

  // PLAY MIDI ON THIS TRACK

  messageSequencer(message: PianoRollProcessorMessage) {
    this.pianoRoll.sendMessageToProcessor(message);
  }

  async prepareForBounce(
    context: OfflineAudioContext,
    offlineContextInfo: Readonly<{ wamHostGroup: [id: string, key: string] }>,
  ): Promise<TrackedAudioNode> {
    const {
      wamHostGroup: [groupId],
    } = offlineContextInfo;
    const pianoRoll = await PianoRollModule.createInstance<PianoRollNode>(groupId, context);
    const instrument = await this.instrument.get().actualCloneToOfflineContext(context, offlineContextInfo);
    if (instrument == null) {
      throw new Error("failed to clone instrument to offline audio context");
    }

    instrument.wamInstance.audioNode.connect(pianoRoll.audioNode);
    pianoRoll.audioNode.connectEvents(instrument.wamInstance.instanceId);

    this.playingSource = pianoRoll as any;

    const effectNodes = await Promise.all(
      this.dsp.effects._getRaw().map(async (effect) => {
        const nextEffect = await effect.cloneToOfflineContext(context, offlineContextInfo);
        if (nextEffect == null) {
          throw new Error(`Failed to prepare ${effect.effectId} for bounce!`);
        }
        return nextEffect;
      }),
    );

    const _hiddenGainNode = await this.dsp._hiddenGainNode.cloneToOfflineContext(context);

    connectSerialNodes([
      ///
      // this.playingSource,
      await this.dsp.gainNode.cloneToOfflineContext(context),
      ...effectNodes,
      _hiddenGainNode,
    ]);

    return _hiddenGainNode.outputNode();
  }

  startPlayback(bpm: number, context: BaseAudioContext, offsetSec: number): void {
    if (this.playingSource == null) {
      throw new Error("Track not ready for playback!");
    }

    // todo: only supports X/4 (ie, quarter note denominator in time signature) for now
    const [BEATS_PER_BAR, DENOM] = TIME_SIGNATURE;
    const currentBar = (offsetSec * bpm) / (BEATS_PER_BAR * SECS_IN_MINUTE);

    // this.pianoRoll.sendMessageToProcessor({ action: "setPlaybackStartOffset", offsetSec });

    this.playingSource.audioNode.scheduleEvents({
      type: "wam-transport",
      data: {
        playing: true,
        timeSigDenominator: DENOM,
        timeSigNumerator: BEATS_PER_BAR,
        currentBar,
        currentBarStarted: context.currentTime,
        tempo: bpm,
      },
    });
  }

  stopPlayback(context: BaseAudioContext): void {
    if (this.playingSource == null) {
      console.warn("Stopping but no playingSource on track", this);
      return;
    }

    const [BEATS_PER_BAR, DENOM] = TIME_SIGNATURE;

    this.playingSource.audioNode.scheduleEvents({
      type: "wam-transport",
      data: {
        playing: false,
        timeSigDenominator: DENOM,
        timeSigNumerator: BEATS_PER_BAR,
        currentBar: 0,
        currentBarStarted: context.currentTime,
        tempo: 120, // todo: tempo
      },
    });
  }
}

/******************************************* MidiTrack methods *******************************************/

/** plays a note immediately */
function noteOn(track: MidiTrack, note: number) {
  track.pianoRoll.playingNotes.add(note);
  track.messageSequencer({
    action: "immEvent",
    event: ["on", note, 100],
  });
}

/** stops playing a note immediately */
function noteOff(track: MidiTrack, note: number) {
  track.pianoRoll.playingNotes.delete(note);
  track.messageSequencer({
    action: "immEvent",
    event: ["off", note, 100],
  });
}

/** stops playling all notes immediately */
function allNotesOff(track: MidiTrack) {
  for (const note of track.pianoRoll.playingNotes) {
    track.messageSequencer({
      action: "immEvent",
      event: ["off", note, 100],
    });
  }

  track.pianoRoll.playingNotes.clear();
  track.messageSequencer({
    action: "immEvent",
    event: ["alloff"],
  });
}

function muteClip(track: MidiTrack, clip: MidiClip) {
  clip.muted.set(true);
  track.messageSequencer({
    action: "clip_changed",
    clip: sequencerClipOfMidiClip(clip),
  });
}

function unmuteClip(track: MidiTrack, clip: MidiClip) {
  clip.muted.set(false);
  track.messageSequencer({
    action: "clip_changed",
    clip: sequencerClipOfMidiClip(clip),
  });
}

/** sends all clip state to sequencer */
function flushAllClipStateToProcessor(track: MidiTrack) {
  track.messageSequencer({
    action: "set_clips",
    seqClips: track.clipsForProcessor(),
  });
}

/** sends single clip state to sequencer */
function flushClipStateToProcessor(track: MidiTrack, clip: MidiClip) {
  track.messageSequencer({
    action: "clip_changed",
    clip: sequencerClipOfMidiClip(clip),
  });
}

// TODO: OLD INSTRUMENT ISN'T BEING PROPERLY REMOVED
async function changeInstrument(track: MidiTrack, instrument: MidiInstrument) {
  const currInstr = track.instrument.get();
  // TODO: ensure audio not playing?
  // Disconnect and destroy the old instrument
  await liveAudioContext().suspend();
  currInstr.pambaWam.wamInstance.audioNode.disconnect(track.pianoRoll.audioNode);
  track.pianoRoll.audioNode.disconnectEvents(instrument.wamInstance.instanceId);
  track.pianoRoll.audioNode.clearEvents();
  DSP.disconnectAll(currInstr);
  currInstr.pambaWam.wamInstance.audioNode.disconnect();
  currInstr.pambaWam.wamInstance.audioNode.disconnectEvents();
  currInstr.destroy();

  // Setup the new instrument
  track.instrument.set(instrument);
  // connect to piano roll
  instrument.wamInstance.audioNode.connect(track.pianoRoll.audioNode);
  track.pianoRoll.audioNode.connectEvents(instrument.wamInstance.instanceId);
  // connect to rest of track dsp
  track.dsp.connectToDSPForPlayback(track.instrument.get().pambaWam.node);

  console.log("chagned instrument to", instrument.url);
  await liveAudioContext().resume();
}

export const midiTrack = {
  // Note Playback
  noteOn,
  noteOff,
  allNotesOff,

  /** Clip Management */

  muteClip,
  unmuteClip,

  flushAllClipStateToProcessor,
  flushClipStateToProcessor,

  changeInstrument,
};
