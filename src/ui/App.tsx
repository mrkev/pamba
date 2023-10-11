import React from "react";
import { useLinkedState } from "../lib/state/LinkedState";
// import { TrackThread } from "../lib/TrackThread";
// import { MidiDemo } from "../midi";
import { appEnvironment } from "../lib/AppEnvironment";
import { exhaustive } from "../utils/exhaustive";
import { AppProject } from "./AppProject";
import { DebugData } from "./DebugData";
import { MidiDemo } from "../midi";

// var w = new TrackThread();
// var sab = new SharedArrayBuffer(1024);
// var arr = new Int32Array(sab);
// w.postMessage({ kind: "set", sab });

export function App(): React.ReactElement {
  const [projectStatus] = useLinkedState(appEnvironment.projectStatus);

  switch (projectStatus.status) {
    case "loading": {
      return <div>Loading...</div>;
    }
    case "loaded": {
      (window as any).project = projectStatus.project;
      return (
        <>
          {/* <MidiDemo /> */}
          <AppProject project={projectStatus.project} />
          <DebugData project={projectStatus.project} />
        </>
      );
    }
    default:
      exhaustive(projectStatus);
  }
}
