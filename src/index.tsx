import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./ui/App";
import { nullthrows } from "./utils/nullthrows";
import { appEnvironment } from "./lib/AppEnvironment";
import { liveAudioContext } from "./constants";
import { BrowserRouter, Route, Routes } from "react-router";

// initialize early
void appEnvironment.initAsync(liveAudioContext());

const root = createRoot(nullthrows(document.getElementById("root")));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<div>404</div>} />
        <Route path="/" element={<App />} />
        <Route path="/mini/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
