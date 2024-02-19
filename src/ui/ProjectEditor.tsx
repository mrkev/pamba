import { useEffect, useMemo, useState } from "react";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { niceBytes } from "../data/localFilesystem";
import { ListEntry, UtilityDataList } from "./UtilityList";
import { ProjectPackage } from "../data/ProjectPackage";
import { pAll } from "../utils/ignorePromise";
import { AudioPackage } from "../data/AudioPackage";

let STATUS_PENDING = { status: "pending" } as const;

type AsyncResult<T> =
  | Readonly<{ status: "rejected"; error: any }>
  | Readonly<{ status: "resolved"; value: T }>
  | Readonly<{ status: "pending" }>;
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

export function ProjectEditor({ project }: { project: AudioProject }) {
  const [name] = useLinkedState(project.projectName);
  const [projectPackage] = useLinkedState(appEnvironment.projectPacakge);
  const results = useAsync(
    useMemo(async () => {
      if (projectPackage == null) {
        return null;
      }

      const [size, projectAudioFiles] = await pAll(projectPackage.getProjectSize(), projectPackage.projectAudioFiles());
      if (!(typeof size === "number")) {
        throw new Error(size.status);
      }

      return { size, projectAudioFiles };
    }, [projectPackage]),
  );

  const items: ListEntry<AudioPackage>[] = useMemo(() => {
    return results.status !== "resolved" || results.value == null
      ? ([] as ListEntry<AudioPackage>[])
      : results.value.projectAudioFiles.map((ap) => {
          return {
            title: ap.name,
            data: ap,
          };
        });
  }, [results.status]);

  return (
    <>
      <label style={{ fontSize: "12px", fontWeight: "bold" }}>Project Name:</label>
      <input
        style={{
          border: "2px solid var(--control-bg-color)",
        }}
        type="text"
        value={name}
        onChange={(e) => project.projectName.set(e.target.value)}
      />
      {results.status === "resolved" && results.value == null && <i>Save project to see persisted data</i>}
      {/* <span>Tracks: 10</span>
      <span>Clips: 354</span> */}
      {results.status === "resolved" && results.value != null && (
        <span>
          <b>Size on Disk:</b> {niceBytes(results.value.size)} + audio
        </span>
      )}
      <b style={{ fontSize: "12px" }}>Project contents:</b>
      <UtilityDataList<AudioPackage>
        disabled={results.status !== "resolved" || results.value == null}
        draggable={false}
        items={items}
        onItemSelect={(item) => console.log(item)}
      ></UtilityDataList>
      <button className="utilityButton">Delete Project</button>
    </>
  );
}
