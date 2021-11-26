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
export async function initAudioContext(audioContext: BaseAudioContext) {
  await audioContext.audioWorklet.addModule("white-noise-processor.js");
  console.log("LOADED", "white-noise-processor.js");
  await audioContext.audioWorklet.addModule(
    "shared-buffer-worklet-processor.js"
  );
  console.log("LOADED", "shared-buffer-worklet-processor.js");
  await audioContext.audioWorklet.addModule("mix-down-processor.js");
  console.log("LOADED", "mix-down-processor.js");
}
