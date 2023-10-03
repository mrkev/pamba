import type { WamNode, WebAudioModule } from "@webaudiomodules/api";
import { CLIP_HEIGHT, PIANO_ROLL_PLUGIN_URL, liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import nullthrows from "../utils/nullthrows";
import { ProjectTrack } from "../lib/ProjectTrack";
import { MidiClip } from "./MidiClip";
import { MidiInstrument } from "./MidiInstrument";
import { LinkedArray } from "../lib/state/LinkedArray";

import { PianoRollModule, PianoRollNode } from "../wam/pianorollme/PianoRollNode";

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
  pianoRollDom: Element;
  clips: LinkedArray<MidiClip>;

  private constructor(
    name: string,
    pianoRoll: WebAudioModule<PianoRollNode>,
    pianoRollDom: Element,
    instrument: MidiInstrument,
    clips: MidiClip[],
  ) {
    super("midi track", [], CLIP_HEIGHT);
    this.pianoRoll = pianoRoll as any;
    console.log((this.pianoRoll as PianoRollModule).sequencer.setState(SAMPLE_STATE));
    this.pianoRollDom = pianoRollDom;
    this.instrument = instrument;
    this.clips = LinkedArray.create(clips);

    // todo: output node?
    instrument.module.audioNode.connect(this._hiddenGainNode.inputNode());
    // gain.connect(liveAudioContext.destination);
    instrument.module.audioNode.connect(pianoRoll.audioNode);
    pianoRoll.audioNode.connectEvents(instrument.module.instanceId);
  }

  public createBlankMidiClip() {
    const newClip = new MidiClip("new midi clip", 30);
    this.clips.push(newClip);
  }

  static async createWithInstrument(instrument: MidiInstrument, name: string, clips?: MidiClip[]) {
    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const pianoRollPlugin = nullthrows(appEnvironment.wamPlugins.get(PIANO_ROLL_PLUGIN_URL), "Piano Roll not found!");
    // const pianoRoll = await pianoRollPlugin.import.createInstance(groupId, liveAudioContext);
    const pianoRoll = await PianoRollModule.createInstance<PianoRollNode>(groupId, liveAudioContext);

    const pianoRollDom = await pianoRoll.createGui();
    return new MidiTrack(name, pianoRoll as any, pianoRollDom, instrument, clips ?? []);
  }

  override prepareForPlayback(context: AudioContext): void {
    // nothing to do
  }

  override startPlayback(tempo: number, offset?: number | undefined): void {
    // todo
    this.pianoRoll.audioNode.scheduleEvents({
      type: "wam-transport",
      data: {
        playing: true,
        timeSigDenominator: 4,
        timeSigNumerator: 4,
        currentBar: 0,
        currentBarStarted: liveAudioContext.currentTime,
        tempo: tempo,
      },
    });
    console.log("here");
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
