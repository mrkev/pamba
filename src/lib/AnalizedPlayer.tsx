import { liveAudioContext, sampleSize } from "../globals";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals";
// import SharedBufferWorkletNode from "./lib/shared-buffer-worklet-node";
import { AudioTrack } from "./AudioTrack";
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

export class AnalizedPlayer {
  amplitudeArray: Uint8Array = new Uint8Array();

  // Nodes
  sourceNodes: Array<AudioBufferSourceNode> = [];
  analyserNode = liveAudioContext.createAnalyser();
  javascriptNode = liveAudioContext.createScriptProcessor(sampleSize, 1, 1);
  isAudioPlaying: boolean = false;
  mixDownNode: AudioWorkletNode = new AudioWorkletNode(liveAudioContext, "mix-down-processor");
  noiseNode: AudioWorkletNode = new AudioWorkletNode(liveAudioContext, "white-noise-processor");
  cursorAtPlaybackStart: number = 0;

  canvasCtx: CanvasRenderingContext2D | null = null;
  onFrame: ((playbackTime: number) => void) | null = null;
  playbackTime: number = 0;

  // The time in the audio context we should count as zero
  CTX_PLAY_START_TIME: number = 0;

  constructor() {
    // Set up the audio Analyser, the Source Buffer and javascriptNode
    // Create the array for the data values  // array to hold time domain data
    this.amplitudeArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.mixDownNode.connect(liveAudioContext.destination);
    this.mixDownNode.connect(this.analyserNode);

    // setup the event handler that is triggered every time enough samples have been collected
    // trigger the audio analysis and draw the results
    this.javascriptNode.onaudioprocess = () => {
      // get the Time Domain data for this sample
      this.analyserNode.getByteTimeDomainData(this.amplitudeArray);
      // draw the display if the audio is playing
      if (this.isAudioPlaying === true) {
        requestAnimationFrame(() => {
          const timePassed = liveAudioContext.currentTime - this.CTX_PLAY_START_TIME;
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

  // y-axis: 128 is 0, 0 is -1, 255 is 1
  // x-axis: 1024 samples each time
  drawTimeDomain(amplitudeArray: Uint8Array, playbackTime: number) {
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
    ctx.font = "12px Helvetica";
    ctx.textAlign = "end";
    ctx.fillText(String(playbackTime.toFixed(3)), CANVAS_WIDTH - 2, 12);
  }

  playingTracks: ReadonlyArray<AudioTrack> | null = null;
  // Position of the cursor; where the playback is going to start
  playTracks(tracks: ReadonlyArray<AudioTrack>, cursorPos: number) {
    for (let track of tracks) {
      track.setAudioOut(this.mixDownNode);
    }

    this.analyserNode.connect(this.javascriptNode);
    this.javascriptNode.connect(liveAudioContext.destination);

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
    this.analyserNode.disconnect(this.javascriptNode);
    this.javascriptNode.disconnect(liveAudioContext.destination);
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

    console.log(end);
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
      track.startPlaybackForBounce(offlineAudioContext, startSec);
    }

    const result = await offlineAudioContext.startRendering();
    return result;
  }
}
