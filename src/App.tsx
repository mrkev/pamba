import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { loadSound } from "./lib/loadSound";
import { dataURLForWaveform } from "./lib/waveform";

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

  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private memodWaveformDataURL: { dims: [number, number]; data: string } = {
    dims: [0, 0],
    data: "",
  };
  getWaveformDataURL(width: number, height: number) {
    const {
      dims: [w, h],
      data,
    } = this.memodWaveformDataURL;
    if (width === w && height === h) {
      return data;
    }
    console.log("generated waveform for", this.name);
    return dataURLForWaveform(width, height, this.buffer);
  }

  static async fromURL(url: string) {
    const buffer = await loadSound(audioContext, url);
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

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

// from https://stackoverflow.com/questions/57155167/web-audio-api-playing-synchronized-sounds
function mixDown(
  clipList: Array<AudioClip>,
  // totalLength: number,
  numberOfChannels = 2
) {
  let totalLength = 0;

  for (let track of clipList) {
    if (track.length > totalLength) {
      totalLength = track.length;
    }
  }

  //create a buffer using the totalLength and sampleRate of the first buffer node
  let finalMix = audioContext.createBuffer(
    numberOfChannels,
    totalLength,
    clipList[0].sampleRate
  );

  //first loop for buffer list
  for (let i = 0; i < clipList.length; i++) {
    // second loop for each channel ie. left and right
    for (let channel = 0; channel < numberOfChannels; channel++) {
      //here we get a reference to the final mix buffer data
      let buffer = finalMix.getChannelData(channel);

      //last is loop for updating/summing the track buffer with the final mix buffer
      for (let j = 0; j < clipList[i].length; j++) {
        buffer[j] += clipList[i].buffer.getChannelData(channel)[j];
      }
    }
  }

  return finalMix;
}

function App() {
  // const [ctx, setCtx] = useState<null | CanvasRenderingContext2D>(null);
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const tDivRef = useRef<null | HTMLDivElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  // const [audioBuffer, setAudioBuffer] = useState<null | AudioBuffer>(null);
  const [player] = useState(new AnalizedPlayer());

  const [clips, setClips] = useState<Array<AudioClip>>([]);

  useEffect(
    function () {
      if (clips.length < 1) {
        console.log("NO AUDIO BUFFER");
        return;
      }
      if (isAudioPlaying === false) {
        return;
      }

      if (isAudioPlaying === true) {
        console.log("PLAY");
        // const audioBuffer = clips[0].buffer;
        // player.playSound(audioBuffer);

        const mixBuffer = mixDown(clips, 2);
        player.playSound(mixBuffer);

        // const mix = audioContext.createBufferSource();
        // mix.buffer = mixDown(clips, 2);

        //call our function here

        // mix.connect(audioContext.destination);

        //will playback the entire mixdown
        // mix.start();
      }
    },
    [clips, isAudioPlaying, player]
  );

  async function loadClip(url: string) {
    try {
      // load clip
      const clip = await AudioClip.fromURL(url);
      const newClips = clips.concat([clip]);
      setClips(newClips);
      console.log("loaded");
    } catch (e) {
      console.trace(e);
      return;
    }
  }

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
          const audioBuffer = clips[0] && clips[0].buffer;
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
      {[
        "viper.mp3",
        "drums.mp3",
        "clav.mp3",
        "bassguitar.mp3",
        "horns.mp3",
        "leadguitar.mp3",
      ].map(function (url, i) {
        return (
          <button
            key={i}
            onClick={async function () {
              loadClip(url);
            }}
          >
            load {url}
          </button>
        );
      })}
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
          const width = clip.duration * 10;
          const height = 20;
          return (
            <div
              key={i}
              style={{
                background: i === 0 ? "#ccccbb" : "#ccffcc",
                backgroundImage:
                  "url('" + clip.getWaveformDataURL(width, height) + "')",
                width,
                height,
                userSelect: "none",
                border: "1px solid #bbeebb",
                position: "relative",
                color: "white",
                left: clip.startOffset * 10,
              }}
            >
              {/* <img
                style={{ position: "absolute", left: 0, top: 0 }}
                src={}
                alt="waveform"
              /> */}
              <span style={{ color: "white", background: "black" }}>
                {clip.name}
              </span>
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
    </div>
  );
}

export default App;
