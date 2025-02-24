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
    const audioPackage = await AudioPackage.newUpload(file, await appEnvironment.localFiles.audioLib.getDir());
    if (typeof audioPackage === "string") {
      return new Error(audioPackage);
    }

    onFormatInfo?.(audioPackage.metadata.format);
    // TODO: remove need to _initState()
    await appEnvironment.localFiles.audioLib._initState();
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

    const audioPackage = await AudioPackage.newUpload(file, await audioLib.getDir());
    if (typeof audioPackage === "string") {
      return new Error(audioPackage);
    }

    onFormatInfo?.(audioPackage.metadata.format);
    // TODO: remove need to _initState()
    await audioLib._initState();

    return audioPackage;
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
