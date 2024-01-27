// Load the audio from the URL via Ajax and store it in global variable audioData

import { ignorePromise } from "../utils/ignorePromise";
import { appEnvironment } from "./AppEnvironment";
import { fileNameOfLocalURL } from "../data/urlProtocol";

// TODO: is this the best solution?
export const SOUND_LIB_FOR_HISTORY = new Map<string, AudioBuffer>();

// Note that the audio load is asynchronous
export async function loadSound(audioContext: AudioContext, url: string): Promise<AudioBuffer> {
  const localName = fileNameOfLocalURL(url);
  if (localName != null) {
    const audioPackage = appEnvironment.localFiles._audioLib.get(localName);
    if (audioPackage == null) {
      throw new Error("audio file not known by local fs");
    }
    const buffer = await audioPackage.file.arrayBuffer();
    return new Promise((res, rej) => {
      ignorePromise(
        audioContext.decodeAudioData(
          buffer,
          function (buffer) {
            // document.getElementById("msg").textContent =
            //   "Audio sample download finished";
            SOUND_LIB_FOR_HISTORY.set(url, buffer);
            res(buffer);
            // playSound(audioData);
          },
          rej,
        ),
      );
    });
  }

  return new Promise(function (res, onError) {
    // document.getElementById("msg").textContent = "Loading audio...";
    let request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    // When loaded, decode the data and play the sound

    request.onload = function () {
      ignorePromise(
        audioContext.decodeAudioData(
          request.response,
          function (buffer) {
            // document.getElementById("msg").textContent =
            //   "Audio sample download finished";
            SOUND_LIB_FOR_HISTORY.set(url, buffer);
            res(buffer);
            // playSound(audioData);
          },
          onError,
        ),
      );
    };
    request.send();
  });
}
