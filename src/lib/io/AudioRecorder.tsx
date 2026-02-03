import { MarkedMap, MarkedValue } from "marked-subbable";
import { useEffect, useState } from "react";
import { AudioPackage } from "../../data/AudioPackage";
import { ProjectPackage } from "../../data/ProjectPackage";
import { nullthrows } from "../../utils/nullthrows";
import { appEnvironment } from "../AppEnvironment";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { AudioProject } from "../project/AudioProject";
import { standardTrack } from "../StandardTrack";
import { AudioRenderer } from "./AudioRenderer";

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
  readonly status = MarkedValue.create<"idle" | "recording" | "error">("idle");
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Array<BlobPart> = [];
  readonly audioInputDevices = MarkedMap.create<string, MediaDeviceInfo>();
  readonly currentInput = MarkedValue.create<string | null>(null);

  // TODO: project audio lib
  private async loadClip(audioPackage: AudioPackage) {
    try {
      console.log("LOAD CLIP", this.project.cursorPos.get());
      // load clip
      const clip = await AudioClip.fromAudioPackage(audioPackage);
      clip.timelineStart.set(this.project.cursorPos.get(), "seconds");

      const armedTrack = this.project.armedAudioTrack.get();
      if (armedTrack == null) {
        const newTrack = AudioTrack.fromClip(this.project, clip);
        AudioProject.addAudioTrack(this.project, "top", newTrack, this.renderer.analizedPlayer);
      } else if (armedTrack instanceof AudioTrack) {
        standardTrack.addClip(this.project, armedTrack, clip);
      }
    } catch (e) {
      console.trace(e);
      return;
    }
  }

  constructor(
    public readonly project: AudioProject,
    public readonly renderer: AudioRenderer,
  ) {
    this.init().catch(() => this.status.set("error"));
  }

  private async init() {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      // TODO: can I get stereo input? higher quality?
      audio: true,
    });
    // we can't do these concurrently. getUserMedia has to be called before enumerateDevices to get the right permisisons
    const deviceEntries = (await navigator.mediaDevices.enumerateDevices())
      .filter((device) => device.kind === "audioinput")
      .map((device) => [device.deviceId, device] as const);

    this.currentInput.set(mediaStream.getTracks()[0].getSettings().deviceId ?? null);
    this.audioInputDevices.replace(new Map(deviceEntries));

    navigator.mediaDevices.addEventListener("devicechange", async () => {
      // const deviceEntries = (await navigator.mediaDevices.enumerateDevices())
      //   .filter((device) => device.kind === "audioinput")
      //   .map((device) => [device.deviceId, device] as const);
      // this.audioInputDevices.replace(deviceEntries);
      // TODO: check if current device still exists, if not find anohter default
    });

    // mediaStream =navigator.mediaDevices.getUserMedia({
    //   audio: {
    //     // sampleRate:
    //     deviceId: "todo",
    //   },
    // });
    this.mediaRecorder = new MediaRecorder(mediaStream);
    this.mediaRecorder.ondataavailable = function (this: AudioRecorder, e: BlobEvent) {
      this.chunks.push(e.data);
    }.bind(this);
    this.mediaRecorder.onstop = async function (this: AudioRecorder) {
      console.log("data available after MediaRecorder.stop() called.");
      const blob = new Blob(this.chunks, { type: "audio/ogg; codecs=opus" });
      const file = new File([blob], "recording" + new Date().getTime(), { type: "audio/ogg; codecs=opus" });
      this.chunks = [];

      const projectPackage = await appEnvironment.localFiles.projectLib.getPackage(this.project.projectId);
      if (!(projectPackage instanceof ProjectPackage)) {
        this.status.set("idle");
        console.error("project not found");
        return;
      }

      const audioPackage = await projectPackage.saveAudio(file);
      if (!(audioPackage instanceof AudioPackage)) {
        this.status.set("error");
        console.error(audioPackage);
        return;
      }
      // const audioURL = window.URL.createObjectURL(blob);
      // audio.src = audioURL;
      await this.loadClip(audioPackage);
      console.log("recorder stopped");
      this.status.set("idle");
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
  }
}
