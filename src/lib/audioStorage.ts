import firebase from "firebase/compat";
import type { AudioProject } from "./AudioProject";
import * as musicMetadata from "music-metadata-browser";
import type { IFormat } from "music-metadata";
import { useCallback, useMemo } from "react";
import { AsyncResultStatus, useAsyncResult } from "../ui/useAsyncResult";

export class AudioStorage {
  // TODO: progress callback
  static async uploadAudioFile(
    file: File,
    firebaseStoreRef: firebase.storage.Reference,
    project: AudioProject,
    onFormatInfo?: (format: IFormat) => void
  ): Promise<string | Error> {
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
        break;
      default: {
        return new Error("Unsupported format: " + file.type);
      }
    }

    const metadata = await musicMetadata.parseBlob(file, {
      duration: true,
      skipCovers: true,
    });

    onFormatInfo?.(metadata.format);

    const audioLocation = `project/${project.projectId}/audio/${file.name}`;
    const snapshot = await firebaseStoreRef.child(audioLocation).put(file, {
      contentType: file.type,
    });

    console.log("Uploaded", snapshot.totalBytes, "bytes.");
    console.log("File metadata:", snapshot.metadata);
    // Let's get a download URL for the file.
    const url = await snapshot.ref.getDownloadURL();
    console.log("File available at", url);
    return url;
  }
}

export function useListProjectAudioFiles(
  project: AudioProject,
  firebaseStoreRef?: firebase.storage.Reference
): AsyncResultStatus<firebase.storage.Reference[]> {
  const filesPromise = useMemo(() => {
    if (!firebaseStoreRef) {
      return null;
    }

    const location = `project/${project.projectId}/audio`;
    const files = firebaseStoreRef
      .child(location)
      .listAll()
      .then((files) => files.items)
      .catch((err) => {
        throw err;
      });
    return files;
  }, [firebaseStoreRef, project.projectId]);

  const audioFiles = useAsyncResult(filesPromise);

  return audioFiles;
}
