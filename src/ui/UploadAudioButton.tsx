import { useState } from "react";
import { usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { ignorePromise } from "../utils/ignorePromise";
import { UploadButton } from "./FormButtons";
import { utility } from "./utility";
import { appEnvironment } from "../lib/AppEnvironment";

export function UploadAudioButton({
  project,
  loadClip,
}: {
  project: AudioProject;
  loadClip?: (url: string, name?: string) => Promise<void>;
}) {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  const [audioStorage] = usePrimitive(appEnvironment.audioStorage);

  return (
    audioStorage && (
      <UploadButton
        className={utility.button}
        value={uploadStatus === "idle" ? "add audio to library" : "loading..."}
        disabled={uploadStatus === "uploading"}
        accept="audio/*"
        onChange={async function (e) {
          const file = (e.target.files || [])[0];
          if (!file) {
            console.log("NO FILE");
            return;
          }
          setUploadStatus("uploading");
          const result = await audioStorage.uploadToLibrary(file);
          if (result instanceof Error) {
            setUploadStatus("idle");
            throw result;
          }
          const url = result.url().toString();
          ignorePromise(loadClip?.(url, file.name));
          setUploadStatus("idle");
        }}
      />
    )
  );
}
