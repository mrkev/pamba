import { nullthrows } from "../utils/nullthrows";

/**
 * The exact same as an AudioBuffer, but uses `SharedArrayBuffer`s to store
 * channel data.
 */
export class SharedAudioBuffer implements AudioBuffer {
  channels: SharedArrayBuffer[] = [];
  readonly length: number;
  readonly duration: number;
  readonly numberOfChannels: number;
  readonly sampleRate: number;

  constructor(audioBuffer: AudioBuffer) {
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      // TODO: Can I already shere these buffers?
      const floats = audioBuffer.getChannelData(c);
      const sab = new SharedArrayBuffer(floats.buffer.byteLength);
      const sharedFloats = new Float32Array(sab);
      sharedFloats.set(floats, 0);
      this.channels.push(sab);
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
