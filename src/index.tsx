import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { liveAudioContext } from "./constants";
import { initAudioContext } from "./lib/initAudioContext";
import nullthrows from "./utils/nullthrows";
import { ignorePromise } from "./utils/ignorePromise";

async function init() {
  try {
    await initAudioContext(liveAudioContext);
    // We wait to load the app since some modules might import liveAudioContext
    const App = (await import("./ui/App")).default;
    const root = createRoot(nullthrows(document.getElementById("root")));
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.trace(e);
  }
}

ignorePromise(init());

// import reportWebVitals from "./reportWebVitals";
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
