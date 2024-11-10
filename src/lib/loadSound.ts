// Load the audio from the URL via Ajax and store it in global variable audioData

import { AudioPackage } from "../data/AudioPackage";
import { localAudioPackage } from "../data/urlProtocol";
import { ignorePromise } from "../utils/ignorePromise";
import { SharedAudioBuffer } from "./SharedAudioBuffer";

// TODO: is this the best solution?
export const SOUND_LIB_FOR_HISTORY = new Map<string, SharedAudioBuffer>();

export async function loadSoundFromAudioPackage(
  audioContext: AudioContext,
  audioPackage: AudioPackage,
): Promise<SharedAudioBuffer> {
  const url = audioPackage.url().toString();
  const cached = SOUND_LIB_FOR_HISTORY.get(url);
  if (cached) {
    return cached;
  }

  const buffer = await audioPackage.file.arrayBuffer();
  const decoded = await audioContext.decodeAudioData(buffer);
  const sharedAudioBuffer = new SharedAudioBuffer(decoded);
  SOUND_LIB_FOR_HISTORY.set(url, sharedAudioBuffer);
  return sharedAudioBuffer;
}

// Note that the audio load is asynchronous
export async function loadSound(audioContext: AudioContext, url: string): Promise<SharedAudioBuffer> {
  const audioPackage = await localAudioPackage(url);

  if (audioPackage != null) {
    const buffer = await loadSoundFromAudioPackage(audioContext, audioPackage);
    return buffer;
  }

  return new Promise(function (res, onError) {
    // document.getElementById("msg").textContent = "Loading audio...";
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    // When loaded, decode the data and play the sound

    request.onload = function () {
      ignorePromise(
        audioContext.decodeAudioData(
          request.response,
          function (buffer) {
            const sharedAudioBuffer = new SharedAudioBuffer(buffer);

            // document.getElementById("msg").textContent =
            //   "Audio sample download finished";
            // TODO: we might create duplicate buffers here
            SOUND_LIB_FOR_HISTORY.set(url, sharedAudioBuffer);
            res(sharedAudioBuffer);
            // playSound(audioData);
          },
          onError,
        ),
      );
    };
    request.send();
  });
}
