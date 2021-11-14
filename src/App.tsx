import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { CLIP_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT } from "./globals";
import { AudioClip } from "./lib/AudioClip";
import { AudioTrack } from "./lib/AudioTrack";
import { AnalizedPlayer } from "./AnalizedPlayer";
import { usePambaFirebaseStoreRef } from "./firebase/useFirebase";
import TrackHeader from "./ui/TrackHeader";
import { RecoilRoot } from "recoil";
import { useMediaRecorder } from "./lib/useMediaRecorder";
import { AudioProject, SelectionState } from "./lib/AudioProject";
import { useLinkedState } from "./lib/LinkedState";
import { modifierState, useSingletonModifierState } from "./ModifierState";
import { Axis } from "./Axis";
import { useDerivedState } from "./lib/DerivedState";
import { Track } from "./ui/Track";
import { useAppProjectMouseEvents } from "./ui/useAppProjectMouseEvents";

export type Tool = "move" | "trimStart" | "trimEnd";

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
  const [tool, setTool] = useState<Tool>("move");
  const [isRecording, setIsRecording] = useState(false);
  const firebaseStoreRef = usePambaFirebaseStoreRef();
  const [player] = useState<AnalizedPlayer>(() => new AnalizedPlayer());
  const [project] = useState(() => new AudioProject());

  (window as any).project = project;

  useSingletonModifierState(modifierState);

  const [_, setStateCounter] = useState<number>(0);
  const rerender = useCallback(function () {
    setStateCounter((x) => x + 1);
  }, []);

  const [tracks, setTracks] = useLinkedState(project.allTracks);
  const [selected, setSelected] = useLinkedState(project.selected);
  const [scaleFactor, setScaleFactor] = useLinkedState(project.scaleFactor);
  const [dspExpandedTracks] = useLinkedState(project.dspExpandedTracks);
  const secsToPx = useDerivedState(project.secsToPx);

  const [pressed, cursorPos, selectionWidth] = useAppProjectMouseEvents({
    project,
    projectDiv,
    rerender,
  });

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
  ): Promise<void> {
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
          if (selected.status === "time") {
            // todo
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
        // todo: is there better way to prevent space from toggling the last
        // pressed button?
        if (document.activeElement instanceof HTMLButtonElement) {
          (document.activeElement as any).blur();
        }
        togglePlayback();
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", keydownEvent);
    document.addEventListener("keypress", keypressEvent, { capture: true });
    document.addEventListener("keyup", keyupEvent);
    return function () {
      document.removeEventListener("keydown", keydownEvent);
      document.removeEventListener("keypress", keypressEvent, {
        capture: true,
      });
      document.removeEventListener("keyup", keyupEvent);
    };
  }, [selected, togglePlayback]);

  useEffect(() => {
    player.setCursorPos(cursorPos);
  }, [cursorPos, player]);

  useEffect(() => {
    player.onFrame = function (playbackTime) {
      const pbdiv = playbackPosDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(secsToPx(playbackTime)) + "px";
      }
    };
  }, [player, secsToPx]);

  useEffect(() => {
    const pbdiv = playbackPosDiv.current;
    if (pbdiv) {
      pbdiv.style.left = String(secsToPx(player.playbackTime)) + "px";
    }
  }, [player, secsToPx]);

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
    [tracks, isAudioPlaying, player, project.solodTracks]
  );

  useEffect(function () {
    window.addEventListener(
      "wheel",
      function (e) {
        if (e.ctrlKey) {
          // Your zoom/scale factor

          // setScaleFactor((prev) => ((e.deltaY + 100) / 100) * prev);

          e.preventDefault();
        } else {
          // Your trackpad X and Y positions
          // posX -= e.deltaX * 2;
          // posY -= e.deltaY * 2;
        }

        // render();
      },
      { passive: false }
    );
  });

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
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                columnGap: "6px",
                justifyContent: "right",
              }}
            >
              {tool === "move"
                ? "move ⇄"
                : tool === "trimStart"
                ? "trimStart ⇥"
                : tool === "trimEnd"
                ? "trimEnd ⇤"
                : tool}
              <button disabled={tracks.length === 0} onClick={togglePlayback}>
                {isAudioPlaying ? "stop" : "start"}
              </button>
            </div>
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
            <hr />
          </div>
          <canvas
            style={{
              background: "black",
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
            }}
            width={CANVAS_WIDTH + "px"}
            height={CANVAS_HEIGHT + "px"}
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
            {projectDiv && (
              <Axis project={project} projectDiv={projectDiv}></Axis>
            )}
            {tracks.map(function (track, i) {
              const isDspExpanded = dspExpandedTracks.has(track);
              return (
                <Track
                  key={i}
                  track={track}
                  project={project}
                  loadClipIntoTrack={loadClipIntoTrack}
                  tool={tool}
                  rerender={rerender}
                  isDspExpanded={isDspExpanded}
                />
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
            <div
              className="axis-spacer"
              style={{
                height: "30px",
                display: "flex",
                alignItems: "center",
                flexDirection: "row",
              }}
            >
              {/* Spacer for the axis */}

              <input
                type="range"
                min={1}
                max={20}
                step={0.01}
                value={scaleFactor}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setScaleFactor(val);
                }}
              />
            </div>
            {tracks.map((track, i) => {
              const isSelected =
                selected !== null &&
                selected.status === "tracks" &&
                selected.test.has(track);
              return (
                <TrackHeader
                  key={i}
                  isSelected={isSelected}
                  track={track}
                  project={project}
                />
              );
            })}
            <div>
              <button
                onClick={() => {
                  setTracks((tracks) => tracks.concat([new AudioTrack()]));
                }}
              >
                new track
              </button>
            </div>
          </div>
        </div>
      </div>
      <div>
        Pressed: {JSON.stringify(pressed, ["status", "clientX", "clientY"], 2)}
        <br />
        Cursor: {cursorPos} {selectionWidth}
        <br />
        Selected: {stringOfSelected(selected)}
        <br />
      </div>
      <pre>{allState}</pre>
    </RecoilRoot>
  );
}

export default App;
