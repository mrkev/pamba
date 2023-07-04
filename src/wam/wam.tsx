import { WamNode as IWamNode, WebAudioModule as IWebAudioModule } from "@webaudiomodules/api";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { WebAudioModule } from "../../packages/sdk/dist";
import { liveAudioContext } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { useLinkedMap } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { WindowPanel } from "./WindowPanel";
import { PambaWamNode } from "./PambaWamNode";

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
    console.log("HERE");
    return () => {
      div?.removeChild(wam.dom);
      wam.destroy();
      console.log("THERE");
    };
  }, [wam, wam.dom]);
  return <div ref={divRef} />;
});

export function Demo() {
  const [audioCtx] = useState(liveAudioContext);
  const [node] = useState(createWhiteNoise(audioCtx));
  const hostGroupId = useWamHostGroup();
  const [wams] = useLinkedMap(appEnvironment.wamPlugins);
  const wam1 = usePambaWam(wams.get(plugin1Url)?.import ?? null, hostGroupId);
  const wam2 = usePambaWam(wams.get(plugin2Url)?.import ?? null, hostGroupId);

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
