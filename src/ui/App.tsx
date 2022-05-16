import React, { useEffect, useState } from "react";
import { AnalizedPlayer } from "../AnalizedPlayer";
import "./App.css";
import { DebugData } from "./DebugData";
import { usePambaFirebaseStoreRef } from "../firebase/useFirebase";
import { AudioProject, AudioRenderer } from "../lib/AudioProject";
import { modifierState, useSingletonKeyboardModifierState } from "../ModifierState";
import { TimelineView } from "./TimelineView";
import { ToolHeader } from "./ToolHeader";
import { useAppProjectKeyboardEvents } from "../useAppProjectKeyboardEvents";
// /* eslint-disable import/no-webpack-loader-syntax */
// // @ts-ignore
// import Worker from "worker-loader!./../wrk/myworker.js";

// // ...
// const myWorker = new Worker();

function App() {
  const firebaseStoreRef = usePambaFirebaseStoreRef();
  const [player] = useState<AnalizedPlayer>(() => new AnalizedPlayer());
  const [project] = useState(() => new AudioProject());
  // IDEA: Maybe merge player and renderer?
  const [renderer] = useState(() => new AudioRenderer());

  (window as any).project = project;

  useSingletonKeyboardModifierState(modifierState);
  useAppProjectKeyboardEvents(project, player, renderer);

  useEffect(() => {
    return () => player.stopSound();
  }, [player]);

  return (
    <>
      <div className="App">
        {/* <button
          onClick={() => {
            console.log("TEST WORKER");
            var w = new Worker("myworker.js");
            w.postMessage("hi"); // send "hi" to the worker
            w.onmessage = function (ev) {
              console.log(ev.data); // prints "ho"
            };
          }}
        >
          test
        </button> */}
        <ToolHeader project={project} player={player} firebaseStoreRef={firebaseStoreRef} renderer={renderer} />
        <TimelineView project={project} player={player} />
      </div>
      <DebugData project={project} />
    </>
  );
}

export default App;
