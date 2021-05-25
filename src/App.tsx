import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import {
  audioContext,
  sampleSize,
  CLIP_HEIGHT,
  secsToPx,
  pxToSecs,
} from "./globals";
import { AudioClip } from "./AudioClip";
import { mixDown } from "./mixDown";
import { Clip } from "./ui/Clip";
import firebase from "firebase";

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 256;

export type Tool = "move" | "trimStart" | "trimEnd";

class AnalizedPlayer {
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

function App() {
  // const [ctx, setCtx] = useState<null | CanvasRenderingContext2D>(null);
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const [projectDiv, setProjectDiv] = useState<null | HTMLDivElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  // const [audioBuffer, setAudioBuffer] = useState<null | AudioBuffer>(null);
  const [player] = useState(new AnalizedPlayer());
  const [clipOfElem] = useState(new Map<HTMLDivElement, AudioClip>());
  const [clips, setClips] = useState<Array<AudioClip>>([]);
  const [_, setStateCounter] = useState<number>(0);
  const [tool, setTool] = useState<Tool>("move");
  const [mediaRecorder, setMediaRecorder] =
    useState<null | MediaRecorder>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [firebaseStoreRef, setFirebaseStoreRef] =
    useState<firebase.storage.Reference | null>(null);

  function rerender() {
    setStateCounter((x) => x + 1);
  }

  const [pressed, setPressed] =
    useState<{
      clientX: number;
      clientY: number;
      clip: AudioClip;
      originalClipOffsetSec: number;
    } | null>(null);

  const togglePlayback = useCallback(
    function togglePlayback() {
      if (isAudioPlaying) {
        player.stopSound();
        setIsAudioPlaying(false);
      } else {
        setIsAudioPlaying(true);
      }
    },
    [isAudioPlaying, player]
  );

  function removeClip(clip: AudioClip) {
    setClips((clips) => clips.filter((x) => x !== clip));
  }

  const loadClip = useCallback(async function loadClip(
    url: string,
    name?: string
  ) {
    try {
      // load clip
      const clip = await AudioClip.fromURL(url, name);
      setClips((clips) => clips.concat([clip]));
      console.log("loaded");
    } catch (e) {
      console.trace(e);
      return;
    }
  },
  []);

  // Microphone recording
  useEffect(
    function () {
      navigator.mediaDevices
        .getUserMedia({
          audio: true,
        })
        .then(function (mediaStream: MediaStream) {
          let chunks: Array<BlobPart> = [];
          const mediaRecorder = new MediaRecorder(mediaStream);
          mediaRecorder.ondataavailable = function (e) {
            chunks.push(e.data);
          };
          mediaRecorder.onstop = function (e) {
            console.log("data available after MediaRecorder.stop() called.");
            const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
            chunks = [];
            const audioURL = window.URL.createObjectURL(blob);
            // audio.src = audioURL;
            loadClip(audioURL, "recording");
            console.log("recorder stopped");
          };
          setMediaRecorder(mediaRecorder);
        })
        .catch(console.error);
    },
    [loadClip]
  );

  // Firebase storage
  useEffect(function () {
    // Your web app's Firebase configuration
    var firebaseConfig = {
      apiKey: "AIzaSyBhdehFiYqwx3ahC5yCh6NTQgW7NxZMXvk",
      authDomain: "pamba-c5951.firebaseapp.com",
      projectId: "pamba-c5951",
      storageBucket: "pamba-c5951.appspot.com",
      messagingSenderId: "204416012722",
      appId: "1:204416012722:web:9e00b129f067d20c4894ab",
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    const auth = firebase.auth();

    auth.onAuthStateChanged(function (user) {
      if (user) {
        console.log("Anonymous user signed-in.", user);
        setFirebaseStoreRef(firebase.storage().ref());
      } else {
        setFirebaseStoreRef(null);
        console.log(
          "There was no anonymous session. Creating a new anonymous user."
        );
        // Sign the user in anonymously since accessing Storage requires the user to be authorized.
        auth.signInAnonymously().catch(function (error) {
          if (error.code === "auth/operation-not-allowed") {
            window.alert(
              "Anonymous Sign-in failed. Please make sure that you have enabled anonymous " +
                "sign-in on your Firebase project."
            );
          } else {
            setFirebaseStoreRef(firebase.storage().ref());
          }
        });
      }
    });
  }, []);

  useEffect(
    function () {
      if (!projectDiv) {
        return;
      }

      const mouseDownEvent = function (e: MouseEvent) {
        // currentTarget should always be the element the event is attatched to,
        // so our project div.
        const { target, currentTarget } = e;
        if (
          !(target instanceof HTMLDivElement) ||
          !(currentTarget instanceof HTMLDivElement)
        )
          return;

        // pressed = {
        //   elem: currentTarget,
        //   startClientX: e.clientX,
        //   startClientY: e.clientY,
        //   clip: clipOfElem.get(target) ?? null,
        // };
        // On a child element
        if (e.target !== e.currentTarget) {
          // drag clips around
        }

        // On the project div element
        else {
          const div = e.currentTarget;
          if (!(div instanceof HTMLDivElement)) return;
          const position = {
            x: e.clientX + div.scrollLeft - div.getBoundingClientRect().x,
            y: e.clientY + div.scrollTop - div.getBoundingClientRect().y,
          };

          const asSecs = pxToSecs(position.x);
          player.setCursorPos(asSecs);
          setCursorPos(asSecs);
        }
      };

      const mouseUpEvent = function (e: MouseEvent) {
        if (!pressed) {
          return;
        }

        // const deltaX = e.clientX - pressed.clientX;
        // const asSecs = pxToSecs(deltaX);
        // const newOffset = pressed.clip.startOffsetSec + asSecs;
        // // console.log(newOffset)
        // pressed.clip.startOffsetSec = newOffset <= 0 ? 0 : newOffset;
        setPressed(null);
      };

      const mouseMoveEvent = function (e: MouseEvent) {
        if (!pressed) {
          return;
        }
        const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
        const newOffset = Math.max(
          0,
          pressed.originalClipOffsetSec + deltaXSecs
        );
        pressed.clip.startOffsetSec = newOffset;
        setStateCounter((x) => x + 1);
      };

      projectDiv.addEventListener("mousedown", mouseDownEvent);
      document.addEventListener("mouseup", mouseUpEvent);
      document.addEventListener("mousemove", mouseMoveEvent);
      return () => {
        projectDiv.removeEventListener("mousedown", mouseDownEvent);
        document.removeEventListener("mouseup", mouseUpEvent);
        document.removeEventListener("mousemove", mouseMoveEvent);
      };
    },
    [clipOfElem, player, pressed, projectDiv]
  );

  useEffect(
    function () {
      function keypressEvent(e: KeyboardEvent) {
        switch (e.code) {
          case "KeyM":
            setTool("move");
            break;
          case "KeyS":
            setTool("trimStart");
            break;
          case "KeyE":
            setTool("trimEnd");
            break;
        }
        console.log(e.code);
        if (e.code === "Space") {
          togglePlayback();
        }
      }

      document.addEventListener("keypress", keypressEvent);
      return function () {
        document.removeEventListener("keypress", keypressEvent);
      };
    },
    [togglePlayback]
  );

  useEffect(
    function () {
      player.onFrame = function (playbackTime) {
        const pbdiv = playbackPosDiv.current;
        if (pbdiv) {
          pbdiv.style.left = String(secsToPx(playbackTime)) + "px";
        }
      };
    },
    [player]
  );

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
        const mixBuffer = mixDown(clips, 2);
        player.playSound(mixBuffer);
      }
    },
    [clips, isAudioPlaying, player]
  );

  return (
    <div className="App">
      {/* <div
        ref={(elem) => {
          // if (!elem) return;
          // tDivRef.current = elem;
          // requestAnimationFrame(function drawTime() {
          //   elem.innerText = String(audioContext.currentTime);
          //   requestAnimationFrame(drawTime);
          // });
        }}
      ></div> */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
        }}
      >
        <div style={{ flexGrow: 1 }}>
          <br />
          <button disabled={clips.length === 0} onClick={togglePlayback}>
            {isAudioPlaying ? "stop" : "start"}
          </button>
          {tool}

          <br />
          {/* <input
            value={""}
            type="file"
            accept="audio/*"
            onChange={function (e) {
              const files = e.target.files || [];
              const url = URL.createObjectURL(files[0]);
              loadClip(url, files[0].name);
            }}
          /> */}

          {firebaseStoreRef && (
            <input
              value={""}
              type="file"
              accept="audio/*"
              onChange={async function (e) {
                const file = (e.target.files || [])[0];
                if (!file) {
                  console.log("NO FILE");
                  return;
                }
                // Push to child path.
                const snapshot = await firebaseStoreRef
                  .child("images/" + file.name)
                  .put(file, {
                    contentType: file.type,
                  });

                console.log("Uploaded", snapshot.totalBytes, "bytes.");
                console.log("File metadata:", snapshot.metadata);
                // Let's get a download URL for the file.
                const url = await snapshot.ref.getDownloadURL();
                console.log("File available at", url);
                loadClip(url, file.name);
              }}
            />
          )}
          {mediaRecorder && (
            <button
              onClick={function () {
                if (!isRecording) {
                  mediaRecorder.start();
                  setIsRecording(true);
                } else {
                  mediaRecorder.stop();
                  setIsRecording(false);
                }
              }}
            >
              {!isRecording ? "record" : "stop recording"}
            </button>
          )}
          <br />
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
        </div>
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
            if (!(canvas instanceof HTMLCanvasElement)) return;
            const position = {
              x: e.clientX - canvas.getBoundingClientRect().x,
              y: e.clientY - canvas.getBoundingClientRect().y,
            };

            player.setCursorPos(
              audioBuffer.duration * (position.x / CANVAS_WIDTH)
            );
            setCursorPos(audioBuffer.duration * (position.x / CANVAS_WIDTH));
          }}
        ></canvas>
      </div>

      {/* The whole width of this div is 90s */}
      <div
        ref={(elem) => setProjectDiv(elem)}
        style={{
          position: "relative",
          background: "#eeeeee",
          width: "100%",
          paddingBottom: CLIP_HEIGHT,
          overflowX: "scroll",
        }}
      >
        {clips.map(function (clip, i) {
          return (
            <Clip
              key={i}
              clip={clip}
              tool={tool}
              rerender={rerender}
              onMouseDownToDrag={function (e) {
                if (tool !== "move") {
                  return;
                }
                setPressed({
                  clientX: e.clientX,
                  clientY: e.clientY,
                  clip,
                  originalClipOffsetSec: clip.startOffsetSec,
                });
              }}
              onRemove={function () {
                removeClip(clip);
              }}
            />
          );
        })}
        <div
          // ref={cursorPosDiv}
          style={{
            background: "green",
            width: "1px",
            height: "100%",
            position: "absolute",
            left: secsToPx(cursorPos),
            top: 0,
          }}
        ></div>
        <div
          ref={playbackPosDiv}
          style={{
            background: "red",
            width: "1px",
            height: "100%",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        ></div>
      </div>
    </div>
  );
}

export default App;
