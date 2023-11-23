import { useEffect, useRef, useState } from "react";
import nullthrows from "../utils/nullthrows";

type WebGPUStatus =
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

function useWebGPU(canvasRef: React.RefObject<HTMLCanvasElement>): WebGPUStatus {
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

export function GPUWaveform({ audioBuffer }: { audioBuffer: AudioBuffer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const GRID_SIZE = scale;
  const gpu = useWebGPU(canvasRef);

  useEffect(() => {
    const channelData = audioBuffer.getChannelData(0);
    console.log("gpu", gpu);
    if (gpu.status !== "ready") {
      return;
    }

    // const device = gpu.device;

    const { encoder, context, device, canvasFormat } = gpu;

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          // other clear value?
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "store",
        },
      ],
    });

    const vertices = new Float32Array([
      //   X,    Y,
      // Triangle 1 (Blue)
      -1.0, -1.0, 1.0, -1.0, 1.0, 1.0,
      // Triangle 2 (Red)
      -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,
    ]);
    const vertexBuffer = device.createBuffer({
      label: "Cell vertices",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);
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

    const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
    const uniformBuffer = device.createBuffer({
      label: "Grid Uniforms",
      size: uniformArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

    const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
    // Create a storage buffer to hold the cell state.
    const cellStateStorage = device.createBuffer({
      label: "Cell State",
      size: cellStateArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Mark every third cell of the grid as active.
    for (let i = 0; i < cellStateArray.length; i += 3) {
      cellStateArray[i] = 1;
    }
    device.queue.writeBuffer(cellStateStorage, 0, cellStateArray);

    const channelDataStorage = device.createBuffer({
      label: "Channel Data",
      size: channelData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(channelDataStorage, 0, channelData);

    console.log("GOaa", GRID_SIZE);
    const cellShaderModule = device.createShaderModule({
      label: "Cell shader",
      code: `
          struct VertexInput {
            @location(0) pos: vec2f,
            @builtin(instance_index) instance: u32,
          };
          
          struct VertexOutput {
            @builtin(position) pos: vec4f,
            @location(0) cell: vec2f, // New line!
          };

          @group(0) @binding(0) var<uniform> grid: vec2f;
          @group(0) @binding(1) var<storage> cellState: array<u32>;
          @group(0) @binding(2) var<storage> channelData: array<f32>;
          
          @vertex
          fn vertexMain(
            @location(0) pos: vec2f,
            @builtin(instance_index) instance: u32
          ) -> VertexOutput {
  
            let i = f32(instance);
            // Compute the cell coordinate from the instance_index
            let cell = vec2f(i % grid.x, floor(i / grid.x));
            let state = f32(cellState[instance]); // New line!
          
            var output: VertexOutput;
            output.pos = vec4f(pos, 0, 1);
            output.cell = cell; // New line!
            return output;
          }

          struct FragInput {
            @location(0) cell: vec2f,
          };

          // 4s = 192,000 samples
          
          @fragment
          fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            // todo, eventually make dynamic size
            let HEIGHT = f32(256);
            let WIDTH = f32(1080);
            let SCALE_FACTOR = 1000;
            let index = i32(floor(input.pos.x * f32(SCALE_FACTOR)));
            let sample = channelData[index];

            var min_sample = sample;
            var max_sample = sample;

            var i = 0;
            for (; i < SCALE_FACTOR; i++) {
              let fwd = channelData[index + i];
              max_sample = max(max_sample, fwd);
              min_sample = min(min_sample, fwd);
              // sample = select(sample, fwd, abs(fwd) > abs(sample));
              // i += 1;
            }

            // sample = 0.4;


            // let c = input.cell / grid;
            // return vec4f(c, 1-c.y, 1);
            let red = vec4f(1, 0, 0, 1);
            let cyan = vec4f(0, 1, 1, 1);
     
            // to make red/cyan checkered grid
            // let grid = vec2u(input.pos.xy) / 8;
            // let checker = (grid.x + grid.y) % 2 == 1;
            // return select(red, cyan, checker);

            // PCM is -1 to 1 btw



            // normalized -1 to 1, where -1 is down and 1 is up
            let yPosNorm = -1 * (2 * (floor(input.pos.y) / HEIGHT) - 1);
            let checker = 
              // same sign
              (yPosNorm * sample) > 0 && 
              // closer to 0
              abs(yPosNorm) <= abs(sample);
          
            let yval = select(f32(0), f32(1), checker);

            let debugVal = select(f32(0), f32(1), 1 > 0);

            let yToSampleDist = 1 - (abs(sample - yPosNorm));

            let ytmax = 1 - (abs(max_sample - yPosNorm));
            let ytmin = 1 - (abs(min_sample - yPosNorm));

            let s = select(f32(0), f32(1), yToSampleDist > 0.99);

            let sup = select(f32(0), f32(1), ytmax > 0.99);
            let sdown = select(f32(0), f32(1), ytmin > 0.99);

            let sfinal = select(f32(0), f32(1), yPosNorm < max_sample && yPosNorm > min_sample);
            return vec4f(0, sfinal, 0, 1);
     
            
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
        {
          binding: 1,
          resource: { buffer: cellStateStorage },
        },
        {
          binding: 2,
          resource: { buffer: channelDataStorage },
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
  }, [GRID_SIZE, audioBuffer, gpu]);
  return (
    <>
      <canvas ref={canvasRef} width="1080" height="256"></canvas>
    </>
  );
}

export function GPUWaveformFromSite({ audioBuffer }: { audioBuffer: AudioBuffer }) {
  const GRID_SIZE = 4;
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

      const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
      // Create a storage buffer to hold the cell state.
      const cellStateStorage = device.createBuffer({
        label: "Cell State",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      // Mark every third cell of the grid as active.
      for (let i = 0; i < cellStateArray.length; i += 3) {
        cellStateArray[i] = 1;
      }
      device.queue.writeBuffer(cellStateStorage, 0, cellStateArray);

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
          struct VertexInput {
            @location(0) pos: vec2f,
            @builtin(instance_index) instance: u32,
          };
          
          struct VertexOutput {
            @builtin(position) pos: vec4f,
            @location(0) cell: vec2f, // New line!
          };

          // At the top of the code string in the createShaderModule() call
          @group(0) @binding(0) var<uniform> grid: vec2f;
          @group(0) @binding(1) var<storage> cellState: array<u32>; // New!


          @vertex
          fn vertexMain(
            @location(0) pos: vec2f,
            @builtin(instance_index) instance: u32
          ) -> VertexOutput {

  
            let i = f32(instance);
            // Compute the cell coordinate from the instance_index
            let cell = vec2f(i % grid.x, floor(i / grid.x));
            let state = f32(cellState[instance]); // New line!

            let cellOffset = cell / grid * 2;
            let gridPos = (pos * state + 1) / grid - 1 + cellOffset;          
          
            var output: VertexOutput;
            output.pos = vec4f(gridPos, 0, 1);
            output.cell = cell; // New line!
            return output;
          }

          struct FragInput {
            @location(0) cell: vec2f,
          };
          
          @fragment
          fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let c = input.cell / grid;
            return vec4f(c, 1-c.y, 1);
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
          {
            binding: 1,
            resource: { buffer: cellStateStorage },
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
