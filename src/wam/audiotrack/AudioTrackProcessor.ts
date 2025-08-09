/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { AudioWorkletGlobalScope, WamTransportData } from "@webaudiomodules/api";
import getWamProcessor from "../../../packages/sdk/src/WamProcessor";
import { OrderedMap } from "../../lib/data/OrderedMap";
import { AudioTrackProcessorMessage, SimpleAudioClip } from "./SharedAudioTrackTypes";
// import { getWamProcessor } from "../../../packages/sdk/src";

const MODULE_ID = "com.aykev.audiotrack";
const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope;
// const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(MODULE_ID);
// const WamProcessor = ModuleScope.WamProcessor; // as  WamProcessorT;

const WamProcessor = getWamProcessor(MODULE_ID);

class AudioTrackProcessor extends WamProcessor {
  override _generateWamParameterInfo() {
    return {};
  }

  private lastTime: number | null = null;

  private ticks: number = -1;
  private startingTicks: number = 0;

  private transportData?: WamTransportData;

  readonly playingNotes = new Set<number>();
  // new system
  private seqClips: OrderedMap<string, SimpleAudioClip> = new OrderedMap();
  private playhead: number;
  private isPlaying: boolean = false;

  private loop: readonly [number, number] | null = null;

  private pendingClipChange?: { id: string; timestamp: number };
  private currentClipId: string = "default";

  constructor(options: { processorOptions: { moduleId: string; instanceId: string } }) {
    console.log("AUDIO TRACK WAM CONSTRUCTOR");
    // console.log("PRE");
    super(options);
    this.playhead = 0;

    // super.port.start();
  }

  /**
   * Messages from main thread appear here.
   * @param {MessageEvent} event
   */
  override async _onMessage(event: { data: AudioTrackProcessorMessage }) {
    const payload = event.data;
    if (!payload) {
      return;
    }

    switch (payload.action) {
      case "set_clips": {
        // New clips message
        this.seqClips = new OrderedMap(new Map(payload.seqClips.map((clip) => [clip.id, clip] as const)));
        console.log(event);
        return;
      }

      // default:
    }

    if (event.data.action === "play") {
      console.log(event);
      this.isPlaying = true;
    } else if (event.data.action === "stop") {
      console.log(event);
      this.isPlaying = false;
      this.playhead = 0;
    } else {
      // super.onMessage(event);
    }
  }

  onTransport(transportData: WamTransportData) {
    this.transportData = transportData;
    this.isPlaying = false;

    // super.port.postMessage({
    //   event: "transport",
    //   transport: transportData,
    // });
  }

  override process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    // console.log("rocess");
    const clip = this.seqClips.at(0);
    if (clip == null) {
      return true;
    }

    if (!clip.channels || !this.isPlaying) return true;

    const output = outputs[0];
    if (!output) return true;

    const numChannels = clip.channels.length;

    for (let channel = 0; channel < numChannels; channel++) {
      const audioData = new Float32Array(clip.channels[channel]);
      const bufferLength = audioData?.length || 0;

      const outputChannel = output[channel];
      const bufferChannel = audioData;
      if (!outputChannel || !bufferChannel) continue;

      for (let i = 0; i < outputChannel.length; i++) {
        if (this.playhead >= bufferLength) {
          this.isPlaying = false; // Stop playback when buffer ends
          break;
        }
        outputChannel[i] = bufferChannel[this.playhead];
        this.playhead++;
      }
    }
    return true;
  }
}

try {
  console.log("REGISTERING AudioTrackProcessor");
  audioWorkletGlobalScope.registerProcessor(MODULE_ID, AudioTrackProcessor);
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn(error);
}
