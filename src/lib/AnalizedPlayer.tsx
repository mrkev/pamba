import { liveAudioContext, sampleSize } from "../constants";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../constants";
// import SharedBufferWorkletNode from "./lib/shared-buffer-worklet-node";
import { AudioTrack } from "./AudioTrack";
import { DSPNode } from "../dsp/DSPNode";
import { initAudioContext } from "./initAudioContext";

// sbwNode.onInitialized = () => {
//   oscillator.connect(sbwNode).connect(context.destination);
//   oscillator.start();
// };

// sbwNode.onError = (errorData) => {
//   logger.post('[ERROR] ' + errorData.detail);
// };

function getOfflineAudioContext(lenSec: number) {
  return new OfflineAudioContext({
    numberOfChannels: 2,
    length: liveAudioContext.sampleRate * lenSec,
    sampleRate: liveAudioContext.sampleRate,
  });
}

class Oscilloscope extends DSPNode {
  private readonly amplitudeArray: Uint8Array = new Uint8Array();
  private readonly analyserNode = liveAudioContext.createAnalyser();
  private readonly javascriptNode = liveAudioContext.createScriptProcessor(sampleSize, 1, 1);
  public canvasCtx: CanvasRenderingContext2D | null = null;

  public override inputNode(): AudioNode {
    return this.analyserNode;
  }

  public override outputNode(): AudioNode {
    return this.javascriptNode;
  }

  public override prepareForPlayback() {
    this.analyserNode.connect(this.javascriptNode);
  }

  public override stopPlayback() {
    this.analyserNode.disconnect(this.javascriptNode);
  }

  constructor() {
    super();
    // Create the array for the data values
    this.amplitudeArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    // Setup the event handler that is triggered every time enough samples have been collected
    // trigger the audio analysis and draw the results
    this.javascriptNode.onaudioprocess = this.onAduioProcess;
  }

  private onAduioProcess = () => {
    this.analyserNode.getByteTimeDomainData(this.amplitudeArray);
    this.drawTimeDomain(this.amplitudeArray);
  };

  // y-axis: 128 is 0, 0 is -1, 255 is 1
  // x-axis: 1024 samples each time
  private drawTimeDomain(amplitudeArray: Uint8Array) {
    const ctx = this.canvasCtx;
    if (ctx == null) return;

    // let X_STEP = 1; //CANVAS_WIDTH / 1024;
    // let res = 1;
    // find the X_STEP that gives us a resolution
    // closest to 1. This way we can skip samples
    // and draw closer to just one sample per pixel
    // while (X_STEP * 2 < 1) {
    //   res *= 2;
    //   X_STEP *= 2;
    // }
    // ... / 2 because we want to show just half of the buffer
    const STEP_X = Math.floor(amplitudeArray.length / CANVAS_WIDTH) / 2;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (let i = 0; i < CANVAS_WIDTH; i += 1) {
      const value = amplitudeArray[i * STEP_X] / 255; // 0 -> .5 -> 1
      const y = CANVAS_HEIGHT * value;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(i, y, 1, 1);
    }
  }
}

export class AnalizedPlayer {
  private readonly oscilloscope = new Oscilloscope();

  // Nodes
  private readonly playbackTimeNode = liveAudioContext.createScriptProcessor(sampleSize, 1, 1);
  private readonly mixDownNode: AudioWorkletNode = new AudioWorkletNode(liveAudioContext, "mix-down-processor");
  // private readonly noiseNode: AudioWorkletNode = new AudioWorkletNode(liveAudioContext, "white-noise-processor");
  public isAudioPlaying: boolean = false;
  private cursorAtPlaybackStart: number = 0;

  private canvasCtx: CanvasRenderingContext2D | null = null;
  public onFrame: ((playbackTime: number) => void) | null = null;
  public playbackTime: number = 0;

  // The time in the audio context we should count as zero
  CTX_PLAY_START_TIME: number = 0;

  setCanvas(ctx: CanvasRenderingContext2D | null) {
    this.canvasCtx = ctx;
    this.oscilloscope.canvasCtx = ctx;
  }

  constructor() {
    this.mixDownNode.connect(liveAudioContext.destination);
    this.mixDownNode.connect(this.playbackTimeNode);
    this.mixDownNode.connect(this.oscilloscope.inputNode());

    this.playbackTimeNode.onaudioprocess = () => {
      // draw the display if the audio is playing
      if (this.isAudioPlaying === true) {
        // TODO: Raf here to amortize/debounce onaudioprocess being called multiple times? ADD TO OSCILLOSCOPE????
        requestAnimationFrame(() => {
          const timePassed = liveAudioContext.currentTime - this.CTX_PLAY_START_TIME;
          const currentTimeInBuffer = this.cursorAtPlaybackStart + timePassed;
          this.drawTimeDomain(currentTimeInBuffer);
          if (this.onFrame) this.onFrame(currentTimeInBuffer);
          this.playbackTime = currentTimeInBuffer;
        });
      } else {
        console.log("NOTHING");
      }
    };
  }

