import { GPUWaveformRenderer } from "webgpu-waveform";
import { nullthrows } from "../utils/nullthrows";
import { appEnvironment } from "./AppEnvironment";

/**
 * Similar to an AudioBuffer, but uses `SharedArrayBuffer`s to store
 * channel data.
 * Also includes rendering mechanism.
 */
export class SharedAudioBuffer implements AudioBuffer {
  readonly channels: ArrayBuffer[] = [];
  // channels: SharedArrayBuffer[] = [];
  readonly length: number;
  readonly duration: number;
  readonly numberOfChannels: number;
  readonly sampleRate: number;
  readonly renderer: GPUWaveformRenderer | null;

  constructor(audioBuffer: AudioBuffer) {
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      // TODO: Can I already shere these buffers?
      const floats = audioBuffer.getChannelData(c);
      const sab = new SharedArrayBuffer(floats.buffer.byteLength);
      console.log("init with", SharedArrayBuffer);
      const sharedFloats = new Float32Array(sab);
      sharedFloats.set(floats, 0);
      this.channels.push(sab);
    }

    const webgpu = nullthrows(appEnvironment.webgpu.get(), "webgpu not loaded");
    if (webgpu.status !== "ok") {
      // no webgpu envorinment
      this.renderer = null;
    } else {
      this.renderer = GPUWaveformRenderer.createSync(webgpu.device, this.getChannelData(0));
    }

    this.length = audioBuffer.length;
    this.duration = audioBuffer.duration;
    this.numberOfChannels = audioBuffer.numberOfChannels;
    this.sampleRate = audioBuffer.sampleRate;
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void {
    destination.set(this.getChannelData(channelNumber), bufferOffset);
  }
  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void {
    const channel = this.getChannelData(channelNumber);
    channel.set(source, bufferOffset);
  }
  getChannelData(channel: number): Float32Array {
    return nullthrows(new Float32Array(this.channels[channel]), `Channel ${channel} does not exist`);
  }
}
