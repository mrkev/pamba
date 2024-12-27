import type { WebAudioModule } from "@webaudiomodules/api";
import {
  JSONOfAuto,
  ReplaceFunctions,
  SNumber,
  SPrimitive,
  SSchemaArray,
  SString,
  Structured,
  arrayOf,
  boolean,
  string,
} from "structured-state";
import { CLIP_HEIGHT, SECS_IN_MINUTE, SOUND_FONT_URL, TIME_SIGNATURE, liveAudioContext } from "../constants";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { appEnvironment } from "../lib/AppEnvironment";
import { StandardTrack } from "../lib/ProjectTrack";
import { ProjectTrackDSP } from "../lib/ProjectTrackDSP";
import { connectSerialNodes } from "../lib/connectSerialNodes";
import { AudioProject } from "../lib/project/AudioProject";
import { nullthrows } from "../utils/nullthrows";
import { MIDIConfiguration } from "../wam/pianorollme/MIDIConfiguration";
import { PianoRollModule, PianoRollNode } from "../wam/pianorollme/PianoRollModule";
import { MidiClip } from "./MidiClip";
import { MidiInstrument } from "./MidiInstrument";
import type { PianoRollProcessorMessage, SimpleMidiClip } from "./SharedMidiTypes";

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
  instrument: SPrimitive<MidiInstrument>;
  readonly pianoRoll: PianoRollModule;

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

  constructor(name: string, pianoRoll: WebAudioModule<PianoRollNode>, instrument: MidiInstrument, clips: MidiClip[]) {
    super();
    this.clips = arrayOf([MidiClip], clips);
    this.playingSource = null;
    this.pianoRoll = pianoRoll as any;
    this.instrument = SPrimitive.of(instrument);
    this.dsp = new ProjectTrackDSP(string("MidiTrackDSP"), boolean(false), []);
    this.name = SPrimitive.of(name);
    this.height = SPrimitive.of<number>(CLIP_HEIGHT);

    // connect sequencer and instrument
    // gain.connect(liveAudioContext.destination);
    instrument.module.audioNode.connect(pianoRoll.audioNode);
    pianoRoll.audioNode.connectEvents(instrument.module.instanceId);

    // connect instrument to rest of track dsp
    this.dsp.connectToDSPForPlayback(this.instrument.get().node);

    if (clips.length === 0) this.createSampleMidiClip();
  }

  static async createDefault(name: string = "midi track", clips: MidiClip[] = []) {
    const wamHostGroupId = nullthrows(appEnvironment.wamHostGroup.get())[0];
    const instrument = await MidiInstrument.createFromUrl(SOUND_FONT_URL, wamHostGroupId, liveAudioContext());
    return this.createWithInstrument(instrument, name, clips);
  }

  static async createWithInstrument(instrument: MidiInstrument, name: string, clips?: MidiClip[]) {
    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const pianoRoll = await PianoRollModule.createInstance<PianoRollNode>(groupId, liveAudioContext());
    return Structured.create(MidiTrack, name, pianoRoll, instrument, clips ?? []);
  }

  // TODO: OLD INSTRUMENT ISN'T BEING PROPERLY REMOVED
  public async changeInstrument(instrument: MidiInstrument) {
    const currInstr = this.instrument.get();
    // TODO: ensure audio not playing?
    // Disconnect and destroy the old instrument
    await liveAudioContext().suspend();
    currInstr.module.audioNode.disconnect(this.pianoRoll.audioNode);
    this.pianoRoll.audioNode.disconnectEvents(instrument.module.instanceId);
    this.pianoRoll.audioNode.clearEvents();
    currInstr.disconnectAll();
    currInstr.module.audioNode.disconnect();
    currInstr.module.audioNode.disconnectEvents();
    currInstr.destroy();

    // Setup the new instrument
    this.instrument.set(instrument);
    // connect to piano roll
    instrument.module.audioNode.connect(this.pianoRoll.audioNode);
    this.pianoRoll.audioNode.connectEvents(instrument.module.instanceId);
    // connect to rest of track dsp
    this.dsp.connectToDSPForPlayback(this.instrument.get().node);

    console.log("chagned instrument to", instrument.url);
    await liveAudioContext().resume();
  }

  public createSampleMidiClip() {
    const newClip = MidiClip.of("new midi clip", 0, 96, []);
    for (const note of SAMPLE_STATE.clips.default.notes) {
      MidiClip.addNote(newClip, note.tick, note.number, note.duration, note.velocity);
    }
    this.clips.push(newClip);
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

  clipsForProcessor(): SimpleMidiClip[] {
    const simpleClips: SimpleMidiClip[] = [];
    for (const clip of this.clips) {
      simpleClips.push({
        id: clip._id,
        notes: clip.buffer.notes._getRaw(),
        startOffsetPulses: clip.timelineStart.ensurePulses(),
        endOffsetPulses: clip._timelineEndU,
      });
    }
    return simpleClips;
  }

  flushClipStateToProcessor() {
    this.messageSequencer({
      action: "set_clips",
      seqClips: this.clipsForProcessor(),
    });
  }

  noteOn(note: number) {
    this.pianoRoll.playingNotes.add(note);
    this.messageSequencer({
      action: "immEvent",
      event: ["on", note, 100],
    });
  }

  noteOff(note: number) {
    this.pianoRoll.playingNotes.delete(note);
    this.messageSequencer({
      action: "immEvent",
      event: ["off", note, 100],
    });
  }

  allNotesOff() {
    this.pianoRoll.playingNotes.clear();
    this.messageSequencer({
      action: "immEvent",
      event: ["alloff"],
    });
  }

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

    instrument.module.audioNode.connect(pianoRoll.audioNode);
    pianoRoll.audioNode.connectEvents(instrument.module.instanceId);

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
    console.log("SCHEDULE");
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

const SAMPLE_STATE = {
  clips: {
    default: {
      length: 96,
      notes: [
        {
          tick: 0,
          number: 60,
          duration: 6,
          velocity: 100,
        },
        {
          tick: 12,
          number: 60,
          duration: 6,
          velocity: 100,
        },
        {
          tick: 24,
          number: 60,
          duration: 6,
          velocity: 100,
        },
        {
          tick: 36,
          number: 60,
          duration: 6,
          velocity: 100,
        },
        {
          tick: 48,
          number: 60,
          duration: 6,
          velocity: 100,
        },
        {
          tick: 60,
          number: 60,
          duration: 6,
          velocity: 100,
        },
        {
          tick: 72,
          number: 60,
          duration: 6,
          velocity: 100,
        },
        {
          tick: 84,
          number: 60,
          duration: 6,
          velocity: 100,
        },
      ],
      id: "default",
    },
  },
};
