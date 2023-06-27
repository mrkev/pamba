import { WamNode as IWamNode, WebAudioModule as IWebAudioModule } from "@webaudiomodules/api";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { WebAudioModule } from "../../packages/sdk/dist";
import { liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { useLinkedMap } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { WindowPanel } from "./WindowPanel";
import { DSPNode } from "../dsp/DSPNode";

export type WAMImport = {
  prototype: WebAudioModule;
  createInstance<Node extends IWamNode = IWamNode>(
    groupId: string,
    audioContext: BaseAudioContext,
    initialState?: any
  ): Promise<WebAudioModule<Node>>;
  new <Node extends IWamNode = IWamNode>(groupId: string, audioContext: BaseAudioContext): WebAudioModule<Node>;
} & Pick<typeof IWebAudioModule, "isWebAudioModuleConstructor">;

const plugin1Url = "https://mainline.i3s.unice.fr/wam2/packages/StonePhaserStereo/index.js";
const plugin2Url = "https://mainline.i3s.unice.fr/wam2/packages/BigMuff/index.js";

function useAsyncState<T>(cb: () => Promise<T>): T | null {
  const [result, setResult] = useState<T | null>(null);

  useEffect(() => {
    let active = true;
    void load();
    return () => {
      active = false;
    };

    async function load() {
      setResult(null);
      const res = await cb();
      if (!active) {
        return;
      }
      setResult(res);
    }
  }, [cb]);

  return result;
}

export class PambaWamNode extends DSPNode {
  override name: string;
  override inputNode(): AudioNode {
    return this.module.audioNode;
  }
  override outputNode(): AudioNode | DSPNode<AudioNode> {
    return this.module.audioNode;
  }

  override effectId: string;
  readonly module: WebAudioModule<IWamNode>;
  readonly dom: Element;

  public destroy() {
    this.module.destroyGui(this.dom);
  }

  private constructor(module: WebAudioModule<IWamNode>, dom: Element) {
    super();
    this.module = module;
    this.dom = dom;
    this.effectId = this.module.moduleId;
    this.name = this.module.descriptor.name;
  }

  static async fromURL(plugin1Url: string, hostGroupId: string, audioCtx: AudioContext) {
    console.log("WAM: LOADING fromURL", plugin1Url);
    const rawModule = await import(/* @vite-ignore */ plugin1Url);
    if (rawModule == null) {
      console.error("could not import", rawModule);
      return null;
    }
    const WAM1: WAMImport = rawModule.default;
    let pluginInstance1 = await WAM1.createInstance(hostGroupId, audioCtx);
    let pluginDom1 = await pluginInstance1.createGui();
    return new PambaWamNode(pluginInstance1, pluginDom1);
  }

  static async fromImport(wamImport: WAMImport, hostGroupId: string, audioCtx: AudioContext) {
    let pluginInstance1 = await wamImport.createInstance(hostGroupId, audioCtx);
    let pluginDom1 = await pluginInstance1.createGui();
    return new PambaWamNode(pluginInstance1, pluginDom1);
  }

  override cloneToOfflineContext(_context: OfflineAudioContext): Promise<DSPNode<AudioNode> | null> {
    throw new Error("PambaWamNode: cloneToOfflineContext: Method not implemented.");
  }
}

function usePambaWam(wamImport: WAMImport | null, hostGroupId: string | null) {
  const pambaWam = useAsyncState(
    useCallback(async () => {
      if (hostGroupId == null || wamImport == null) {
        return null;
      }
      const module = await PambaWamNode.fromImport(wamImport, hostGroupId, liveAudioContext);
      return module;
    }, [hostGroupId, wamImport])
  );

  return pambaWam;
}

function useWamHostGroup() {
  const [wamHostGroup] = useLinkedState(appEnvironment.wamHostGroup);
  return wamHostGroup ? wamHostGroup[0] : null;
}

export const WamPluginContent = React.memo(function WamPluginContentImpl({ wam }: { wam: PambaWamNode }) {
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const div = divRef.current;
    div?.appendChild(wam.dom);
    return () => {
      div?.removeChild(wam.dom);
    };
  }, [wam.dom]);
  return <div ref={divRef} />;
});

export function Demo() {
  const [audioCtx] = useState(liveAudioContext);
  const [node] = useState(createWhiteNoise(audioCtx));
  const hostGroupId = useWamHostGroup();
  const [wams] = useLinkedMap(appEnvironment.wamPlugins);
  const wam1 = usePambaWam(wams.get(plugin1Url) ?? null, hostGroupId);
  const wam2 = usePambaWam(wams.get(plugin2Url) ?? null, hostGroupId);

  if (hostGroupId === null) {
    return null;
  }
  return (
    <>
      <button
        onClick={() => {
          if (wam1 == null || wam2 == null) {
            return;
          }
          node.connect(wam1.module._audioNode).connect(wam2.module._audioNode).connect(audioCtx.destination);
          node.start();
        }}
      >
        acutal start
      </button>
      {/* {wam1 && (
        <WindowPanel>
          <WamPluginContent wam={wam1} />
        </WindowPanel>
      )}
      {wam2 && (
        <WindowPanel>
          <WamPluginContent wam={wam2} />
        </WindowPanel>
      )} */}
    </>
  );
}

function createWhiteNoise(audioCtx: AudioContext) {
  // Create an empty three-second stereo buffer at the sample rate of the AudioContext
  const myArrayBuffer = audioCtx.createBuffer(2, audioCtx.sampleRate * 3, audioCtx.sampleRate);

  // Fill the buffer with white noise;
  //just random values between -1.0 and 1.0
  for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
    // This gives us the actual ArrayBuffer that contains the data
    const nowBuffering = myArrayBuffer.getChannelData(channel);
    for (let i = 0; i < myArrayBuffer.length; i++) {
      // Math.random() is in [0; 1.0]
      // audio needs to be in [-1.0; 1.0]
      nowBuffering[i] = Math.random() * 2 - 1;
    }
  }

  // Get an AudioBufferSourceNode.
  // This is the AudioNode to use when we want to play an AudioBuffer
  const source = audioCtx.createBufferSource();
  // set the buffer in the AudioBufferSourceNode
  source.buffer = myArrayBuffer;
  source.loop = true;
  // // connect the AudioBufferSourceNode to the
  // // destination so we can hear the sound
  // source.connect(audioCtx.destination);
  // // start the source playing
  // source.start();
  return source;
}
