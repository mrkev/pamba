import { StorageReference, listAll, ref } from "firebase/storage";
import type { IFormat } from "music-metadata";
import { useMemo } from "react";
import { AsyncResultStatus, useAsyncResult } from "../../ui/useAsyncResult";
import { appEnvironment } from "../AppEnvironment";
import { LinkedArray } from "../state/LinkedArray";
import type { AudioProject } from "./AudioProject";
import { AudioPackage } from "../../data/AudioPackage";

export class AudioStorage {
  readonly remoteFiles: LinkedArray<string>;
  private readonly project: AudioProject;

  private constructor(
    project: AudioProject,
    remoteFiles: string[],
    private readonly firebaseStoreRef: StorageReference | null,
  ) {
    this.project = project;
    this.remoteFiles = LinkedArray.create<string>(remoteFiles);
  }

  static async init(project: AudioProject, firebaseStoreRef: StorageReference | null) {
    // const location = `project/${project.projectId}/audio`;
    // const list = await listAll(ref(firebaseStoreRef, location));
    // const files = await Promise.all(list.items.map((x) => getDownloadURL(x)));
    return new AudioStorage(project, [], firebaseStoreRef);
  }

  // TODO: progress callback
  private async remoteUploadAudioFile(file: File, onFormatInfo?: (format: IFormat) => void): Promise<string | Error> {
    throw new Error("Remote files no longer supported, for now");
    // const audioPackage = await AudioPackage.of(file);
    // if (audioPackage instanceof Error) {
    //   return audioPackage;
    // }
    // onFormatInfo?.(audioPackage.metadata.format);
    // const audioLocation = `project/${this.project.projectId}/audio/${file.name}`;
    // const snapshot = await uploadBytes(ref(this.firebaseStoreRef, audioLocation), file, {
    //   contentType: file.type,
    // });
    // // console.log("Uploaded", snapshot.totalBytes, "bytes.");
    // console.log("File metadata:", snapshot.metadata);
    // // Let's get a download URL for the file.
    // const url = await getDownloadURL(snapshot.ref);
    // console.log("File available at", url);
    // this.remoteFiles.push(url);
    // return url;
  }

  async uploadToLibrary(file: File, onFormatInfo?: (format: IFormat) => void): Promise<AudioPackage | Error> {
    const audioPackage = await AudioPackage.newUpload(
      file,
      await appEnvironment.localFiles.audioLibDir(),
      "library://",
    );
    if (typeof audioPackage === "string") {
      return new Error(audioPackage);
    }

    onFormatInfo?.(audioPackage.metadata.format);
    // TODO: remove need to _initState()
    await appEnvironment.localFiles.audioLib2._initState();
    return audioPackage;
  }

  async uploadToProject(file: File, onFormatInfo?: (format: IFormat) => void): Promise<AudioPackage | Error> {
    const audioPackage = await AudioPackage.newUpload(
      file,
      await appEnvironment.localFiles.audioLibDir(),
      "project://",
    );
    if (typeof audioPackage === "string") {
      return new Error(audioPackage);
    }

    onFormatInfo?.(audioPackage.metadata.format);
    // TODO: remove need to _initState()
    // await appEnvironment.localFiles.updateAudioLib();
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
