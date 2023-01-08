import firebase from "firebase/compat";
import type { AudioProject } from "./AudioProject";

export class AudioStorage {
  static async uploadAudioFile(file: File, firebaseStoreRef: firebase.storage.Reference, project: AudioProject) {
    const location = `project/${project.projectId}/audio/${file.name}`;
    const snapshot = await firebaseStoreRef.child(location).put(file, {
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
