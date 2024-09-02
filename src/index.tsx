import React from "react";
import { createRoot } from "react-dom/client";
import { liveAudioContext } from "./constants";
// import "./font.scss";
import "./index.css";
import { appEnvironment } from "./lib/AppEnvironment";
import { App } from "./ui/App";
import { ignorePromise } from "./utils/ignorePromise";
import { nullthrows } from "./utils/nullthrows";

const root = createRoot(nullthrows(document.getElementById("root")));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
