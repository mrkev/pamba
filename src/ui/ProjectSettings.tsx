import { useEffect, useMemo, useState } from "react";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { niceBytes } from "../data/localFilesystem";

let STATUS_PENDING = { status: "pending" } as const;

type AsyncResult<T> = { status: "rejected"; error: any } | { status: "resolved"; value: T } | { status: "pending" };
function useAsync<T>(promise: Promise<T>): AsyncResult<T> {
  const [result, setResult] = useState<AsyncResult<T>>(STATUS_PENDING);

  useEffect(() => {
    setResult(STATUS_PENDING);
  }, [promise]);

  useEffect(() => {
    promise
      .then((v) => setResult({ status: "resolved", value: v }))
      .catch((e) => setResult({ status: "rejected", error: e }));
  }, [promise]);
  return result;
}

export function ProjectSettings({ project }: { project: AudioProject }) {
  const [name] = useLinkedState(project.projectName);
  const sizeResult = useAsync(
    useMemo(() => {
      return appEnvironment.localFiles.getProjectSize(project.projectId);
    }, [project.projectId]),
  );
  // appEnvironment.localFiles.getSize(project.projectId)

  return (
    <>
      <label style={{ fontSize: "11px" }}>Project Name</label>
      <input
        style={{
          border: "2px solid var(--control-bg-color)",
        }}
        type="text"
        value={name}
        onChange={(e) => project.projectName.set(e.target.value)}
      />
      {/* <span>Tracks: 10</span>
      <span>Clips: 354</span> */}
      {sizeResult.status === "resolved" && typeof sizeResult.value === "number" && (
        <span>Size on Disk: {niceBytes(sizeResult.value)} + audio</span>
      )}
      {/* TODO */}
      <button>Bounce All</button>
      <div className="spacer"></div>
      <button>Delete Project</button>
    </>
  );
}
