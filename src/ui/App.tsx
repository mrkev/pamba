import React, { useEffect, useRef, useState } from "react";
import { AnalizedPlayer } from "../AnalizedPlayer";
import "./App.css";
import { DebugData } from "./DebugData";
import { usePambaFirebaseStoreRef } from "../firebase/useFirebase";
import { AudioProject, AudioRenderer } from "../lib/AudioProject";
import { useLinkedArray } from "../lib/LinkedArray";
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
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const firebaseStoreRef = usePambaFirebaseStoreRef();
  const [player] = useState<AnalizedPlayer>(() => new AnalizedPlayer());
  const [project] = useState(() => new AudioProject());
  // Maybe merge player and renderer?
  const [renderer] = useState(() => new AudioRenderer());

  (window as any).project = project;

  const [tracks] = useLinkedArray(project.allTracks);

  const [isAudioPlaying] = useState(false);

  // const togglePlayback = useCallback(
  //   function togglePlayback() {
  //     if (isAudioPlaying) {
  //       player.stopSound();
  //       setIsAudioPlaying(false);
  //     } else {
  //       setIsAudioPlaying(true);
  //     }
  //   },
  //   [isAudioPlaying, player]
  // );

  useSingletonKeyboardModifierState(modifierState);
  useAppProjectKeyboardEvents(project, player, renderer);

  useEffect(() => {
    // if (tracks.length < 1) {
    //   console.log("NO AUDIO BUFFER");
    //   return;
    // }
    // if (isAudioPlaying === false) {
    //   return;
    // }
    // if (isAudioPlaying === true) {
    //   player.playTracks(tracks._getRaw());
    // }

    return () => player.stopSound();
  }, [tracks, isAudioPlaying, player, project.solodTracks]);

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
        <ToolHeader
          project={project}
          player={player}
          firebaseStoreRef={firebaseStoreRef}
          ctxRef={ctxRef}
          renderer={renderer}
        />
        <TimelineView project={project} player={player} />
      </div>
      <DebugData project={project} />
    </>
  );
}

export default App;
