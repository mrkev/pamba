import React, { useEffect } from "react";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { AudioProject } from "../lib/project/AudioProject";
import { SPrimitive, useLinkedState } from "../lib/state/LinkedState";
import { ignorePromise } from "../utils/ignorePromise";
// import { TrackThread } from "../lib/TrackThread";
// import { MidiDemo } from "../midi";
import { exhaustive } from "../utils/exhaustive";
import { AppProject } from "./AppProject";

// var w = new TrackThread();
// var sab = new SharedArrayBuffer(1024);
// var arr = new Int32Array(sab);
// w.postMessage({ kind: "set", sab });

type ProjectState = { status: "loading" } | { status: "loaded"; project: AudioProject };

export const appProjectStatus = SPrimitive.of<ProjectState>(
  ProjectPersistance.hasSavedData()
    ? { status: "loading" }
    : { status: "loaded", project: ProjectPersistance.defaultProject() }
);

export function App(): React.ReactElement {
  const [projectStatus, setProjectStatus] = useLinkedState(appProjectStatus);

  useEffect(() => {
    ignorePromise(
      (async function doLoad() {
        if (projectStatus.status === "loading") {
          const maybeProject = await ProjectPersistance.openSaved();
          if (maybeProject == null) {
            alert("Could not open project. Clearing");
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
      (window as any).project = projectStatus.project;
      return <AppProject project={projectStatus.project} />;
    }
    default:
      exhaustive(projectStatus);
  }
}
