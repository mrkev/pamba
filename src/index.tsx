import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// import App from "./App";

// import reportWebVitals from "./reportWebVitals";
import { liveAudioContext } from "./globals";
import { initAudioContext } from "./lib/initAudioContext";
import nullthrows from "./lib/nullthrows";

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

init();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
