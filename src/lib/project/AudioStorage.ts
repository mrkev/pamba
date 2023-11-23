import { StorageReference, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import type { IFormat } from "music-metadata";
import * as musicMetadata from "music-metadata-browser";
import { useMemo } from "react";
import { AsyncResultStatus, useAsyncResult } from "../../ui/useAsyncResult";
import type { AudioProject } from "./AudioProject";
import { LinkedArray } from "../state/LinkedArray";

export class AudioStorage {
  readonly remoteFiles: LinkedArray<string>;
  private readonly project: AudioProject;
  private readonly firebaseStoreRef: StorageReference;

  private constructor(project: AudioProject, remoteFiles: string[], firebaseStoreRef: StorageReference) {
    this.project = project;
    this.remoteFiles = LinkedArray.create<string>(remoteFiles);
    this.firebaseStoreRef = firebaseStoreRef;
  }

  static async initAtRootLocation(project: AudioProject, firebaseStoreRef: StorageReference) {
    const location = `project/${project.projectId}/audio`;
    const list = await listAll(ref(firebaseStoreRef, location));
    const files = await Promise.all(list.items.map((x) => getDownloadURL(x)));
    return new AudioStorage(project, files, firebaseStoreRef);
  }

  // TODO: progress callback
  async uploadAudioFile(file: File, onFormatInfo?: (format: IFormat) => void): Promise<string | Error> {
    switch (file.type) {
      // random list from https://www.thoughtco.com/audio-file-mime-types-3469485
      // TODO: check if all of these actually work
      case "audio/mpeg":
      case "audio/ogg":
      case "audio/basic":
      case "audio/L24":
      case "audio/mid":
      case "audio/mp4":
      case "audio/x-aiff":
      case "audio/x-mpegurl":
      case "audio/vnd.rn-realaudio":
      case "audio/vorbis":
      case "audio/vnd.wav":
      case "audio/wav":
        break;
      default: {
        // TODO: upload fails but ui has no feedback for users
        return new Error("Unsupported format: " + file.type);
      }
    }

    const metadata = await musicMetadata.parseBlob(file, {
      duration: true,
      skipCovers: true,
    });

    onFormatInfo?.(metadata.format);

    const audioLocation = `project/${this.project.projectId}/audio/${file.name}`;
    const snapshot = await uploadBytes(ref(this.firebaseStoreRef, audioLocation), file, {
      contentType: file.type,
    });

    // console.log("Uploaded", snapshot.totalBytes, "bytes.");
    console.log("File metadata:", snapshot.metadata);
    // Let's get a download URL for the file.
    const url = await getDownloadURL(snapshot.ref);
    console.log("File available at", url);
    this.remoteFiles.push(url);
    return url;
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