  // y-axis: 128 is 0, 0 is -1, 255 is 1
  // x-axis: 1024 samples each time
  drawTimeDomain(playbackTime: number) {
    const ctx = this.canvasCtx;
    if (ctx == null) return;
    ctx.font = "12px Helvetica";
    console.log("FOO");
    ctx.textAlign = "end";
    ctx.fillText(String(playbackTime.toFixed(3)), CANVAS_WIDTH - 2, 12);
  }

  playingTracks: ReadonlyArray<AudioTrack> | null = null;
  // Position of the cursor; where the playback is going to start
  playTracks(tracks: ReadonlyArray<AudioTrack>, cursorPos: number) {
    for (let track of tracks) {
      track.setAudioOut(this.mixDownNode);
    }

    this.oscilloscope.prepareForPlayback();
    // Need to connect to dest, otherwrise audio just doesn't flow through. This adds nothing, just silence though
    this.oscilloscope.connect(liveAudioContext.destination);
    this.playbackTimeNode.connect(liveAudioContext.destination);

    this.cursorAtPlaybackStart = cursorPos;

    // .prepareForPlayback can take a while, especially on slow computers,
    // so we prepare all before we acutally play to keep tracks as much in
    // sync as possible
    for (let track of tracks) {
      track.prepareForPlayback(liveAudioContext);
    }
    for (let track of tracks) {
      track.startPlayback(cursorPos);
    }
    this.playingTracks = tracks;

    this.CTX_PLAY_START_TIME = liveAudioContext.currentTime;
    this.isAudioPlaying = true;
  }

  /**
   * Adds a track to playback if we're already playing all tracks.
   */
  addTrackToPlayback(track: AudioTrack, startAt: number) {
    if (!this.playingTracks) {
      // TODO: mke playing tracks and isAudioPlaying the same state
      throw new Error("No tracks playing");
    }
    track.setAudioOut(this.mixDownNode);
    this.playingTracks = this.playingTracks.concat(track);
    const LATENCY = 10;
    track.prepareForPlayback(liveAudioContext);
    track.startPlayback(startAt + LATENCY);
  }

  removeTrackFromPlayback(track: AudioTrack) {
    if (!this.playingTracks) {
      // TODO: mke playing tracks and isAudioPlaying the same state
      throw new Error("No tracks playing");
    }
    track.stopPlayback();
    this.playingTracks = this.playingTracks.filter((t) => t !== track);
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
    this.playbackTimeNode.disconnect(liveAudioContext.destination);
    this.oscilloscope.stopPlayback();
    this.oscilloscope.disconnect(liveAudioContext.destination);
  }

  static async bounceTracks(
    tracks: ReadonlyArray<AudioTrack>,
    startSec: number = 0,
    endSec?: number
  ): Promise<AudioBuffer> {
    let end = endSec;
    // If no end is provided, bounce to the full duration of the track. We go
    // through each clip and find when the last one ends.
    if (endSec == null) {
      for (let track of tracks) {
        for (let clip of track.clips._getRaw()) {
          end = end == null || clip.endOffsetSec > end ? clip.endOffsetSec : end;
          console.log("endOffsetSec", clip.endOffsetSec, end);
        }
      }
    }

    // If we have no clips or no tracks, end will still be null. For now, we'll
    // just throw. I could also return an empty AudioBuffer though.
    if (end == null) {
      throw new Error("Bouncing an empty track!");
    }

    if (end <= startSec) {
      throw new Error("Attempted to render negative or null length");
    }

    const offlineAudioContext = getOfflineAudioContext(end - startSec);
    await initAudioContext(offlineAudioContext);
    const offlineMixDownNode: AudioWorkletNode = new AudioWorkletNode(offlineAudioContext, "mix-down-processor");
    offlineMixDownNode.connect(offlineAudioContext.destination);

    for (let track of tracks) {
      track.setAudioOut(offlineMixDownNode);
    }

    for (let track of tracks) {
      // FIXME: parallel
      await track.prepareForBounce(offlineAudioContext);
    }

    for (let track of tracks) {
      track.startPlayback(startSec);
    }

    const result = await offlineAudioContext.startRendering();
    return result;
  }
}
