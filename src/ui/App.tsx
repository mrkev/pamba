import React, { useEffect } from "react";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { useLinkedState } from "../lib/state/LinkedState";
import { ignorePromise } from "../utils/ignorePromise";
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
  const [projectStatus, setProjectStatus] = useLinkedState(appEnvironment.projectStatus);

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
