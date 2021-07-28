import { audioContext, sampleSize } from "./globals";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./globals";
// import SharedBufferWorkletNode from "./lib/shared-buffer-worklet-node";
import { AudioTrack } from "./lib/AudioTrack";

// sbwNode.onInitialized = () => {
//   oscillator.connect(sbwNode).connect(context.destination);
//   oscillator.start();
// };

// sbwNode.onError = (errorData) => {
//   logger.post('[ERROR] ' + errorData.detail);
// };

export class AnalizedPlayer {
  amplitudeArray: Uint8Array = new Uint8Array();

  // Nodes
  sourceNodes: Array<AudioBufferSourceNode> = [];
  analyserNode = audioContext.createAnalyser();
  javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1);
  isAudioPlaying: boolean = false;
  mixDownNode: AudioWorkletNode = new AudioWorkletNode(
    audioContext,
    "mix-down-processor"
  );
  noiseNode: AudioWorkletNode = new AudioWorkletNode(
    audioContext,
    "white-noise-processor"
  );
  cursorAtPlaybackStart: number = 0;
  cursorPos: number = 0;

  canvasCtx: CanvasRenderingContext2D | null = null;
  onFrame: ((playbackTime: number) => void) | null = null;
  playbackTime: number = 0;

  // The time in the audio context we should count as zero
  CTX_PLAY_START_TIME: number = 0;

  constructor() {
    // Set up the audio Analyser, the Source Buffer and javascriptNode
    // Create the array for the data values  // array to hold time domain data
    this.amplitudeArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.mixDownNode.connect(audioContext.destination);
    this.mixDownNode.connect(this.analyserNode);

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
          const currentTimeInBuffer = this.cursorAtPlaybackStart + timePassed;
          this.drawTimeDomain(this.amplitudeArray, currentTimeInBuffer);
          if (this.onFrame) this.onFrame(currentTimeInBuffer);
          this.playbackTime = currentTimeInBuffer;
        });
      } else {
        console.log("NOTHING");
      }
    };
  }

  drawTimeDomain(amplitudeArray: Uint8Array, playbackTime: number) {
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
  }

  playingTracks: Array<AudioTrack> | null = null;
  playTracks(tracks: Array<AudioTrack>) {
    for (let track of tracks) {
      track.setAudioOut(this.mixDownNode);
    }

    this.analyserNode.connect(this.javascriptNode);
    this.javascriptNode.connect(audioContext.destination);

    this.cursorAtPlaybackStart = this.cursorPos;

    for (let track of tracks) {
      track.startPlayback(this.cursorPos);
    }
    this.playingTracks = tracks;

    this.CTX_PLAY_START_TIME = audioContext.currentTime;
    this.isAudioPlaying = true;
  }

  stopSound() {
    if (!this.playingTracks) {
      console.warn("Stopping but no playing tracks on player");
      return;
    }

    if (this.isAudioPlaying === false) {
      return;
    }
    for (let track of this.playingTracks) {
      track.stopPlayback();
    }
    this.isAudioPlaying = false;
    this.analyserNode.disconnect(this.javascriptNode);
    this.javascriptNode.disconnect(audioContext.destination);
  }

  setCursorPos(seconds: number) {
    this.cursorPos = seconds;
  }
}
