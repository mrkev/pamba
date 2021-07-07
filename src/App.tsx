import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { CLIP_HEIGHT, secsToPx, pxToSecs } from "./globals";
import { AudioClip } from "./lib/AudioClip";
import { Clip } from "./ui/Clip";
import { AudioTrack } from "./lib/AudioTrack";
import { AnalizedPlayer } from "./AnalizedPlayer";
import { usePambaFirebaseStoreRef } from "./usePambaFirebaseStoreRef";
import TrackHeader from "./ui/TrackHeader";
import { RecoilRoot } from "recoil";
import { useMediaRecorder } from "./lib/useMediaRecorder";
import { AudioProject, SelectionState } from "./lib/AudioProject";
import { useLinkedState } from "./lib/LinkedState";
import { modifierState, useSingletonModifierState } from "./ModifierState";

export const CANVAS_WIDTH = 512;
export const CANVAS_HEIGHT = 256;

export type Tool = "move" | "trimStart" | "trimEnd";

type CursorState =
  | {
      status: "moving_clip";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      clip: AudioClip;
      track: AudioTrack;
      originalTrack: AudioTrack;
      originalClipOffsetSec: number;
    }
  | {
      status: "selecting";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
    }
  | {
      status: "resizing_clip";
      from: "start" | "end";
      originalClipEndPosSec: number;
      originalClipStartPosSec: number;
      originalClipOffsetSec: number;
      clip: AudioClip;
      clientX: number;
      clientY: number;
    };

function stringOfSelected(sel: SelectionState | null): string {
  if (!sel) {
    return "";
  }

  switch (sel.status) {
    case "clips":
      return JSON.stringify({
        ...sel,
        clips: sel.clips.map(({ clip }) => clip.toString()),
      });

    case "tracks":
      return JSON.stringify({
        ...sel,
        tracks: sel.tracks.map((track) => track.toString()),
      });
  }

  return JSON.stringify(sel);
}

