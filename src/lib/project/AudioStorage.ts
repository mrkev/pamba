import { StorageReference, listAll, ref } from "firebase/storage";
import type { IFormat } from "music-metadata";
import { useMemo } from "react";
import { AudioPackage } from "../../data/AudioPackage";
import { AsyncResultStatus, useAsyncResult } from "../../ui/useAsyncResult";
import { appEnvironment } from "../AppEnvironment";
import type { AudioProject } from "./AudioProject";

export class AudioStorage {
  private constructor() {}
  static init() {
    return new AudioStorage();
  }

  async uploadToLibrary(file: File, onFormatInfo?: (format: IFormat) => void): Promise<AudioPackage | Error> {
    const audioPackage = await AudioPackage.newUpload(file, appEnvironment.localFiles.audioLib);
    if (typeof audioPackage === "string") {
      return new Error(audioPackage);
    }

    onFormatInfo?.(audioPackage.metadata.format);
    return audioPackage;
  }

  async uploadToProject(file: File, onFormatInfo?: (format: IFormat) => void): Promise<AudioPackage | Error> {
    const projectPackage = appEnvironment.projectPacakge.get();
    if (projectPackage == null) {
      // TODOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOoo
      // TODO: what to do with unsaved files? Always create package for project, just auto-delete if user hasn't saved.
      throw new Error("No open project package to save to");
    }

    const audioLib = projectPackage.audioLibRef;

    const audioPackage = await AudioPackage.newUpload(file, audioLib);
    if (typeof audioPackage === "string") {
      return new Error(audioPackage);
    }

    onFormatInfo?.(audioPackage.metadata.format);
    return audioPackage;
  }
}

export type UploadErrorCode = "error_unsupported_format" | "error_dir_exists" | "error_creating";

/**
 * Human-readable message for an upload failure. `uploadToLibrary`/`uploadToProject`
 * return the failure code wrapped in an `Error`; pass that Error (or the raw code)
 * plus the file name to show the user why the upload didn't go through.
 */
export function uploadErrorMessage(error: Error | string, fileName: string): string {
  const code = typeof error === "string" ? error : error.message;
  switch (code) {
    case "error_unsupported_format":
      return `Couldn't add "${fileName}": unsupported audio format.`;
    case "error_dir_exists":
      return `"${fileName}" is already in your library.`;
    case "error_creating":
      return `Couldn't save "${fileName}": storage error.`;
    default:
      return `Couldn't add "${fileName}": ${code}`;
  }
}

export function useListProjectAudioFiles(
  project: AudioProject,
  firebaseStoreRef?: StorageReference,
): AsyncResultStatus<StorageReference[]> {
  const filesPromise = useMemo(() => {
    if (!firebaseStoreRef) {
      return null;
    }

    const location = `project/${project.projectId}/audio`;
    const files = listAll(ref(firebaseStoreRef, location))
      .then((files) => files.items)
      .catch((err) => {
        throw err;
      });

    return files;
  }, [firebaseStoreRef, project.projectId]);

  const audioFiles = useAsyncResult(filesPromise);

  return audioFiles;
}
