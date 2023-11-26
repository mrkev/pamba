import { useEffect, useRef, useState } from "react";
import { GPUWaveformRenderer } from "./GPUWaveformRenderer";
import { useWebGPU } from "./useWebGPU";

function useWaveformRenderer(canvasRef: React.RefObject<HTMLCanvasElement>, audioBuffer: AudioBuffer) {
  const gpu = useWebGPU(canvasRef);
  const [renderer, setRenderer] = useState<GPUWaveformRenderer | null>(null);

  useEffect(() => {
    const channelData = audioBuffer.getChannelData(0);

    if (gpu.status !== "ready") {
      return;
    }

    const waveformRenderer = GPUWaveformRenderer.createPipeline(channelData, gpu);

    setRenderer(waveformRenderer);
  }, [audioBuffer, gpu]);

  return renderer;
}

export function GPUWaveform({
  audioBuffer,
  scale,
  width,

  height,
}: {
  audioBuffer: AudioBuffer;
  scale?: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useWaveformRenderer(canvasRef, audioBuffer);

  useEffect(() => {
    const s = scale != null ? scale : audioBuffer.length / width;
    renderer?.render(s);
    // renderer?.render(Math.round(Math.exp((Math.log(1000) / 100) * scale)));
  }, [audioBuffer, renderer, scale, width]);

  return <canvas ref={canvasRef} width={width} height={height}></canvas>;
}
