import { audioContext, sampleSize } from "./globals";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./App";

export class AnalizedPlayer {
  amplitudeArray: Uint8Array = new Uint8Array();
  sourceNode: AudioBufferSourceNode = audioContext.createBufferSource();
  analyserNode = audioContext.createAnalyser();
  javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1);
  isAudioPlaying: boolean = false;

  canvasCtx: CanvasRenderingContext2D | null = null;
  onFrame: ((playbackTime: number) => void) | null = null;

  // The time in the audio context we should count as zero
  CTX_PLAY_START_TIME: number = 0;

  drawTimeDomain(
    amplitudeArray: Uint8Array,
    playbackTime: number,
    buffer: AudioBuffer
  ) {
    const ctx = this.canvasCtx;
    if (ctx == null) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (let i = 0; i < amplitudeArray.length; i++) {
      let value = amplitudeArray[i] / CANVAS_HEIGHT;
      let y = CANVAS_HEIGHT - CANVAS_HEIGHT * value - 1;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(i, y, 1, 1);
    }
    ctx.font = "20px Helvetica";
    ctx.fillText(String(playbackTime), 20, 20);

    const playbackPercent = playbackTime / buffer.duration;

    ctx.fillRect(playbackPercent * CANVAS_WIDTH, 0, 1, CANVAS_HEIGHT);

    ctx.fillStyle = "#00ff00";
    const cursorPercent = this.cursorPos / buffer.duration;
    ctx.fillRect(cursorPercent * CANVAS_WIDTH, 0, 1, CANVAS_HEIGHT);
  }

  playSound(
    buffer: AudioBuffer,
    drawTimeDomain?: (
      amplitudeArray: Uint8Array,
      playbackTime: number,
      buffer: AudioBuffer,
      player: AnalizedPlayer
    ) => void
  ) {
    // Set up nodes, since not all of them can be re-used
    this.sourceNode = audioContext.createBufferSource();
    this.analyserNode = audioContext.createAnalyser();
    this.javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1);

    // Set up the audio Analyser, the Source Buffer and javascriptNode
    // Create the array for the data values  // array to hold time domain data
    this.amplitudeArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    // Now connect the nodes together
    this.sourceNode.connect(audioContext.destination);
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.javascriptNode);
    this.javascriptNode.connect(audioContext.destination);

    const cursorAtPlaybackStart = this.cursorPos;

    // setup the event handler that is triggered every time enough samples have been collected
    // trigger the audio analysis and draw the results
    this.javascriptNode.onaudioprocess = () => {
      // get the Time Domain data for this sample
      this.analyserNode.getByteTimeDomainData(this.amplitudeArray);
      // draw the display if the audio is playing
      if (this.isAudioPlaying === true) {
        requestAnimationFrame(() => {
          const timePassed =
            audioContext.currentTime - this.CTX_PLAY_START_TIME;
          const currentTimeInBuffer = cursorAtPlaybackStart + timePassed;
          this.drawTimeDomain(this.amplitudeArray, currentTimeInBuffer, buffer);
          if (this.onFrame) this.onFrame(currentTimeInBuffer);
        });
      } else {
        console.log("NOTHING");
      }
    };

    this.CTX_PLAY_START_TIME = audioContext.currentTime;
    this.sourceNode.buffer = buffer;
    this.sourceNode.start(0, this.cursorPos); // Play the sound now
    this.isAudioPlaying = true;
    this.sourceNode.loop = false;
  }

  stopSound() {
    this.sourceNode.stop(0);
    this.isAudioPlaying = false;
    this.sourceNode.disconnect(audioContext.destination);
    this.sourceNode.disconnect(this.analyserNode);
    this.analyserNode.disconnect(this.javascriptNode);
    this.javascriptNode.disconnect(audioContext.destination);
  }

  cursorPos: number = 0;
  setCursorPos(seconds: number) {
    console.log("setting", seconds);
    this.cursorPos = seconds;
  }
}
