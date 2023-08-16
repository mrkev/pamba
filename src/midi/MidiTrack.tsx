import type { WamNode, WebAudioModule } from "@webaudiomodules/api";
import { CLIP_HEIGHT, PIANO_ROLL_PLUGIN_URL, liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import nullthrows from "../utils/nullthrows";
import { ProjectTrack } from "../lib/ProjectTrack";
import { MidiClip } from "./MidiClip";
import { MidiInstrument } from "./MidiInstrument";

export class MidiTrack extends ProjectTrack {
  override effectId: string = "MIDI TRACK TODO";
  instrument: MidiInstrument;
  pianoRoll: WebAudioModule<WamNode>;
  pianoRollDom: Element;

  _hidden_setIsMutedByApplication() {
    console.log("FOO BAR _hidden_setIsMutedByApplication");
  }

  private constructor(
    pianoRoll: WebAudioModule<WamNode>,
    pianoRollDom: Element,
    instrument: MidiInstrument,
    clips: MidiClip[]
  ) {
    super("midi track", [], CLIP_HEIGHT);
    this.pianoRoll = pianoRoll;
    this.pianoRollDom = pianoRollDom;
    this.instrument = instrument;
  }

  static async createWithInstrument(instrument: MidiInstrument) {
    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const pianoRollPlugin = nullthrows(appEnvironment.wamPlugins.get(PIANO_ROLL_PLUGIN_URL), "Piano Roll not found!");
    const pianoRoll = await pianoRollPlugin.import.createInstance(groupId, liveAudioContext);
    const pianoRollDom = await pianoRoll.createGui();
    return new MidiTrack(pianoRoll, pianoRollDom, instrument, []);
  }
}
