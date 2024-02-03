import React from "react";
import { createRoot } from "react-dom/client";
import { liveAudioContext } from "./constants";
// import "./font.scss";
import "./index.css";
import { appEnvironment } from "./lib/AppEnvironment";
import { App } from "./ui/App";
import { ignorePromise } from "./utils/ignorePromise";
import { nullthrows } from "./utils/nullthrows";

async function init() {
  const root = createRoot(nullthrows(document.getElementById("root")));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  try {
    await wait(1);
    await appEnvironment.initAsync(liveAudioContext());
  } catch (e) {
    console.trace(e);
  }
}

ignorePromise(init());

async function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