function App() {
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const [projectDiv, setProjectDiv] = useState<null | HTMLDivElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [selectionWidth, setSelectionWidth] = useState<null | number>(null);
  const selectionWidthRef = useRef<null | number>(null);
  const [_, setStateCounter] = useState<number>(0);
  const [tool, setTool] = useState<Tool>("move");
  const [isRecording, setIsRecording] = useState(false);
  const firebaseStoreRef = usePambaFirebaseStoreRef();
  const [player] = useState<AnalizedPlayer>(() => new AnalizedPlayer());
  const [project] = useState(() => new AudioProject());
  useSingletonModifierState(modifierState);

  function rerender() {
    setStateCounter((x) => x + 1);
  }

  const [pressed, setPressed] = useState<CursorState | null>(null);
  const [tracks, setTracks] = useLinkedState(project.tracks);
  const [selected, setSelected] = useLinkedState<SelectionState | null>(
    project.selected
  );

  (window as any).s = selected;

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

  function removeClip(clip: AudioClip, track: AudioTrack) {
    track.removeClip(clip);
    if (selected && selected.status === "clips") {
      // TODO: remove clip from selected clips
    }
    setStateCounter((c) => c + 1);
  }

  function removeTrack(track: AudioTrack) {
    setTracks((tracks) => {
      const pos = tracks.indexOf(track);
      if (pos === -1) {
        return tracks;
      }
      const copy = tracks.map((x) => x);
      copy.splice(pos, 1);
      if (
        selected &&
        selected.status === "tracks" &&
        selected.test.has(track)
      ) {
        // TODO: remove track from selected tracks
      }

      return copy;
    });
  }

  const loadClip = useCallback(async function loadClip(
    url: string,
    name?: string
  ) {
    try {
      console.log("LOAD CLIP");
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
    } catch (e) {
      console.trace(e);
      return;
    }
  },
  []);

  const mediaRecorder = useMediaRecorder(loadClip);

  useEffect(() => {
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
      ) {
        console.log("WOOP");
        return;
      }

      // // On a child element
      // if (e.target !== e.currentTarget) {
      //   console.log("CHILD");
      //   // drag clips around
      // }

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
        pressed.originalTrack.removeClip(pressed.clip);
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

      if (pressed.status === "resizing_clip") {
        setPressed(null);
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

      if (pressed.status === "resizing_clip") {
        const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
        if (pressed.from === "end") {
          const newEndPosSec = Math.max(
            0,
            pressed.originalClipEndPosSec + deltaXSecs
          );
          pressed.clip.trimEndSec = newEndPosSec;
        } else {
          const newStartPosSec = Math.min(
            pressed.clip.lengthSec,
            pressed.originalClipStartPosSec + deltaXSecs
          );
          const newOffset = Math.min(
            pressed.clip.lengthSec,
            Math.max(0, pressed.originalClipOffsetSec + deltaXSecs)
          );
          pressed.clip.trimStartSec = newStartPosSec;
          pressed.clip.startOffsetSec = newOffset;
        }

        setStateCounter((x) => x + 1);
      }

      if (pressed.status === "selecting") {
        const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
        setSelectionWidth(deltaXSecs);
        selectionWidthRef.current = deltaXSecs;
        setSelected(null);
      }
    };

    projectDiv.addEventListener("mousedown", mouseDownEvent, { capture: true });
    document.addEventListener("mouseup", mouseUpEvent);
    document.addEventListener("mousemove", mouseMoveEvent);
    return () => {
      projectDiv.removeEventListener("mousedown", mouseDownEvent, {
        capture: true,
      });
      document.removeEventListener("mouseup", mouseUpEvent);
      document.removeEventListener("mousemove", mouseMoveEvent);
    };
  }, [player, pressed, projectDiv]);

  useEffect(() => {
    function keydownEvent(e: KeyboardEvent) {
      // console.log(e.code);
      switch (e.code) {
        case "Backspace":
          if (!selected) {
            return;
          }
          if (selected.status === "clips") {
            for (let { clip, track } of selected.clips) {
              console.log("remove", selected);
              removeClip(clip, track);
              setSelected(null);
            }
          }
          if (selected.status === "tracks") {
            for (let track of selected.tracks) {
              console.log("remove", selected);
              removeTrack(track);
              setSelected(null);
            }
          }

          // console.log(selectionWidthRef.current);
          break;
      }
    }

    function keyupEvent(e: KeyboardEvent) {}

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
    document.addEventListener("keyup", keyupEvent);
    return function () {
      document.removeEventListener("keydown", keydownEvent);
      document.removeEventListener("keypress", keypressEvent);
      document.removeEventListener("keyup", keyupEvent);
    };
  }, [selected, togglePlayback]);

  useEffect(() => {
    player.onFrame = function (playbackTime) {
      const pbdiv = playbackPosDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(secsToPx(playbackTime)) + "px";
      }
    };
  }, [player]);

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
        player.playTracks(tracks);
      }

      return () => player.stopSound();
    },
    [tracks, isAudioPlaying, player]
  );

  const allState = tracks
    .map((track, i) => {
      return `Track ${i}:\n${track.toString()}\n`;
    })
    .join("\n");

  return (
    <RecoilRoot>
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
                  onDragStart={function (
                    ev: React.DragEvent<HTMLButtonElement>
                  ) {
                    ev.dataTransfer.setData("text", url);
                  }}
                  onClick={function () {
                    loadClip(url);
                  }}
                >
                  load {url}
                </button>
              );
            })}
            <br />
            <hr />
            <br />
            Pressed:{" "}
            {JSON.stringify(pressed, ["status", "clientX", "clientY"], 2)}
            <br />
            Cursor: {cursorPos} {selectionWidth}
            <br />
            Selected: {stringOfSelected(selected)}
            <br />
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
              ctxRef.current = ctx;
            }}
          ></canvas>
        </div>

        <div
          id="container"
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
          }}
        >
          {/* The whole width of this div is 90s */}
          <div
            id="projectDiv"
            ref={(elem) => setProjectDiv(elem)}
            style={{
              position: "relative",
              background: "#ddd",
              paddingBottom: CLIP_HEIGHT,
              overflowX: "scroll",
              width: "100%",
            }}
          >
            {tracks.map(function (track, i) {
              return (
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
                    // console.log("Hovering over", i);
                    if (pressed && pressed.status === "moving_clip") {
                      setPressed((prev) => Object.assign({}, prev, { track }));
                    }
                  }}
                  onMouseUp={() => {
                    // console.log("COOl");
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

                    const isSelected =
                      selected !== null &&
                      selected.status === "clips" &&
                      selected.test.has(clip);

                    return (
                      <Clip
                        key={i}
                        clip={clip}
                        tool={tool}
                        rerender={rerender}
                        selected={isSelected}
                        onMouseDownToResize={function (e, from) {
                          e.stopPropagation();
                          if (tool !== "move") {
                            return;
                          }
                          setPressed({
                            status: "resizing_clip",
                            clip,
                            // IDEA: just clone and have the original clip at hand
                            originalClipEndPosSec: clip.trimEndSec,
                            originalClipStartPosSec: clip.trimStartSec,
                            originalClipOffsetSec: clip.startOffsetSec,
                            from,
                            clientX: e.clientX,
                            clientY: e.clientY,
                          });
                        }}
                        onMouseDownToDrag={function (e) {
                          e.stopPropagation();
                          if (tool !== "move") {
                            return;
                          }
                          setPressed({
                            status: "moving_clip",
                            clientX: e.clientX,
                            clientY: e.clientY,
                            clip,
                            track,
                            originalTrack: track,
                            originalClipOffsetSec: clip.startOffsetSec,
                          });
                          setSelected((prev) => {
                            const selectAdd =
                              modifierState.meta || modifierState.shift;
                            if (
                              selectAdd &&
                              prev !== null &&
                              prev.status === "clips"
                            ) {
                              prev.clips.push({ clip, track });
                              prev.test.add(clip);
                              prev.test.add(track);
                              return { ...prev };
                            } else {
                              return {
                                status: "clips",
                                clips: [{ clip, track }],
                                test: new Set([clip, track]),
                              };
                            }
                          });
                          setSelectionWidth(null);
                        }}
                        style={{
                          position: "absolute",
                          left: secsToPx(clip.startOffsetSec),
                        }}
                      />
                    );
                  })}
                  {/* RENDER CLIP BEING MOVED */}
                  {pressed &&
                    pressed.status === "moving_clip" &&
                    pressed.track === track && (
                      <Clip
                        key={i}
                        clip={pressed.clip}
                        tool={tool}
                        rerender={rerender}
                        selected={true}
                        onMouseDownToResize={function (e, from) {}}
                        onMouseDownToDrag={function (e) {
                          e.stopPropagation();
                        }}
                        style={{
                          position: "absolute",
                          left: secsToPx(pressed.clip.startOffsetSec),
                        }}
                      />
                    )}
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

          {/* Track headers */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "150px",
            }}
          >
            {tracks.map((track) => {
              const isSelected =
                selected !== null &&
                selected.status === "tracks" &&
                selected.test.has(track);
              return (
                <TrackHeader
                  isSelected={isSelected}
                  onRemove={function () {
                    removeTrack(track);
                  }}
                  onSolo={() => {}}
                  track={track}
                  project={project}
                  onMouseDown={function () {
                    setSelected((prev) => {
                      const selectAdd =
                        modifierState.meta || modifierState.shift;
                      if (
                        selectAdd &&
                        prev !== null &&
                        prev.status === "tracks"
                      ) {
                        prev.tracks.push(track);
                        prev.test.add(track);
                        return { ...prev };
                      } else {
                        return {
                          status: "tracks",
                          tracks: [track],
                          test: new Set([track]),
                        };
                      }
                    });
                  }}
                />
              );
            })}
            <div>
              <button
                onClick={function () {
                  setTracks((tracks) => tracks.concat([new AudioTrack()]));
                }}
              >
                new track
              </button>
            </div>
          </div>
        </div>
      </div>
      <pre>{allState}</pre>
    </RecoilRoot>
  );
}

export default App;
