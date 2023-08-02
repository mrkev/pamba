import type { WamNode, WebAudioModule } from "@webaudiomodules/api";
import { liveAudioContext } from "../constants";
import { appEnvironment, AppEnvironment } from "../lib/AppEnvironment";
import nullthrows, { assert } from "../utils/nullthrows";
import { DSPNode } from "../dsp/DSPNode";
import { SPrimitive } from "../lib/state/LinkedState";

export class MidiInstrument extends DSPNode<null> {
  override effectId: string;
  override name: string | SPrimitive<string>;

  // WAM
  readonly module: WebAudioModule<WamNode>;

  override inputNode(): null {
    return null;
  }
  override outputNode(): AudioNode | DSPNode<AudioNode> {
    return this.module.audioNode;
  }

  constructor(module: WebAudioModule<WamNode>) {
    super();
    this.module = module;
    this.effectId = this.module.moduleId;
    this.name = this.module.descriptor.name;
  }

  static async createFromUrl(pluginUrl: string) {
    console.log(pluginUrl, appEnvironment.wamPlugins);
    const plugin = nullthrows(appEnvironment.wamPlugins.get(pluginUrl));
    assert(plugin.kind === "m-a", "plugin is not an instrument");

    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const module = await plugin.import.createInstance(groupId, liveAudioContext);
    return new MidiInstrument(module);
  }

  override cloneToOfflineContext(
    _context: OfflineAudioContext,
    _offlineContextInfo: Readonly<{ wamHostGroup: [id: string, key: string] }>
  ): Promise<DSPNode<AudioNode> | null> {
    throw new Error("Method not implemented.");
  }
}

class MidiClip {}

export class MidiTrack {
  clips: MidiClip[];
  instrument: MidiInstrument;
  pianoRoll: WebAudioModule<WamNode>;
  pianoRollDom: Element;

  private constructor(pianoRoll: WebAudioModule<WamNode>, pianoRollDom: Element, instrument: MidiInstrument) {
    this.pianoRoll = pianoRoll;
    this.pianoRollDom = pianoRollDom;
    this.instrument = instrument;
    this.clips = [];
  }

  static async createWithInstrument(instrument: MidiInstrument) {
    const [groupId] = nullthrows(appEnvironment.wamHostGroup.get());

    const pianoRollPlugin = nullthrows(
      appEnvironment.wamPlugins.get(AppEnvironment.PIANO_ROLL_PLUGIN_URL),
      "Piano Roll not found!"
    );

    const pianoRoll = await pianoRollPlugin.import.createInstance(groupId, liveAudioContext);
    const pianoRollDom = await pianoRoll.createGui();
    return new MidiTrack(pianoRoll, pianoRollDom, instrument);
  }
}
