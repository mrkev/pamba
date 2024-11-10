import { TOTAL_VERTICAL_NOTES } from "../constants";
import { MidiBuffer } from "../midi/MidiBuffer";
import { nullthrows } from "./nullthrows";

const MAX_NOTE = TOTAL_VERTICAL_NOTES - 1;

// from https://stackoverflow.com/questions/25836447/generating-a-static-waveform-with-webaudio
function drawBuffer(
  width: number,
  height: number,
  context: CanvasRenderingContext2D,
  buffer: MidiBuffer,
  minNote: number,
) {
  const len = buffer.timelineLength.ensurePulses();
  for (let i = 0; i < buffer.notes.length; i++) {
    const [start, num, duration] = nullthrows(buffer.notes.at(i));
    const startPx = Math.floor((start * width) / len);
    const widthPx = Math.ceil((duration * width) / len);
    const y = height - (num - minNote);
    context.fillRect(startPx, y, widthPx, 1);
  }
}

export function dataURLForMidiBuffer(width: number, buffer: MidiBuffer): [string, number] {
  let maxNote = 0;
  let minNote = MAX_NOTE;
  for (let i = 0; i < buffer.notes.length; i++) {
    const [_, num] = nullthrows(buffer.notes.at(i));
    if (num > maxNote) {
      maxNote = num;
    }
    if (num < minNote) {
      minNote = num;
    }
  }

  const noteRange = Math.max(maxNote - minNote, 8);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = noteRange + 1;

  // Get the drawing context
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Couldn't get context for canvas");
  }
  buffer && drawBuffer(width, noteRange, ctx, buffer, minNote);
  return [canvas.toDataURL(), noteRange];
}
