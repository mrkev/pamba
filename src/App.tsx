import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnalizedPlayer } from "./AnalizedPlayer";
import "./App.css";
import { DebugData } from "./DebugData";
import { usePambaFirebaseStoreRef } from "./firebase/useFirebase";
import { AudioProject, AudioRenderer } from "./lib/AudioProject";
import { useLinkedArray } from "./lib/LinkedArray";
import { useLinkedState } from "./lib/LinkedState";
import { modifierState, useSingletonKeyboardModifierState } from "./ModifierState";
import { TimelineView } from "./TimelineView";
import { ToolHeader } from "./ToolHeader";
import { useAppProjectKeyboardEvents } from "./useAppProjectKeyboardEvents";

function App() {
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const firebaseStoreRef = usePambaFirebaseStoreRef();
  const [player] = useState<AnalizedPlayer>(() => new AnalizedPlayer());
  const [project] = useState(() => new AudioProject());
  // Maybe merge player and renderer?
  const [renderer] = useState(() => new AudioRenderer());

  (window as any).project = project;

  useSingletonKeyboardModifierState(modifierState);
  const [cursorPos] = useLinkedState(project.cursorPos);

  const [tracks] = useLinkedArray(project.allTracks);

  const togglePlayback = useCallback(
    function togglePlayback() {
      if (isAudioPlaying) {
        player.stopSound();
        setIsAudioPlaying(false);
      } else {
        setIsAudioPlaying(true);
      }
    },
    [isAudioPlaying, player]
  );

  useAppProjectKeyboardEvents(project, togglePlayback);

  useEffect(() => {
    player.setCursorPos(cursorPos);
  }, [cursorPos, player]);

  useEffect(() => {
    if (tracks.length < 1) {
      console.log("NO AUDIO BUFFER");
      return;
    }
    if (isAudioPlaying === false) {
      return;
    }
    if (isAudioPlaying === true) {
      player.playTracks(tracks._getRaw());
    }

    return () => player.stopSound();
  }, [tracks, isAudioPlaying, player, project.solodTracks]);

  return (
    <>
      <div className="App">
        <ToolHeader
          project={project}
          player={player}
          togglePlayback={togglePlayback}
          isAudioPlaying={isAudioPlaying}
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
