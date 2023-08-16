import type { WamNode, WebAudioModule } from "@webaudiomodules/api";
import { CLIP_HEIGHT, PIANO_ROLL_PLUGIN_URL, liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import nullthrows from "../utils/nullthrows";
import { ProjectTrack } from "../lib/ProjectTrack";
import { MidiClip } from "./MidiClip";
import { MidiInstrument } from "./MidiInstrument";
import { LinkedArray } from "../lib/state/LinkedArray";

export class MidiTrack extends ProjectTrack {
  override effectId: string = "MIDI TRACK TODO";
  instrument: MidiInstrument;
  pianoRoll: WebAudioModule<WamNode>;
  pianoRollDom: Element;
  clips: LinkedArray<MidiClip>;

  private constructor(
    name: string,
    pianoRoll: WebAudioModule<WamNode>,
    pianoRollDom: Element,
    instrument: MidiInstrument,
    clips: MidiClip[]
  ) {
    super("midi track", [], CLIP_HEIGHT);
    this.pianoRoll = pianoRoll;
    this.pianoRollDom = pianoRollDom;
    this.instrument = instrument;
    this.clips = LinkedArray.create(clips);
  }

  public createBlankMidiClip() {
    const newClip = new MidiClip("new midi clip", 30);
    this.clips.push(newClip);
  }

  static async createWithInstrument(instrument: MidiInstrument, name: string, clips?: MidiClip[]) {
    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const pianoRollPlugin = nullthrows(appEnvironment.wamPlugins.get(PIANO_ROLL_PLUGIN_URL), "Piano Roll not found!");
    const pianoRoll = await pianoRollPlugin.import.createInstance(groupId, liveAudioContext);
    const pianoRollDom = await pianoRoll.createGui();
    return new MidiTrack(name, pianoRoll, pianoRollDom, instrument, clips ?? []);
  }

  override toString() {
    return this.clips
      ._getRaw()
      .map((c) => c.toString())
      .join("\n");
  }
}
