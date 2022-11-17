// from https://stackoverflow.com/questions/25836447/generating-a-static-waveform-with-webaudio
function drawBuffer(width, height, context, buffer) {
  console.log("RENDERINGGGGGG", width, height, context, buffer);
  var data = buffer;
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
  context.fillStyle = "red";
  context.fillRect(0, 0, 10, 10);
}

// Waiting to receive the OffScreenCanvas
self.onmessage = (event) => {
  const { action, canvas, width, height, buffer } = event.data;
  if (action !== "drawBuffer") {
    throw new Error("Unknown event action " + action);
  }
  const context = canvas.getContext("2d");
  drawBuffer(width, height, context, buffer);
};
