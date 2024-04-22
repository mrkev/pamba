import type { WebAudioModule } from "@webaudiomodules/api";
import { SPrimitive, SSchemaArray, arrayOf } from "structured-state";
import { CLIP_HEIGHT, SECS_IN_MINUTE, TIME_SIGNATURE, liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { StandardTrack } from "../lib/ProjectTrack";
import { ProjectTrackDSP } from "../lib/ProjectTrackDSP";
import { connectSerialNodes } from "../lib/connectSerialNodes";
import { AudioProject } from "../lib/project/AudioProject";
import { nullthrows } from "../utils/nullthrows";
import { PianoRollModule, PianoRollNode } from "../wam/pianorollme/PianoRollNode";
import { MidiClip } from "./MidiClip";
import { MidiInstrument } from "./MidiInstrument";
import type { PianoRollProcessorMessage, SimpleMidiClip } from "./SharedMidiTypes";

export class MidiTrack implements StandardTrack<MidiClip> {
  public readonly name: SPrimitive<string>;
  public readonly dsp: ProjectTrackDSP<MidiClip>;
  public readonly clips: SSchemaArray<MidiClip>;
  public readonly height: SPrimitive<number>;

  // todo: instrument can be empty?
  instrument: MidiInstrument;
  pianoRoll: PianoRollModule;

  // the pianoRoll to play. same as .pianoRoll when playing live,
  // a clone in an offline context when bouncing
  playingSource: PianoRollModule | null;

  private constructor(
    name: string,
    pianoRoll: WebAudioModule<PianoRollNode>,
    instrument: MidiInstrument,
    clips: MidiClip[],
  ) {
    this.clips = arrayOf([MidiClip as any], clips);
    this.playingSource = null;
    this.pianoRoll = pianoRoll as any;
    this.instrument = instrument;
    this.dsp = new ProjectTrackDSP(this, []);
    this.name = SPrimitive.of(name);
    this.height = SPrimitive.of<number>(CLIP_HEIGHT);

    // gain.connect(liveAudioContext.destination);
    instrument.module.audioNode.connect(pianoRoll.audioNode);
    pianoRoll.audioNode.connectEvents(instrument.module.instanceId);

    if (clips.length === 0) this.createSampleMidiClip();
  }

  // TODO: OLD INSTRUMENT ISN'T BEING PROPERLY REMOVED
  public async changeInstrument(instrument: MidiInstrument) {
    // TODO: ensure audio not playing?
    // Disconnect and destroy the old instrument
    await liveAudioContext().suspend();
    this.instrument.module.audioNode.disconnect(this.pianoRoll.audioNode);
    this.pianoRoll.audioNode.disconnectEvents(instrument.module.instanceId);
    this.pianoRoll.audioNode.clearEvents();
    this.instrument.disconnectAll();
    this.instrument.module.audioNode.disconnect();
    this.instrument.module.audioNode.disconnectEvents();
    this.instrument.destroy();
    this.instrument.module.audioNode;
    console.log(this.instrument);

    // Setup the new instrument
    this.instrument = instrument;
    this.instrument.module.audioNode.connect(this.pianoRoll.audioNode);
    this.pianoRoll.audioNode.connectEvents(instrument.module.instanceId);
    console.log("chagned instrument to", this.instrument.url);
    await liveAudioContext().resume();
  }

  public createSampleMidiClip() {
    const newClip = MidiClip.of("new midi clip", 0, 96, []);
    for (const note of SAMPLE_STATE.clips.default.notes) {
      newClip.addNote(note.tick, note.number, note.duration, note.velocity);
    }
    this.clips.push(newClip);
  }

  static async createWithInstrument(instrument: MidiInstrument, name: string, clips?: MidiClip[]) {
    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const pianoRoll = await PianoRollModule.createInstance<PianoRollNode>(groupId, liveAudioContext());
    await (pianoRoll as PianoRollModule).sequencer.setState(SAMPLE_STATE);
    return new MidiTrack(name, pianoRoll, instrument, clips ?? []);
  }

  prepareForPlayback(project: AudioProject, context: AudioContext): void {
    this.playingSource = this.pianoRoll;
    // send clips to processor
    // should already be in ascending order of startOffsetPulses
    const simpleClips: SimpleMidiClip[] = [];
    for (const clip of this.clips) {
      simpleClips.push({
        notes: clip.notes._getRaw(),
        startOffsetPulses: clip.startOffsetPulses,
        endOffsetPulses: clip._timelineEndU,
      });
    }
    // lines from: called: this.pianoRoll.sendClipsForPlayback(simpleClips);
    const message: PianoRollProcessorMessage = { action: "newclip", seqClips: simpleClips };
    this.pianoRoll.sequencer.port.postMessage(message);

    // connect effect chain
    this.dsp.connectToDSPForPlayback(this.instrument.module.audioNode);
  }

  async prepareForBounce(
    context: OfflineAudioContext,
    offlineContextInfo: Readonly<{ wamHostGroup: [id: string, key: string] }>,
  ): Promise<AudioNode> {
    const {
      wamHostGroup: [groupId],
    } = offlineContextInfo;
    const pianoRoll = await PianoRollModule.createInstance<PianoRollNode>(groupId, context);
    const instrument = await this.instrument.actualCloneToOfflineContext(context, offlineContextInfo);
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
