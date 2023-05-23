import React, { useEffect, useState } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { DebugData } from "./DebugData";
import { usePambaFirebaseStoreRef } from "../firebase/useFirebase";
import { AudioProject } from "../lib/AudioProject";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { AudioRenderer } from "../lib/AudioRenderer";
import { modifierState, useSingletonKeyboardModifierState } from "../ModifierState";
import { TimelineView } from "./TimelineView";
import { Library, ToolHeader } from "./ToolHeader";
import { useAppProjectKeyboardEvents } from "../input/useAppProjectKeyboardEvents";
import { ignorePromise } from "../utils/ignorePromise";
import { SPrimitive, useLinkedState } from "../lib/state/LinkedState";
// import { TrackThread } from "../lib/TrackThread";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

// var w = new TrackThread();
// var sab = new SharedArrayBuffer(1024);
// var arr = new Int32Array(sab);
// w.postMessage({ kind: "set", sab });

type ProjectState =
  | {
      status: "loading";
    }
  | { status: "loaded"; project: AudioProject };

export const appProjectStatus = SPrimitive.of<ProjectState>(
  ProjectPersistance.hasSavedData()
    ? { status: "loading" }
    : { status: "loaded", project: ProjectPersistance.defaultProject() }
);

function App(): React.ReactElement {
  const [projectStatus, setProjectStatus] = useLinkedState(appProjectStatus);

  useEffect(() => {
    ignorePromise(
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
      })()
    );
  }, [projectStatus.status, setProjectStatus]);

  switch (projectStatus.status) {
    case "loading": {
      return <div>Loading...</div>;
    }
    case "loaded": {
      return <AppProject project={projectStatus.project} />;
    }
  }
}

function useStopPlaybackOnUnmount(renderer: AudioRenderer) {
  useEffect(() => {
    return () => {
      if (renderer.analizedPlayer.isAudioPlaying) {
        renderer.analizedPlayer.stopSound();
      }
    };
  }, [renderer.analizedPlayer]);
}

function AppProject({ project }: { project: AudioProject }) {
  const firebaseStoreRef = usePambaFirebaseStoreRef();

  // IDEA: Maybe merge player and renderer?
  const [renderer] = useState(() => new AudioRenderer(new AnalizedPlayer()));

  (window as any).project = project;

  useSingletonKeyboardModifierState(modifierState);
  useAppProjectKeyboardEvents(project, renderer.analizedPlayer, renderer);
  useStopPlaybackOnUnmount(renderer);

  return (
    <>
      <ToolHeader
        project={project}
        player={renderer.analizedPlayer}
        firebaseStoreRef={firebaseStoreRef}
        renderer={renderer}
      />
      <PanelGroup direction="horizontal">
        <Panel collapsible={true} defaultSize={15} onCollapse={console.log}>
          <Library
            project={project}
            renderer={renderer}
            player={renderer.analizedPlayer}
            firebaseStoreRef={firebaseStoreRef}
          />
        </Panel>
        <PanelResizeHandle
          style={{
            width: 5,
          }}
        />
        <Panel>
          <TimelineView project={project} player={renderer.analizedPlayer} renderer={renderer} />
        </Panel>
      </PanelGroup>

      <DebugData project={project} />
    </>
  );
}

export default App;
