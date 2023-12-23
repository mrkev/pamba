import type { WebAudioModule } from "@webaudiomodules/api";
import { SSchemaArray, arrayOf } from "structured-state";
import { CLIP_HEIGHT, PIANO_ROLL_PLUGIN_URL, SECS_IN_MINUTE, TIME_SIGNATURE, liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { ProjectTrack } from "../lib/ProjectTrack";
import { connectSerialNodes } from "../lib/connectSerialNodes";
import { nullthrows } from "../utils/nullthrows";
import { PianoRollModule, PianoRollNode } from "../wam/pianorollme/PianoRollNode";
import { MidiClip } from "./MidiClip";
import { MidiInstrument } from "./MidiInstrument";
import type { SimpleMidiClip } from "./SharedMidiTypes";

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

export class MidiTrack extends ProjectTrack<MidiClip> {
  public override clips: SSchemaArray<MidiClip>;
  override effectId: string = "Builtin:MidiTrack";
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
    super(name, [], CLIP_HEIGHT);
    this.clips = arrayOf([MidiClip], clips);
    this.playingSource = null;
    this.pianoRoll = pianoRoll as any;
    this.instrument = instrument;

    // gain.connect(liveAudioContext.destination);
    instrument.module.audioNode.connect(pianoRoll.audioNode);
    pianoRoll.audioNode.connectEvents(instrument.module.instanceId);

    if (clips.length === 0) this.createSampleMidiClip();
  }

  public createSampleMidiClip() {
    const newClip = MidiClip.create("new midi clip", 0, 96, []);
    for (const note of SAMPLE_STATE.clips.default.notes) {
      newClip.addNote(note.tick, note.number, note.duration, note.velocity);
    }
    this.clips.push(newClip);
  }

  static async createWithInstrument(instrument: MidiInstrument, name: string, clips?: MidiClip[]) {
    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const pianoRollPlugin = nullthrows(appEnvironment.wamPlugins.get(PIANO_ROLL_PLUGIN_URL), "Piano Roll not found!");
    // const pianoRoll = await pianoRollPlugin.import.createInstance(groupId, liveAudioContext);
    const pianoRoll = await PianoRollModule.createInstance<PianoRollNode>(groupId, liveAudioContext);
    await (pianoRoll as PianoRollModule).sequencer.setState(SAMPLE_STATE);

    // const pianoRollDom = await pianoRoll.createGui();
    return new MidiTrack(name, pianoRoll as any, instrument, clips ?? []);
  }

  override prepareForPlayback(context: AudioContext): void {
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
    this.pianoRoll.sendClipsForPlayback(simpleClips);
    // connect effect chain
    this.connectToDSPForPlayback(this.instrument.module.audioNode);
  }

  override async prepareForBounce(
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
      this.effects._getRaw().map(async (effect) => {
        const nextEffect = await effect.cloneToOfflineContext(context, offlineContextInfo);
        if (nextEffect == null) {
          throw new Error(`Failed to prepare ${effect.effectId} for bounce!`);
        }
        return nextEffect;
      }),
    );

    const _hiddenGainNode = await this._hiddenGainNode.cloneToOfflineContext(context);

    connectSerialNodes([
      ///
      // this.playingSource,
      await this.gainNode.cloneToOfflineContext(context),
      ...effectNodes,
      _hiddenGainNode,
    ]);

    return _hiddenGainNode.outputNode();
  }

  override startPlayback(bpm: number, context: BaseAudioContext, offsetSec: number): void {
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

  override stopPlayback(context: BaseAudioContext): void {
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

  override toString() {
    return this.clips
      ._getRaw()
      .map((c) => c.toString())
      .join("\n");
  }
}
