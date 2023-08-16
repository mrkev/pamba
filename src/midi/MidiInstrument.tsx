import type { WamNode, WebAudioModule } from "@webaudiomodules/api";
import { liveAudioContext } from "../constants";
import { DSPNode } from "../dsp/DSPNode";
import { appEnvironment } from "../lib/AppEnvironment";
import { SPrimitive } from "../lib/state/LinkedState";
import nullthrows, { assert } from "../utils/nullthrows";

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
