import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
// import App from "./App";

// import reportWebVitals from "./reportWebVitals";
import { liveAudioContext } from "./globals";

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

async function initAudioContext(audioContext: AudioContext) {
  await audioContext.audioWorklet.addModule("white-noise-processor.js");
  console.log("LOADED", "white-noise-processor.js");
  await audioContext.audioWorklet.addModule(
    "shared-buffer-worklet-processor.js"
  );
  console.log("LOADED", "shared-buffer-worklet-processor.js");
  await audioContext.audioWorklet.addModule("mix-down-processor.js");
  console.log("LOADED", "mix-down-processor.js");
}

async function init() {
  try {
    await initAudioContext(liveAudioContext);
    // We wait to load the app since some modules might import liveAudioContext
    const App = (await import("./App")).default;

    ReactDOM.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      document.getElementById("root")
    );
  } catch (e) {
    console.trace(e);
  }
}

init();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
