import type { WebAudioModule } from "@webaudiomodules/api";
import { CLIP_HEIGHT, PIANO_ROLL_PLUGIN_URL, SECS_IN_MINUTE, TIME_SIGNATURE, liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { ProjectTrack } from "../lib/ProjectTrack";
import { LinkedArray } from "../lib/state/LinkedArray";
import nullthrows from "../utils/nullthrows";
import { MidiClip } from "./MidiClip";
import { MidiInstrument } from "./MidiInstrument";

import { removeClip } from "../lib/AudioTrackFn";
import { PianoRollModule, PianoRollNode } from "../wam/pianorollme/PianoRollNode";
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

export class MidiTrack extends ProjectTrack {
  override effectId: string = "MIDI TRACK TODO";
  instrument: MidiInstrument;
  pianoRoll: PianoRollModule;
  // pianoRollDom: Element;
  clips: LinkedArray<MidiClip>;

  private constructor(
    name: string,
    pianoRoll: WebAudioModule<PianoRollNode>,
    instrument: MidiInstrument,
    clips: MidiClip[],
  ) {
    super(name, [], CLIP_HEIGHT);
    this.pianoRoll = pianoRoll as any;
    this.instrument = instrument;
    this.clips = LinkedArray.create(clips);

    instrument.module.audioNode.connect(this._hiddenGainNode.inputNode());
    // gain.connect(liveAudioContext.destination);
    instrument.module.audioNode.connect(pianoRoll.audioNode);
    pianoRoll.audioNode.connectEvents(instrument.module.instanceId);
    if (clips.length === 0) this.createSampleMidiClip();
  }

  override addEffect(effectId: "PANNER" | "REVERB"): Promise<void> {
    throw new Error("Method not implemented.");
  }
  override addWAM(url: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public createSampleMidiClip() {
    const newClip = new MidiClip("new midi clip", 96, []);
    for (const note of SAMPLE_STATE.clips.default.notes) {
      newClip.addNote(note.tick, note.number, note.duration, note.velocity);
    }

    console.log(newClip);

    this.clips.push(newClip);
  }

  public removeClip(clip: MidiClip): void {
    const clips = removeClip(clip, this.clips._getRaw());
    this.clips._setRaw(clips);
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
    // mix clips

    // should already be in ascending order of startOffsetPulses
    const simpleClips: SimpleMidiClip[] = [];
    for (const clip of this.clips) {
      simpleClips.push({
        notes: clip.notes._getRaw(),
        startOffsetPulses: clip.startOffsetPulses,
        endOffsetPulses: clip._endOffset(),
      });
    }

    this.pianoRoll.prepareForPlayback(simpleClips);
    console.log("sending", simpleClips);

    // take all clips, make a single note array
  }

  override startPlayback(bpm: number, offsetSec: number): void {
    // todo: only supports X/4 (ie, quarter note denominator in time signature) for now
    const [BEATS_PER_BAR] = TIME_SIGNATURE;
    const currentBar = (offsetSec * bpm) / (BEATS_PER_BAR * SECS_IN_MINUTE);

    // this.pianoRoll.sendMessageToProcessor({ action: "setPlaybackStartOffset", offsetSec });
    this.pianoRoll.audioNode.scheduleEvents({
      type: "wam-transport",
      data: {
        playing: true,
        timeSigDenominator: 4,
        timeSigNumerator: 4,
        currentBar,
        currentBarStarted: liveAudioContext.currentTime,
        tempo: bpm,
      },
    });
  }

  override stopPlayback(): void {
    this.pianoRoll.audioNode.scheduleEvents({
      type: "wam-transport",
      data: {
        playing: false,
        timeSigDenominator: 4,
        timeSigNumerator: 4,
        currentBar: 0,
        currentBarStarted: liveAudioContext.currentTime,
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
