import React from "react";
import { useLinkedState } from "../lib/state/LinkedState";
// import { TrackThread } from "../lib/TrackThread";
// import { MidiDemo } from "../midi";
import { appEnvironment } from "../lib/AppEnvironment";
import { exhaustive } from "../utils/exhaustive";
import { AppProject } from "./AppProject";
import { DebugData } from "./DebugData";
import { MidiDemo } from "../midi";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { PambaWamNodeWindowPanel } from "./PambaWamNodeWindowPanel";
import { PambaWamNode } from "../wam/PambaWamNode";
import { MidiInstrument } from "../midi/MidiInstrument";
import { test } from "../data/filesystem";

// var w = new TrackThread();
// var sab = new SharedArrayBuffer(1024);
// var arr = new Int32Array(sab);
// w.postMessage({ kind: "set", sab });

export function App(): React.ReactElement {
  const [projectStatus] = useLinkedState(appEnvironment.projectStatus);
  const [openEffects] = useLinkedSet(appEnvironment.openEffects);

  switch (projectStatus.status) {
    case "loading": {
      return <div>Loading...</div>;
    }
    case "loaded": {
      (window as any).project = projectStatus.project;
      return (
        <>
          {/* RENDER WAM WINDOWS OUT HERE */}
          {[...openEffects.values()].map((effect, i) => {
            if (effect instanceof PambaWamNode) {
              return <PambaWamNodeWindowPanel key={i} effect={effect} onClose={() => openEffects.delete(effect)} />;
            }
            if (effect instanceof MidiInstrument) {
              return <PambaWamNodeWindowPanel key={i} effect={effect} onClose={() => openEffects.delete(effect)} />;
            }

            return null;
          })}
          {/* <MidiDemo /> */}
          <AppProject project={projectStatus.project} />
          <DebugData project={projectStatus.project} />
          <button onClick={() => test()}>fooobar</button>
        </>
      );
    }
    default:
      exhaustive(projectStatus);
  }
}
