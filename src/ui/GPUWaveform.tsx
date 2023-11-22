import { useEffect, useRef } from "react";
import nullthrows from "../utils/nullthrows";

const GRID_SIZE = 4;

export function GPUWaveform({ audioBuffer }: { audioBuffer: AudioBuffer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const channelData = audioBuffer.getChannelData(0);

    async function main() {
      const canvas = nullthrows(canvasRef.current);

      if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
      }

      const device = await adapter.requestDevice();

      const context = nullthrows(canvas.getContext("webgpu"));
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device: device,
        format: canvasFormat,
      });

      const encoder = device.createCommandEncoder();

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0.5, b: 0.4, a: 1 },
            storeOp: "store",
          },
        ],
      });

      const vertices = new Float32Array([
        //   X,    Y,
        // Triangle 1 (Blue)
        -0.8, -0.8, 0.8, -0.8, 0.8, 0.8,
        // Triangle 2 (Red)
        -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
      ]);
      const vertexBuffer = device.createBuffer({
        label: "Cell vertices",
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);

      const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
      const uniformBuffer = device.createBuffer({
        label: "Grid Uniforms",
        size: uniformArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

      const vertexBufferLayout = {
        arrayStride: 8,
        attributes: [
          {
            format: "float32x2",
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
          },
        ],
      } as const;

      const cellShaderModule = device.createShaderModule({
        label: "Cell shader",
        code: `
          // At the top of the code string in the createShaderModule() call
          @group(0) @binding(0) var<uniform> grid: vec2f;


          @vertex
          fn vertexMain(
            @location(0) pos: vec2f,
            @builtin(instance_index) instance: u32
          ) -> @builtin(position) vec4f {

  
            let i = f32(instance);
            // Compute the cell coordinate from the instance_index
            let cell = vec2f(i % grid.x, floor(i / grid.x));
          
            let cellOffset = cell / grid * 2;
            let gridPos = (pos + 1) / grid - 1 + cellOffset;          
          
            return vec4f(gridPos, 0, 1); 
          }

          @fragment
          fn fragmentMain() -> @location(0) vec4f {
            return vec4f(1, 0, 0, 1); // (Red, Green, Blue, Alpha)
          }
        `,
      });

      const cellPipeline = device.createRenderPipeline({
        label: "Cell pipeline",
        layout: "auto",
        vertex: {
          module: cellShaderModule,
          entryPoint: "vertexMain",
          buffers: [vertexBufferLayout],
        },
        fragment: {
          module: cellShaderModule,
          entryPoint: "fragmentMain",
          targets: [
            {
              format: canvasFormat,
            },
          ],
        },
      });

      const bindGroup = device.createBindGroup({
        label: "Cell renderer bind group",
        layout: cellPipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: uniformBuffer },
          },
        ],
      });

      pass.setPipeline(cellPipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setBindGroup(0, bindGroup);
      pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE); // 6 vertices

      pass.end();

      // Finish the command buffer and immediately submit it.
      device.queue.submit([encoder.finish()]);
    }

    void main();
  }, []);
  return (
    <>
      <canvas ref={canvasRef} width="512" height="512"></canvas>
    </>
  );
}
