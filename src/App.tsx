import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { CLIP_HEIGHT, secsToPx, pxToSecs } from "./globals";
import { AudioClip } from "./AudioClip";
import { mixDown } from "./mixDown";
import { Clip } from "./ui/Clip";
import { AudioTrack } from "./AudioTrack";
import { AnalizedPlayer } from "./AnalizedPlayer";
import { usePambaFirebaseStoreRef } from "./usePambaFirebaseStoreRef";

export const CANVAS_WIDTH = 512;
export const CANVAS_HEIGHT = 256;

export type Tool = "move" | "trimStart" | "trimEnd";

type CursorState =
  | {
      status: "moving_clip";
      clientX: number;
      clientY: number;
      clip: AudioClip;
      track: AudioTrack;
      originalClipOffsetSec: number;
    }
  | {
      status: "selecting";
      clientX: number;
      clientY: number;
    };

function App() {
  // const [ctx, setCtx] = useState<null | CanvasRenderingContext2D>(null);
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const [projectDiv, setProjectDiv] = useState<null | HTMLDivElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [selectionWidth, setSelectionWidth] = useState<null | number>(null);
  const selectionWidthRef = useRef<null | number>(null);
  // const [audioBuffer, setAudioBuffer] = useState<null | AudioBuffer>(null);
  const [clipOfElem] = useState(new Map<HTMLDivElement, AudioClip>());
  const [_, setStateCounter] = useState<number>(0);
  const [tool, setTool] = useState<Tool>("move");
  const [mediaRecorder, setMediaRecorder] =
    useState<null | MediaRecorder>(null);
  const [isRecording, setIsRecording] = useState(false);
  const firebaseStoreRef = usePambaFirebaseStoreRef();
  const [tracks, setTracks] = useState<Array<AudioTrack>>([]);
  const [player] = useState<AnalizedPlayer>(() => new AnalizedPlayer());

  function rerender() {
    setStateCounter((x) => x + 1);
  }

  const [pressed, setPressed] = useState<CursorState | null>(null);

  const togglePlayback = useCallback(
    function togglePlayback() {
      if (isAudioPlaying) {
        player.stopSound();
        setIsAudioPlaying(false);
      } else {
        setIsAudioPlaying(true);
      }
    },
    [isAudioPlaying]
  );

  function removeClip(clip: AudioClip, track: AudioTrack) {
    track.removeClip(clip);
    setStateCounter((c) => c + 1);
  }

  const loadClip = useCallback(async function loadClip(
    url: string,
    name?: string
  ) {
    try {
      // load clip
      const clip = await AudioClip.fromURL(url, name);
      const newTrack = AudioTrack.fromClip(clip);
      setTracks((tracks) => tracks.concat([newTrack]));
      console.log("loaded");
    } catch (e) {
      console.trace(e);
      return;
    }
  },
  []);

  const loadClipIntoTrack = useCallback(async function loadClipIntoTrack(
    url: string,
    track: AudioTrack,
    name?: string
  ) {
    try {
      // load clip
      const clip = await AudioClip.fromURL(url, name);
      track.pushClip(clip);
      setTracks((tracks) => [...tracks]);
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

          setSelectionWidth(null);
          selectionWidthRef.current = null;
          setPressed({
            status: "selecting",
            clientX: e.clientX,
            clientY: e.clientY,
          });
        }
      };

      const mouseUpEvent = function (e: MouseEvent) {
        if (!pressed) {
          return;
        }

        if (pressed.status === "moving_clip") {
          pressed.track.deleteTime(
            pressed.clip.startOffsetSec,
            pressed.clip.endOffsetSec
          );
          pressed.track.removeClip(pressed.clip);
          pressed.track.addClip(pressed.clip);

          // const deltaX = e.clientX - pressed.clientX;
          // const asSecs = pxToSecs(deltaX);
          // const newOffset = pressed.clip.startOffsetSec + asSecs;
          // // console.log(newOffset)
          // pressed.clip.startOffsetSec = newOffset <= 0 ? 0 : newOffset;
          setPressed(null);
        }

        if (pressed.status === "selecting") {
          setPressed(null);
          const curSel = selectionWidthRef.current;
          if (curSel == null || curSel > 0) {
            return;
          }

          // Move the cursor to the beggining of the selection
          // and make the selection positive
          setCursorPos((pos) => {
            player.setCursorPos(pos + curSel);
            return pos + curSel;
          });

          setSelectionWidth(Math.abs(curSel));
        }
      };

      const mouseMoveEvent = function (e: MouseEvent) {
        if (!pressed) {
          return;
        }
        if (pressed.status === "moving_clip") {
          const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
          const newOffset = Math.max(
            0,
            pressed.originalClipOffsetSec + deltaXSecs
          );
          pressed.clip.startOffsetSec = newOffset;
          setStateCounter((x) => x + 1);
        }

        if (pressed.status === "selecting") {
          const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
          setSelectionWidth(deltaXSecs);
          selectionWidthRef.current = deltaXSecs;
        }
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
    [clipOfElem, pressed, projectDiv]
  );

  useEffect(
    function () {
      function keydownEvent(e: KeyboardEvent) {
        console.log(e.code);
        switch (e.code) {
          case "Backspace":
            console.log(selectionWidthRef.current);
            break;
        }
      }

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
          default:
            console.log(e.code);
        }
        if (e.code === "Space") {
          togglePlayback();
        }
      }

      document.addEventListener("keydown", keydownEvent);
      document.addEventListener("keypress", keypressEvent);
      return function () {
        document.removeEventListener("keydown", keydownEvent);
        document.removeEventListener("keypress", keypressEvent);
      };
    },
    [togglePlayback]
  );

  useEffect(function () {
    player.onFrame = function (playbackTime) {
      const pbdiv = playbackPosDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(secsToPx(playbackTime)) + "px";
      }
    };
  }, []);

  useEffect(
    function () {
      if (tracks.length < 1) {
        console.log("NO AUDIO BUFFER");
        return;
      }
      if (isAudioPlaying === false) {
        return;
      }
      if (isAudioPlaying === true) {
        console.log("PLAY");
        const trackClips = tracks.flatMap((track) => track.clips);
        const mixBuffer = mixDown(trackClips, 2);
        player.playSound(mixBuffer);
      }
    },
    [tracks, isAudioPlaying]
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
          <button disabled={tracks.length === 0} onClick={togglePlayback}>
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
                draggable
                onDragStart={function (ev: React.DragEvent<HTMLButtonElement>) {
                  ev.dataTransfer.setData("text", url);
                }}
                onClick={async function () {
                  loadClip(url);
                }}
              >
                load {url}
              </button>
            );
          })}
          <br />
          <hr />
          <button
            onClick={function () {
              setTracks((tracks) => tracks.concat([new AudioTrack()]));
            }}
          >
            new track
          </button>
          Pressed:{" "}
          {JSON.stringify(pressed, ["status", "clientX", "clientY"], 2)}
          Cursor: {cursorPos} {selectionWidth}
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
            const audioBuffer =
              tracks[0] && tracks[0].clips[0] && tracks[0].clips[0].buffer;
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
        {tracks.map(function (track, i) {
          return (
            <div style={{ position: "relative" }} key={i}>
              <div
                onDrop={function (ev) {
                  ev.preventDefault();
                  const url = ev.dataTransfer.getData("text");
                  loadClipIntoTrack(url, track);
                }}
                onDragOver={function allowDrop(ev) {
                  ev.preventDefault();
                }}
                onMouseEnter={function () {
                  console.log("Hovering over", i);
                  if (pressed && pressed.status === "selecting") {
                    setPressed((prev) => Object.assign({}, prev, { track }));
                  }
                }}
                style={{
                  position: "relative",
                  borderBottom: "1px solid black",
                  height: CLIP_HEIGHT,
                }}
              >
                {track.clips.map((clip, i) => {
                  if (
                    pressed &&
                    pressed.status === "moving_clip" &&
                    pressed.track !== track &&
                    pressed.clip === clip
                  ) {
                    return null;
                  }

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
                          status: "moving_clip",
                          clientX: e.clientX,
                          clientY: e.clientY,
                          clip,
                          track,
                          originalClipOffsetSec: clip.startOffsetSec,
                        });
                      }}
                      onRemove={function () {
                        removeClip(clip, track);
                      }}
                      style={{
                        position: "absolute",
                        left: secsToPx(clip.startOffsetSec),
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  background: "white",
                  height: "100%",
                  width: "120px",
                }}
              >
                Track {i}
                <button
                  onClick={function () {
                    setTracks((tracks) => {
                      const pos = tracks.indexOf(track);
                      if (pos === -1) {
                        return tracks;
                      }
                      const copy = tracks.map((x) => x);
                      copy.splice(pos, 1);
                      return copy;
                    });
                  }}
                >
                  remove track
                </button>
              </div>
            </div>
          );
        })}
        <div
          // ref={cursorPosDiv}
          style={{
            backdropFilter: "invert(100%)",
            height: "100%",
            position: "absolute",
            userSelect: "none",
            pointerEvents: "none",
            left:
              selectionWidth == null || selectionWidth >= 0
                ? secsToPx(cursorPos)
                : secsToPx(cursorPos + selectionWidth),
            width:
              selectionWidth == null || selectionWidth === 0
                ? 1
                : secsToPx(Math.abs(selectionWidth)),
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
