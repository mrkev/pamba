// from https://stackoverflow.com/questions/25836447/generating-a-static-waveform-with-webaudio
export function drawBuffer(width: number, height: number, context: CanvasRenderingContext2D, buffer: AudioBuffer) {
  var data = buffer.getChannelData(0);
  var step = Math.ceil(data.length / width);
  var amp = height / 2;
  for (var i = 0; i < width; i++) {
    var min = 1.0;
    var max = -1.0;
    for (var j = 0; j < step; j++) {
      var datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }
}

export function getImageForBuffer(width: number, height: number, buffer: AudioBuffer): HTMLImageElement {
  const image = new Image();
  image.id = "pic";
  image.src = dataURLForWaveform(width, height, buffer);
  return image;
}

export function dataURLForWaveform(width: number, height: number, buffer: AudioBuffer): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  // Get the drawing context
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Couldn't get context for canvas");
  }
  drawBuffer(width, height, ctx, buffer);
  return canvas.toDataURL();
}
