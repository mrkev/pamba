import React, { useRef, useEffect } from "react";
import { AudioTrack } from "../lib/AudioTrack";
import { MidiTrack } from "../midi/MidiTrack";
import { nullthrows } from "../utils/nullthrows";
import { audioClipPath } from "./TrackHeader";

const SPACE_BETWEEN_CHANNEL_PEAK_METERS = 2 * devicePixelRatio;
export const TrackPeakMeter = React.memo(function PeakMeter({ track }: { track: AudioTrack | MidiTrack }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // TODO: only run raf when playing
  useEffect(() => {
    const canvas = nullthrows(canvasRef.current);
    const context = nullthrows(canvas.getContext("2d"));
    const toRef: { rafId: null | number } = { rafId: null };

    // we get peaks to make a rolling avg per channel
    const rollingAvgs = track.dsp.meterInstance.getPeaks().currentDB.map(() => new RollingAvg(4));

    toRef.rafId = requestAnimationFrame(function rAF() {
      const peaks = track.dsp.meterInstance.getPeaks();
      // context.fillStyle = "#454648";
      context.clearRect(0, 0, canvas.width, canvas.height);

      const numChannels = rollingAvgs.length;
      const channelHeight = canvas.height / numChannels;

      for (let i = 0; i < numChannels; i++) {
        const peak = peaks.currentDB[i];
        const rollingAvg = rollingAvgs[i];
        if (rollingAvg.has((x) => x > 0)) {
          context.fillStyle = "red";
        } else {
          context.fillStyle = "orange";
        }
        rollingAvg.push(peak);

        const filledProportionAvg = audioClipPath(rollingAvg.avg(), -48, 0);
        const margin = SPACE_BETWEEN_CHANNEL_PEAK_METERS / numChannels;
        context.fillRect(0, i * channelHeight + i * margin, canvas.width * filledProportionAvg, channelHeight - margin);

        context.fillRect(0, i * channelHeight + i * margin, canvas.width * filledProportionAvg, channelHeight - margin);
      }

      requestAnimationFrame(rAF);
    });
    return () => {
      toRef.rafId && cancelAnimationFrame(toRef.rafId);
    };
  });

  return (
    <>
      <canvas
        height={18 * devicePixelRatio}
        width={98 * devicePixelRatio}
        ref={canvasRef}
        style={{ height: 18, width: 98, borderRight: "1px solid gray", boxSizing: "border-box" }}
      />
      {/* <button
              onClick={() => {
                console.log(JSON.stringify(track.dsp.meterInstance.getPeaks(), null, 2));
              }}
            >
              on
            </button> */}
    </>
  );
});
export class RollingAvg {
  private i = 0;
  private readonly buffer: Array<number>;
  constructor(readonly size: number) {
    this.buffer = new Array(size).fill(0);
  }

  push(num: number) {
    this.buffer[this.i] = num;
    this.i = (this.i + 1) % this.size;
  }

  avg() {
    let sum = 0;
    for (const num of this.buffer) {
      sum += num;
    }
    return sum / this.size;
  }

  has(cb: (value: number, index: number, obj: number[]) => boolean) {
    return this.buffer.find(cb) != null;
  }
}
