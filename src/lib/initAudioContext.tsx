// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import MixDownProcessorURL from "../worker/mix-down-processor?url";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import SharedBufferWrokletURL from "../worker/shared-buffer-worklet-processor?url";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import WhiteNoiseProcessorURL from "../worker/white-noise-processor?url";

const URL = "https://www.webaudiomodules.com/sdk/2.0.0-alpha.6/src/initializeWamHost.js";

// import WorkletDemoBuilder from "../../assets/WorkletDemoBuilder.js";
// const demoCode = async (context, logger) => {
//   // Import the pre-defined AudioWorkletNode subclass dynamically. This
//   // is invoked only when Audio Worklet is detected.
//   const { default: SharedBufferWorkletNode } = await import(
//     "./shared-buffer-worklet-node.js"
//   );
//   await context.audioWorklet.addModule("shared-buffer-worklet-processor.js");
//   const oscillator = new OscillatorNode(context);
//   const sbwNode = new SharedBufferWorkletNode(context);
//   sbwNode.onInitialized = () => {
//     oscillator.connect(sbwNode).connect(context.destination);
//     oscillator.start();
//   };
//   sbwNode.onError = (errorData) => {
//     logger.post("[ERROR] " + errorData.detail);
//   };
// };
// WorkletDemoBuilder(PageData, demoCode);

export type AudioContextInfo = Readonly<{
  wamHostGroup: [id: string, key: string];
}>;

export async function initAudioContext(audioContext: BaseAudioContext): Promise<AudioContextInfo> {
  await audioContext.audioWorklet.addModule(WhiteNoiseProcessorURL);
  console.log("LOADED", WhiteNoiseProcessorURL);
  await audioContext.audioWorklet.addModule(SharedBufferWrokletURL);
  console.log("LOADED", "shared-buffer-worklet-processor.js");
  await audioContext.audioWorklet.addModule(MixDownProcessorURL);
  console.log("LOADED", "mix-down-processor.js");
  // TODO:
  const { default: initializeWamHost } = await import(URL);
  const [hostGroupId, hostGroupKey] = await initializeWamHost(audioContext);
  console.log("INITIALIZED", "wamHost", hostGroupId, hostGroupKey);
  return {
    wamHostGroup: [hostGroupId, hostGroupKey],
  };
}
