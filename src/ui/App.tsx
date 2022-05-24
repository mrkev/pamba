import React, { useEffect, useState } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import "./App.css";
import { DebugData } from "./DebugData";
import { usePambaFirebaseStoreRef } from "../firebase/useFirebase";
import { AudioProject } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { modifierState, useSingletonKeyboardModifierState } from "../ModifierState";
import { TimelineView } from "./TimelineView";
import { ToolHeader } from "./ToolHeader";
import { useAppProjectKeyboardEvents } from "../input/useAppProjectKeyboardEvents";
// import { TrackThread } from "../lib/TrackThread";

// var w = new TrackThread();
// var sab = new SharedArrayBuffer(1024);
// var arr = new Int32Array(sab);
// w.postMessage({ kind: "set", sab });

function App() {
  const firebaseStoreRef = usePambaFirebaseStoreRef();
  const [project] = useState(() => new AudioProject());
  // IDEA: Maybe merge player and renderer?
  const [renderer] = useState(() => new AudioRenderer(new AnalizedPlayer()));

  (window as any).project = project;

  useSingletonKeyboardModifierState(modifierState);
  useAppProjectKeyboardEvents(project, renderer.analizedPlayer, renderer);

  useEffect(() => {
    return () => {
      if (renderer.analizedPlayer.isAudioPlaying) {
        renderer.analizedPlayer.stopSound();
      }
    };
  }, [renderer.analizedPlayer]);

  return (
    <>
      <div className="App">
        {/* <button
          onClick={() => {
            arr[1] = 329;
            console.log("TEST WORKER");
            w.postMessage({ kind: "log" });
          }}
        >
          test
        </button> */}
        <ToolHeader
          project={project}
          player={renderer.analizedPlayer}
          firebaseStoreRef={firebaseStoreRef}
          renderer={renderer}
        />
        <TimelineView project={project} player={renderer.analizedPlayer} renderer={renderer} />
      </div>
      <DebugData project={project} />
    </>
  );
}

export default App;
