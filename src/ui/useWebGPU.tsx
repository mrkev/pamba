import { useEffect, useState } from "react";
import nullthrows from "../utils/nullthrows";

// look at: https://gist.github.com/bellbind/c686d4a01306642646ec5ae476741b42
// for animation (interactivity)
export type WebGPUStatus =
  | { status: "waiting" }
  | {
      status: "ready";
      adapter: GPUAdapter;
      device: GPUDevice;
      encoder: GPUCommandEncoder;
      context: GPUCanvasContext;
      canvasFormat: GPUTextureFormat;
    }
  | { status: "error"; error: unknown };
export function useWebGPU(canvasRef: React.RefObject<HTMLCanvasElement>): WebGPUStatus {
  const [status, setStatus] = useState<WebGPUStatus>({ status: "waiting" });
  useEffect(() => {
    async function main() {
      try {
        const canvas = nullthrows(canvasRef.current);
        const context = nullthrows(canvas.getContext("webgpu"));
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

        if (!navigator.gpu) {
          throw new Error("WebGPU not supported on this browser.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (adapter == null) {
          throw new Error("No appropriate GPUAdapter found.");
        }

        const device = await adapter.requestDevice();
        context.configure({
          device: device,
          format: canvasFormat,
        });

        const encoder = device.createCommandEncoder();

        setStatus({ status: "ready", adapter: adapter, device, encoder, context, canvasFormat });
      } catch (e) {
        setStatus({ status: "error", error: e });
      }
    }
    void main();
  }, [canvasRef]);

  return status;
}
