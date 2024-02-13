import React, { useEffect, useRef, useState } from "react";
import { mergeRefs } from "react-merge-refs";
import useResizeObserver from "use-resize-observer";
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

export const GPUWaveform = React.forwardRef(function GPUWaveformImpl(
  {
    audioBuffer,
    scale,
    offset = 0,
    ...props
  }: React.CanvasHTMLAttributes<HTMLCanvasElement> & {
    audioBuffer: AudioBuffer;
    scale?: number;
    offset?: number;
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useWaveformRenderer(canvasRef, audioBuffer);

  const { width, height } = useResizeObserver<HTMLCanvasElement>({
    ref: canvasRef,
    // onResize: useCallback(
    //   ({ width }: { width?: number; height?: number }) => {
    //     // project.viewport.projectDivWidth.set(width ?? 0);
    //   },
    //   [project.viewport.projectDivWidth],
    // ),
  });

  useEffect(() => {
    if (width == null || height == null) {
      return;
    }

    const s = scale != null ? scale : audioBuffer.length / width;
    renderer?.render(s, offset, width, height);
    // renderer?.render(Math.round(Math.exp((Math.log(1000) / 100) * scale)));
  }, [audioBuffer, height, offset, renderer, scale, width]);

  return <canvas ref={mergeRefs([canvasRef, ref])} {...props} />;
});

// export function useObserveDims(ref: React.RefObject<HTMLElement>) {
//   useLayoutEffect(() => {
//     const width = ref.current?.getBoundingClientRect().width;
//     console.log("HERE", width);
//     if (width) {
//       // project.viewport.projectDivWidth.set(width);
//     }
//   }, [ref]);

//   const res = useResizeObserver<HTMLElement>({
//     ref: ref,
//     onResize: useCallback(
//       ({ width }: { width?: number; height?: number }) => {
//         project.viewport.projectDivWidth.set(width ?? 0);
//       },
//       [project.viewport.projectDivWidth],
//     ),
//   });
// }
