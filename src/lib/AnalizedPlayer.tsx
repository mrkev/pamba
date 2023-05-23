import { CANVAS_HEIGHT, liveAudioContext, sampleSize } from "../constants";
import { CANVAS_WIDTH } from "../constants";
// import SharedBufferWorkletNode from "./lib/shared-buffer-worklet-node";
import { AudioTrack } from "./AudioTrack";
import { initAudioContext } from "./initAudioContext";
import { OscilloscopeNode } from "./OscilloscopeNode";

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
  private readonly oscilloscope = new OscilloscopeNode();

  // Nodes
  private readonly playbackTimeNode = liveAudioContext.createScriptProcessor(sampleSize, 1, 1);
  private readonly mixDownNode: AudioWorkletNode = new AudioWorkletNode(liveAudioContext, "mix-down-processor");
  // private readonly noiseNode: AudioWorkletNode = new AudioWorkletNode(liveAudioContext, "white-noise-processor");
  public isAudioPlaying: boolean = false;
  private cursorAtPlaybackStart: number = 0;

  private oscilloscopeCtx: CanvasRenderingContext2D | null = null;
  private playtimeCtx: CanvasRenderingContext2D | null = null;
  public onFrame: ((playbackTime: number) => void) | null = null;
  public playbackTime: number = 0;

  // The time in the audio context we should count as zero
  CTX_PLAY_START_TIME: number = 0;

  setCanvas(ctx: CanvasRenderingContext2D | null) {
    this.oscilloscopeCtx = ctx;
    this.oscilloscope.canvasCtx = ctx;
  }

  setPlaytimeCanvas(ctx: CanvasRenderingContext2D | null) {
    this.playtimeCtx = ctx;
    this.drawPlaybackTime(0);
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
          this.drawPlaybackTime(currentTimeInBuffer);
          if (this.onFrame) this.onFrame(currentTimeInBuffer);
          this.playbackTime = currentTimeInBuffer;
        });
      } else {
        console.log("NOTHING");
      }
    };
  }

  private drawPlaybackTime(playbackTime: number) {
    const ctx = this.playtimeCtx;
    if (ctx == null) return;
    ctx.font = "12px Helvetica";
    ctx.textAlign = "start";
    ctx.fillStyle = "#ffffff";
    ctx.clearRect(0, 0, 100, 100);
    ctx.fillText(String(playbackTime.toFixed(3)), 3, 13);
  }

  playingTracks: ReadonlyArray<AudioTrack> | null = null;
  // Position of the cursor; where the playback is going to start
  playTracks(tracks: ReadonlyArray<AudioTrack>, cursorPos: number) {
    // Need to connect to dest, otherwrise audio just doesn't flow through. This adds nothing, just silence though
    this.oscilloscope.connect(liveAudioContext.destination);
    this.playbackTimeNode.connect(liveAudioContext.destination);

    this.cursorAtPlaybackStart = cursorPos;

    // .prepareForPlayback can take a while, especially on slow computers,
    // so we prepare all before we acutally play to keep tracks as much in
    // sync as possible
    for (let track of tracks) {
      track.prepareForPlayback(liveAudioContext);
      track.connect(this.mixDownNode);
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
    track.connect(this.mixDownNode);
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
      track.disconnect(this.mixDownNode);
    }
    this.isAudioPlaying = false;
    this.playbackTimeNode.disconnect(liveAudioContext.destination);
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

    const trackDests = await Promise.all(
      tracks.map((track) => {
        return track.prepareForBounce(offlineAudioContext);
      })
    );

    for (let trackDest of trackDests) {
      trackDest.connect(offlineMixDownNode);
    }

    for (let track of tracks) {
      track.startPlayback(startSec);
    }

    const result = await offlineAudioContext.startRendering();
    return result;
  }
}
