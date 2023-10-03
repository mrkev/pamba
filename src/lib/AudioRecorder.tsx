import { useEffect, useState } from "react";
import { SPrimitive } from "./state/LinkedState";
import nullthrows from "../utils/nullthrows";
import { LinkedArray } from "./state/LinkedArray";
import { LinkedMap } from "./state/LinkedMap";

function useMediaRecorder(loadClip: (url: string, name?: string) => void) {
  const [mediaRecorder, setMediaRecorder] = useState<null | MediaRecorder>(null);

  // Microphone recording
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
      })
      .then(function (mediaStream: MediaStream) {
        let chunks: Array<BlobPart> = [];
        const mediaRecorder = new MediaRecorder(mediaStream);
        mediaRecorder.ondataavailable = function (e) {
          chunks.push(e.data);
        };
        mediaRecorder.onstop = function () {
          console.log("data available after MediaRecorder.stop() called.");
          const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
          chunks = [];
          const audioURL = window.URL.createObjectURL(blob);
          // audio.src = audioURL;
          loadClip(audioURL, "recording");
          console.log("recorder stopped");
        };
        setMediaRecorder(mediaRecorder);
      })
      .catch(console.error);
  }, [loadClip]);

  return mediaRecorder;
}

export class AudioRecorder {
  readonly status = SPrimitive.of<"idle" | "recording" | "error">("idle");
  private mediaRecorder: MediaRecorder | null;
  private chunks: Array<BlobPart>;
  readonly audioInputDevices: LinkedMap<string, MediaDeviceInfo>;
  readonly currentInput = SPrimitive.of<string | null>(null);

  constructor(loadClip: (url: string, name?: string) => void) {
    this.mediaRecorder = null;
    this.chunks = [];
    this.audioInputDevices = LinkedMap.create();
    this.init(loadClip).catch(() => this.status.set("error"));
  }

  private async init(loadClip: (url: string, name?: string) => void) {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      // TODO: can I get stereo input? higher quality?
      audio: true,
    });
    // we can't do these concurrently. getUserMedia has to be called before enumerateDevices to get the right permisisons
    const deviceEntries = (await navigator.mediaDevices.enumerateDevices())
      .filter((device) => device.kind === "audioinput")
      .map((device) => [device.deviceId, device] as const);

    this.currentInput.set(mediaStream.getTracks()[0].getSettings().deviceId ?? null);
    this.audioInputDevices.replace(deviceEntries);

    navigator.mediaDevices.addEventListener("devicechange", () => console.log("TODO"));

    this.mediaRecorder = new MediaRecorder(mediaStream);
    this.mediaRecorder.ondataavailable = function (this: AudioRecorder, e: BlobEvent) {
      this.chunks.push(e.data);
    }.bind(this);
    this.mediaRecorder.onstop = function (this: AudioRecorder) {
      console.log("data available after MediaRecorder.stop() called.");
      const blob = new Blob(this.chunks, { type: "audio/ogg; codecs=opus" });
      this.chunks = [];
      const audioURL = window.URL.createObjectURL(blob);
      // audio.src = audioURL;
      loadClip(audioURL, "recording");
      console.log("recorder stopped");
    }.bind(this);
  }

  public selectInputDevice(deviceId: string) {
    this.currentInput.set(deviceId);
    // TODO: record audio with this device
  }

  public record() {
    if (this.status.get() !== "idle") {
      return;
    }
    nullthrows(this.mediaRecorder).start();
    this.status.set("recording");
  }

  public stop() {
    if (this.status.get() !== "recording") {
      return;
    }
    nullthrows(this.mediaRecorder).stop();
    this.status.set("idle");
  }
}