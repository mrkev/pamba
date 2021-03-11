import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { loadSound } from "./lib/loadSound";

const sampleSize = 1024;
const audioContext = new AudioContext();

// A clip of audio
class AudioClip {
  readonly buffer: AudioBuffer;
  readonly duration: number;
  readonly length: number;
  readonly numberOfChannels: number;
  readonly sampleRate: number;

  startOffset: number = 0; // on the timeline, the x position
  name: string;

  constructor(buffer: AudioBuffer, name: string = "untitled") {
    this.buffer = buffer;
    this.duration = buffer.duration;
    this.length = buffer.length;
    this.sampleRate = buffer.sampleRate;
    this.numberOfChannels = buffer.numberOfChannels;
    this.name = name;
  }

  static async fromURL(url: string) {
    const buffer = await loadSound(audioContext, audioUrl);
    return new AudioClip(buffer, url);
  }
}

class AnalizedPlayer {
  amplitudeArray: Uint8Array = new Uint8Array();
  sourceNode: AudioBufferSourceNode = audioContext.createBufferSource();
  analyserNode = audioContext.createAnalyser();
  javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1);
  isAudioPlaying: boolean = false;

  canvasCtx: CanvasRenderingContext2D | null = null;

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
          const currentTimeInBuffer = this.cursorPos + timePassed;
          this.drawTimeDomain(this.amplitudeArray, currentTimeInBuffer, buffer);
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

// This must be hosted on the same server as this page - otherwise you get a Cross Site Scripting error
let audioUrl = "viper.mp3";
// Global variables for the Graphics

// Play the audio and loop until stopped

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

function App() {
  // const [ctx, setCtx] = useState<null | CanvasRenderingContext2D>(null);
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const tDivRef = useRef<null | HTMLDivElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<null | AudioBuffer>(null);
  const [player] = useState(new AnalizedPlayer());

  const [clips, setClips] = useState<Array<AudioClip>>([]);

  useEffect(
    function () {
      if (audioBuffer == null) {
        console.log("NO AUDIO BUFFER");
        return;
      }
      if (isAudioPlaying === false) {
        return;
      }

      if (isAudioPlaying === true) {
        console.log("PLAY");
        player.playSound(audioBuffer);
      }
    },
    [audioBuffer, isAudioPlaying, player]
  );

  return (
    <div className="App">
      <div
        ref={(elem) => {
          // if (!elem) return;
          // tDivRef.current = elem;
          // requestAnimationFrame(function drawTime() {
          //   elem.innerText = String(audioContext.currentTime);
          //   requestAnimationFrame(drawTime);
          // });
        }}
      ></div>
      <canvas
        style={{ background: "black" }}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        ref={(canvas) => {
          if (canvas == null) {
            return;
          }
          const ctx = canvas.getContext("2d");
          player.canvasCtx = ctx;
          // setCtx();
          ctxRef.current = ctx;
        }}
        onClick={function (e) {
          if (isAudioPlaying || !audioBuffer) {
            return;
          }
          const canvas = e.target;
          console.log(canvas instanceof HTMLCanvasElement);
          if (!(canvas instanceof HTMLCanvasElement)) return;
          const position = {
            x: e.clientX - canvas.getBoundingClientRect().x,
            y: e.clientY - canvas.getBoundingClientRect().y,
          };

          player.setCursorPos(
            audioBuffer.duration * (position.x / CANVAS_WIDTH)
          );
        }}
      ></canvas>
      <button
        onClick={async function () {
          try {
            // load buffer
            const buffer = await loadSound(audioContext, audioUrl);
            setAudioBuffer(buffer);
            // load clip
            const clip = await AudioClip.fromURL("viper.mp3");
            const newClips = clips.concat([clip]);
            setClips(newClips);
            console.log("loaded");
          } catch (e) {
            console.trace(e);
            return;
          }
        }}
      >
        load
      </button>
      <button
        onClick={function () {
          setIsAudioPlaying(true);
        }}
      >
        start
      </button>
      <button
        onClick={() => {
          player.stopSound();
          setIsAudioPlaying(false);
        }}
      >
        stop
      </button>
      <div style={{ position: "relative" }}>
        {clips.map(function (clip, i) {
          return (
            <div
              key={i}
              style={{
                background: "#ccffcc",
                width: clip.duration * 10,
                userSelect: "none",
                border: "1px solid #bbeebb",
                position: "relative",
                left: clip.startOffset * 10,
              }}
            >
              {clip.name}
            </div>
          );
        })}
        {/* <div
          style={{
            background: "red",
            width: "1px",
            height: 100,
            position: "absolute",
            left: cursorPos * 10,
            top: 0,
          }}
        ></div> */}
      </div>
      <button
        onClick={async function () {
          const clip = await AudioClip.fromURL("viper.mp3");
          const newClips = clips.concat([clip]);
          setClips(newClips);
        }}
      >
        load clip
      </button>
    </div>
  );
}

export default App;
