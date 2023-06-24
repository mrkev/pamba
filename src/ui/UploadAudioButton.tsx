import React, { useState } from "react";
import { AudioProject } from "../lib/AudioProject";
import { ignorePromise } from "../utils/ignorePromise";
import { utility } from "./utility";
import { UploadButton } from "./FormButtons";
import type firebase from "firebase/compat";
import { AudioStorage } from "../lib/audioStorage";
import { StorageReference } from "firebase/storage";

export function UploadAudioButton({
  project,
  firebaseStoreRef,
  loadClip,
}: {
  project: AudioProject;
  firebaseStoreRef: StorageReference | null;
  loadClip: (url: string, name?: string) => Promise<void>;
}) {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  return (
    firebaseStoreRef && (
      <UploadButton
        className={utility.button}
        value={uploadStatus === "idle" ? "upload audio" : "uploading..."}
        disabled={uploadStatus === "uploading"}
        accept="audio/*"
        onChange={async function (e) {
          const file = (e.target.files || [])[0];
          if (!file) {
            console.log("NO FILE");
            return;
          }
          setUploadStatus("uploading");
          const result = await AudioStorage.uploadAudioFile(file, firebaseStoreRef, project);
          if (result instanceof Error) {
            throw result;
          }
          const url = result;
          ignorePromise(loadClip(url, file.name));
          setUploadStatus("idle");
        }}
      />
    )
  );
}
