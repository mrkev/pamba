import ParamMgrFactory from "../../packages/sdk-parammgr/src/ParamMgrFactory.js";
import CompositeAudioNode from "../../packages/sdk-parammgr/src/CompositeAudioNode.js";
import KeyboardUI from "./KeyboardUI.js";
import { WebAudioModule } from "@webaudiomodules/api";

const getBasetUrl = (relativeURL: URL): string => {
  const baseURL = relativeURL.href.substring(0, relativeURL.href.lastIndexOf("/"));
  return baseURL;
};

class Node extends CompositeAudioNode {
  /**
   * @param {import('../sdk-parammgr').ParamMgrNode} paramMgr
   */
  setup(paramMgr: any) {
    this._wamNode = paramMgr;
    this._output = paramMgr;
  }
}

export default class KeyboardPlugin extends WebAudioModule {
  _baseURL = getBasetUrl(new URL(".", import.meta.url));

  _descriptorUrl = `${this._baseURL}/descriptor.json`;

  async _loadDescriptor() {
    const url = this._descriptorUrl;
    if (!url) throw new TypeError("Descriptor not found");
    const response = await fetch(url);
    const descriptor = await response.json();
    Object.assign(this.descriptor, descriptor);
  }

  override async initialize(state: any) {
    await this._loadDescriptor();
    return super.initialize(state);
  }

  override async createAudioNode(initialState: any) {
    const paramMgrNode = await ParamMgrFactory.create(this, {});
    const node = new Node(this.audioContext);
    node.setup(paramMgrNode);

    // If there is an initial state at construction for this plugin,
    if (initialState) {
      await node.setState(initialState);
    }

    node.connect(this.audioContext.destination);

    return node;
  }

  override async createGui() {
    const keyboard = new KeyboardUI();
    keyboard.onMidi = (bytes: any) =>
      (this.audioNode as any)?._wamNode.emitEvents({
        type: "wam-midi",
        time: this.audioContext.currentTime,
        data: { bytes },
      });
    return keyboard;
  }
}
