import { SPrimitive } from "structured-state";
import { liveAudioContext as liveAudioContextFn, sampleSize } from "../constants";
import { MidiTrack } from "../midi/MidiTrack";
// import SharedBufferWorkletNode from "./lib/shared-buffer-worklet-node";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { Seconds } from "./AbstractClip";
import { AudioTrack } from "./AudioTrack";
import { OscilloscopeNode } from "./OscilloscopeNode";
import { AudioProject } from "./project/AudioProject";

// sbwNode.onInitialized = () => {
//   oscillator.connect(sbwNode).connect(context.destination);
//   oscillator.start();
// };

// sbwNode.onError = (errorData) => {
//   logger.post('[ERROR] ' + errorData.detail);
// };

export class AnalizedPlayer {
  private readonly oscilloscope = new OscilloscopeNode();

  // Nodes
  private readonly playbackTimeNode: TrackedAudioNode<ScriptProcessorNode>;
  private readonly mixDownNode: TrackedAudioNode<AudioWorkletNode>;
  // private readonly noiseNode: AudioWorkletNode = new AudioWorkletNode(liveAudioContext, "white-noise-processor");
  public isAudioPlaying: boolean = false;
  private cursorAtPlaybackStart: number = 0;

  private playtimeCtx: CanvasRenderingContext2D | null = null;

  // For main timeline
  public onFrame: ((playbackTime: number) => void) | null = null;
  // For subview timeline, (ie, clip editor)
  public onFrame2: ((playbackTime: number) => void) | null = null;
  public playbackTime: number = 0;
  public playbackPos = SPrimitive.of(0); // todo keep only hte SState?

  // The time in the audio context we should count as zero
  CTX_PLAY_START_TIME: number = 0;

  setCanvas(ctx: CanvasRenderingContext2D | null) {
    this.oscilloscope.canvasCtx = ctx;
  }

  setPlaytimeCanvas(ctx: CanvasRenderingContext2D | null) {
    if (ctx === this.playtimeCtx) {
      return;
    }
    this.playtimeCtx = ctx;
    this.drawPlaybackTime(0);
  }

  drawPlaybeatTime: ((playbackTime: number) => void) | null = null;

  readonly destination: TrackedAudioNode<AudioDestinationNode>;

  constructor(liveAudioContext: AudioContext) {
    this.destination = TrackedAudioNode.of(liveAudioContext.destination);
    this.playbackTimeNode = TrackedAudioNode.of(liveAudioContext.createScriptProcessor(sampleSize, 1, 1));
    this.mixDownNode = TrackedAudioNode.of(new AudioWorkletNode(liveAudioContext, "mix-down-processor"));
    this.mixDownNode.connect(this.destination);
    this.mixDownNode.connect(this.playbackTimeNode);
    this.mixDownNode.connect(this.oscilloscope.inputNode());

    this.playbackTimeNode.get().onaudioprocess = () => {
      // draw the display if the audio is playing
      if (this.isAudioPlaying === true) {
        // TODO: Raf here to amortize/debounce onaudioprocess being called multiple times? ADD TO OSCILLOSCOPE????
        requestAnimationFrame(() => {
          const [loopStart, loopEnd] = this.playingLoop;
          const timePassed = liveAudioContext.currentTime - this.CTX_PLAY_START_TIME;
          // more like, total time since playback start + cursor at playback start
          let currentTimeInBuffer = this.cursorAtPlaybackStart + timePassed;
          if (
            loopStart != null &&
            // in the loop
            currentTimeInBuffer - loopStart > 0
          ) {
            const loopTime = (currentTimeInBuffer - loopStart) % (loopEnd - loopStart);
            currentTimeInBuffer = loopStart + loopTime;
            // console.log("loop");
          }
          this.drawPlaybackTime(currentTimeInBuffer);
          this.drawPlaybeatTime?.(currentTimeInBuffer);
          if (this.onFrame) this.onFrame(currentTimeInBuffer);
          if (this.onFrame2) this.onFrame2(currentTimeInBuffer);
          this.playbackPos.set(currentTimeInBuffer);
          this.playbackTime = currentTimeInBuffer;
        });
      } else {
        // console.log("NOTHING");
      }
    };
  }

  private drawPlaybackTime(playbackTime: number) {
    const ctx = this.playtimeCtx;
    if (ctx == null) return;
    ctx.font = "24px monospace";
    ctx.textAlign = "start";
    ctx.fillStyle = "#ffffff";
    ctx.clearRect(0, 0, 200, 100);
    ctx.fillText(String(playbackTime.toFixed(2)) + "s", 6, 26);
  }

  playingTracks: ReadonlyArray<AudioTrack | MidiTrack> | null = null;
  playingLoop: readonly [startS: Seconds, endS: Seconds] | readonly [null, null] = [null, null];
  // Position of the cursor; where the playback is going to start
  playTracks(project: AudioProject, tracks: ReadonlyArray<AudioTrack | MidiTrack>, cursorPos: number, tempo: number) {
    const liveAudioContext = liveAudioContextFn();

    console.log("play tracks");

    // Need to connect to dest, otherwrise audio just doesn't flow through. This adds nothing, just silence though
    this.oscilloscope.connect(this.destination);
    this.playbackTimeNode.connect(this.destination);

    this.cursorAtPlaybackStart = cursorPos;
    const loop = AudioProject.playbackWillLoop(project, cursorPos)
      ? ([project.loopStart.secs(project), project.loopEnd.secs(project)] as const)
      : ([null, null] as const);

    // .prepareForPlayback can take a while, especially on slow computers,
    // so we prepare all before we acutally play to keep tracks as much in
    // sync as possible
    for (const track of tracks) {
      track.prepareForPlayback(project, liveAudioContext, cursorPos);
      track.dsp.connect(this.mixDownNode);
    }
    for (const track of tracks) {
      track.startPlayback(tempo, liveAudioContext, cursorPos);
    }
    this.playingTracks = tracks;
    this.playingLoop = loop;
    this.CTX_PLAY_START_TIME = liveAudioContext.currentTime;
    this.isAudioPlaying = true;
  }

  /**
   * Adds a track to playback if we're already playing all tracks.
   */
  addTrackToPlayback(project: AudioProject, track: AudioTrack, startAt: number, tempo: number) {
    const liveAudioContext = liveAudioContextFn();

    if (!this.playingTracks) {
      // TODO: mke playing tracks and isAudioPlaying the same state
      throw new Error("No tracks playing");
    }
    track.dsp.connect(this.mixDownNode);
    this.playingTracks = this.playingTracks.concat(track);
    const LATENCY = 10;
    track.prepareForPlayback(project, liveAudioContext, startAt);
    track.startPlayback(tempo, liveAudioContext, startAt + LATENCY);
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
    const liveAudioContext = liveAudioContextFn();

    if (!this.playingTracks) {
      console.warn("Stopping but no playing tracks on player");
      return;
    }

    if (this.isAudioPlaying === false) {
      return;
    }
    for (const track of this.playingTracks) {
      track.stopPlayback(liveAudioContext);
      track.dsp.disconnect(this.mixDownNode);
    }
    this.isAudioPlaying = false;
    this.playbackTimeNode.disconnect(this.destination);
    this.oscilloscope.disconnect(this.destination);
  }
}
