import { SharedAudioBuffer } from "../lib/SharedAudioBuffer";

// export function getImageForBuffer(width: number, height: number, buffer: SharedAudioBuffer): HTMLImageElement {
//   const image = new Image();
//   image.id = "pic";
//   // image.src = dataURLForWaveform(width, height, buffer);
//   return image;
// }

export function dataWaveformToCanvas(
  width: number,
  height: number,
  audio: SharedAudioBuffer,
  canvas: HTMLCanvasElement
): void {
  // const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const worker = new Worker("waveform-render-worker.js");
  const offscreenCanvas = (canvas as any).transferControlToOffscreen();
  const buffer = audio.channels[0]; // todo, error check

  worker.postMessage({ action: "drawBuffer", canvas: offscreenCanvas, width, height, buffer }, [offscreenCanvas]);

  // // Get the drawing context
  // const ctx = canvas.getContext("2d");
  // if (!ctx) {
  //   throw new Error("Couldn't get context for canvas");
  // }
  // return canvas.toDataURL();
}
