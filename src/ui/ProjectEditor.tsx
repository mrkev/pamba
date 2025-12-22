import { useLink } from "marked-subbable";
import { useEffect, useMemo, useState } from "react";
import { usePrimitive } from "structured-state";
import { AudioPackage } from "../data/AudioPackage";
import { niceBytes } from "../data/niceBytes";
import { ProjectPackage } from "../data/ProjectPackage";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedMapMaybe } from "../lib/state/LinkedMap";
import { UtilityDataList } from "./UtilityList";

const STATUS_PENDING = { status: "pending" } as const;

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

async function getProjectSizeOrThrow(projectPackage: Readonly<ProjectPackage | null>) {
  if (projectPackage == null) {
    return null;
  }

  const size = await projectPackage.getProjectSize();
  if (!(typeof size === "number")) {
    throw new Error(size.status);
  }

  return { size };
}

export function ProjectEditor({ project }: { project: AudioProject }) {
  const [name] = usePrimitive(project.projectName);
  const projectPackage = useLink(appEnvironment.projectPacakge)().get();
  const projectAudioFiles = useLinkedMapMaybe(projectPackage?.audioLibRef.state);

  // TODO: doesn't seem to update when we add a new audio file to projectPackage?.audioLibRef.state?
  // (ie, when recording new audio)
  const items =
    projectAudioFiles?.map((ap) => {
      return {
        title: ap.name,
        data: ap,
      };
    }) ?? [];

  const results = useAsync(useMemo(() => getProjectSizeOrThrow(projectPackage), [projectPackage]));

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
