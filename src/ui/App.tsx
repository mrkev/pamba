import React, { useEffect, useState } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { DebugData } from "./DebugData";
import { usePambaFirebaseStoreRef } from "../firebase/useFirebase";
import { AudioProject, ProjectPersistance } from "../lib/AudioProject";
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

type ProjectState =
  | {
      status: "loading";
    }
  | { status: "loaded"; project: AudioProject };

function App(): React.ReactElement {
  const [projectStatus, setProjectStatus] = useState<ProjectState>(() => {
    if (ProjectPersistance.hasSavedData()) {
      return { status: "loading" };
    } else {
      const project = ProjectPersistance.defaultProject();
      return { status: "loaded", project };
    }
  });

  useEffect(() => {
    (async function doLoad() {
      if (projectStatus.status === "loading") {
        const maybeProject = await ProjectPersistance.openSaved();
        if (maybeProject == null) {
          ProjectPersistance.clearSaved();
          setProjectStatus({ status: "loaded", project: ProjectPersistance.defaultProject() });
        } else {
          setProjectStatus({ status: "loaded", project: maybeProject });
        }
      }
    })();
  }, [projectStatus.status]);

  switch (projectStatus.status) {
    case "loading": {
      return <div>Loading...</div>;
    }
    case "loaded": {
      return <AppProject project={projectStatus.project} />;
    }
  }
}

function AppProject({ project }: { project: AudioProject }) {
  const firebaseStoreRef = usePambaFirebaseStoreRef();

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
      <DebugData project={project} />
    </>
  );
}

export default App;
