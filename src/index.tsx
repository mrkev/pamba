import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { liveAudioContext } from "./constants";
import "./index.css";
import { appEnvironment } from "./lib/AppEnvironment";
import { App } from "./ui/App";
import "./ui/utility.css";
import { nullthrows } from "./utils/nullthrows";

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
        <Route path="/midi/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
