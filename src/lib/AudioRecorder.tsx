import { useEffect, useState } from "react";
import { nullthrows } from "../utils/nullthrows";
import { AudioClip } from "./AudioClip";
import { AudioRenderer } from "./AudioRenderer";
import { AudioTrack } from "./AudioTrack";
import { secs } from "./AbstractClip";
import { AudioProject } from "./project/AudioProject";
import { LinkedMap } from "./state/LinkedMap";
import { SPrimitive } from "./state/LinkedState";
import { ignorePromise } from "./state/Subbable";
import { ProjectTrack } from "./ProjectTrack";
import { appEnvironment } from "./AppEnvironment";
import { AudioPackage } from "../data/AudioPackage";
import { ProjectPackage } from "../data/ProjectPackage";

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

  readonly renderer: AudioRenderer;
  readonly project: AudioProject;

  // TODO: project audio lib
  private async loadClip(audioPackage: AudioPackage) {
    try {
      console.log("LOAD CLIP", this.project.cursorPos.get());
      // load clip
      const clip = await AudioClip.fromAudioPackage(audioPackage);
      clip.timelineStartSec = secs(this.project.cursorPos.get());

      const armedTrack = this.project.armedTrack.get();
      if (armedTrack == null) {
        const newTrack = AudioTrack.fromClip(this.project, clip);
        AudioProject.addAudioTrack(this.project, this.renderer.analizedPlayer, newTrack);
      } else if (armedTrack instanceof AudioTrack) {
        ProjectTrack.addClip(this.project, armedTrack, clip);
      }
    } catch (e) {
      console.trace(e);
      return;
    }
  }

  constructor(project: AudioProject, renderer: AudioRenderer) {
    this.mediaRecorder = null;
    this.chunks = [];
    this.audioInputDevices = LinkedMap.create();
    this.project = project;
    this.renderer = renderer;
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
    this.audioInputDevices.replace(deviceEntries);

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

      const audioPackage = await projectPackage.audioLibRef.saveAudio(file);
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
