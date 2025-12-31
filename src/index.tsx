import React from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import { liveAudioContext } from "./constants";
import "./index.css";
import { appEnvironment } from "./lib/AppEnvironment";
import { TestUtility } from "./screens/TestUtility";
import { App } from "./ui/App";
import "./ui/utility.css";
import { nullthrows } from "./utils/nullthrows";

// initialize early
void appEnvironment.initAsync(liveAudioContext());

const router = createHashRouter([
  {
    path: "/",
    children: [
      {
        index: true,
        element: <App />,
      },
      { path: "mini", element: <App /> },
      { path: "midi", element: <App /> },
      { path: "utility", element: <TestUtility /> },
    ],
  },
  {
    path: "*",
    element: <div>404</div>,
  },
]);

const root = createRoot(nullthrows(document.getElementById("root")));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />;
  </React.StrictMode>,
);
