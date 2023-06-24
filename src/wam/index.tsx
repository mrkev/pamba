import { useEffect, useRef, useState } from "react";
import nullthrows from "../utils/nullthrows";
import React from "react";
import type { WebAudioModule } from "../../packages/sdk/dist";
import {
  WebAudioModule as IWebAudioModule,
  WamGroup as IWamGroup,
  WamEventType,
  WamBinaryData,
  WamEvent,
  WamMidiData,
  WamParameter,
  WamParameterMap,
  WamParameterData,
  WamParameterDataMap,
  WamParameterInfo,
  WamParameterInfoMap,
  WamProcessor as IWamProcessor,
  WamTransportData,
  WamNode as IWamNode,
  WamDescriptor,
} from "@webaudiomodules/api";
import { useLinkedState } from "../lib/state/LinkedState";
import { appEnvironment } from "../lib/AppEnvironment";
import { liveAudioContext } from "../constants";

export type WAMImport = {
  prototype: WebAudioModule;
  createInstance<Node extends IWamNode = IWamNode>(
    groupId: string,
    audioContext: BaseAudioContext,
    initialState?: any
  ): Promise<WebAudioModule<Node>>;
  new <Node extends IWamNode = IWamNode>(groupId: string, audioContext: BaseAudioContext): WebAudioModule<Node>;
} & Pick<typeof IWebAudioModule, "isWebAudioModuleConstructor">;

const audioUrl = "drums.mp3";
const plugin1Url = "https://mainline.i3s.unice.fr/wam2/packages/StonePhaserStereo/index.js";
const plugin2Url = "https://mainline.i3s.unice.fr/wam2/packages/BigMuff/index.js";

// const btnStart = document.getElementById("btn-start");
// const inputLoop = document.getElementById("input-loop");
// const waveCanvas = document.getElementById("canvas1");
// const playheadCanvas = document.getElementById("playhead");

// const btnStartDemo = document.getElementById("btn-start-demo");
// const demoDiv = document.getElementById("demo-div");
// const widgetLoadingDiv = document.getElementById("widget-loading");
// const loadingWheelDiv = document.getElementById("loading-wheel");

async function startDemo(audioCtx: AudioContext, node: AudioBufferSourceNode, hostGroupId: string) {
  // await audioCtx.suspend();

  // Import our custom WAM Processor and the plugins.
  // const { default: MyWam } = await import("./my-wam.js");
  const WAM1: WAMImport = (await import(plugin1Url)).default;
  const { default: WAM2 } = await import(plugin2Url);
  const { default: OperableAudioBuffer } = await import("./operable-audio-buffer.js");

  // Create an instance of our Processor. We can get from the instance the audio node.
  // let wamInstance = await MyWam.createInstance(hostGroupId, audioCtx);
  /** @type {import("./audio-player-node.js").default} */
  // let node = wamInstance.audioNode;

  const response = await fetch(audioUrl);
  const audioArrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);

  // Transforming the audio buffer into a custom audio buffer to add logic inside. (Needed to manipulate the audio, for example, editing...)
  const operableAudioBuffer = Object.setPrototypeOf(audioBuffer, OperableAudioBuffer.prototype);

  // Drawing the waveform in the canvas.
  // drawBuffer(waveCanvas, audioBuffer, "blue", 600, 100);
  // let playhead = new Playhead(playheadCanvas, waveCanvas, audioBuffer.length);

  // Creating the Instance of the WAM plugins.
  let pluginInstance1 = await WAM1.createInstance(hostGroupId, audioCtx);
  let pluginDom1 = await pluginInstance1.createGui();
  let pluginInstance2 = await WAM2.createInstance(hostGroupId, audioCtx);
  let pluginDom2 = await pluginInstance2.createGui();

  // Sending audio to the processor and connecting the node to the output destination.
  // node.setAudio(operableAudioBuffer.toArray());
  node.connect(pluginInstance1._audioNode).connect(pluginInstance2._audioNode).connect(audioCtx.destination);
  // node.parameters.get("playing").value = 0;
  // node.parameters.get("loop").value = 1;

  // Updating the play head position.
  // let curPos = 0;
  // node.port.onmessage = (ev) => {
  //   if (ev.data.playhead) {
  //     curPos = ev.data.playhead;
  //   }
  // };
  // setInterval(() => {
  //   if (audioCtx.state === "running") {
  //     playhead.update(curPos);
  //   }
  // }, 16);

  // Mounting the plugin dom to the html.
  let mount1 = nullthrows(document.querySelector("#mount1"));
  nullthrows(mount1).innerHTML = "";
  await mount1.appendChild(pluginDom1);

  let mount2 = nullthrows(document.querySelector("#mount2"));
  mount2.innerHTML = "";
  await mount2.appendChild(pluginDom2);

  // // Connecting host's logic of the page.
  // btnStart.onclick = () => {
  //   if (audioCtx.state === "suspended") audioCtx.resume();
  //   const playing = node.parameters.get("playing").value;
  //   if (playing === 1) {
  //     audioCtx.suspend();
  //     node.parameters.get("playing").value = 0;
  //     btnStart.textContent = "Start";
  //   } else {
  //     audioCtx.resume();
  //     node.parameters.get("playing").value = 1;
  //     btnStart.textContent = "Stop";
  //   }
  // };
}

export class PambaWam {
  readonly module: WebAudioModule<IWamNode>;
  readonly dom: Element;
  private constructor(module: WebAudioModule<IWamNode>, dom: Element) {
    this.module = module;
    this.dom = dom;
  }

  static async fromURL(plugin1Url: string, hostGroupId: string, audioCtx: AudioContext) {
    const WAM1: WAMImport = (await import(plugin1Url)).default;
    let pluginInstance1 = await WAM1.createInstance(hostGroupId, audioCtx);
    let pluginDom1 = await pluginInstance1.createGui();
    return new PambaWam(pluginInstance1, pluginDom1);
  }
}

function useWamHostGroup() {
  const [wamHostGroup] = useLinkedState(appEnvironment.wamHostGroup);
  return wamHostGroup ? wamHostGroup[0] : null;
}

export const WamPluginContent = React.memo(function WamPluginContentImpl({ wam }: { wam: PambaWam }) {
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    divRef.current?.appendChild(wam.dom);
  }, [wam.dom]);
  return <div ref={divRef} />;
});

export function Demo() {
  const [audioCtx] = useState(liveAudioContext);
  const [node] = useState(createWhiteNoise(audioCtx));
  const hostGroupId = useWamHostGroup();
  console.log("hostGroupId", hostGroupId);

  if (hostGroupId === null) {
    return null;
  }
  return (
    <>
      <button
        onClick={async () => {
          await startDemo(audioCtx, node, hostGroupId);
        }}
      >
        start demo
      </button>
      <button
        onClick={() => {
          node.start();
        }}
      >
        acutal start
      </button>
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
