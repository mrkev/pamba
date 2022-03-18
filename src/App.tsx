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
import bufferToWav from "audiobuffer-to-wav";

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
  const [bounceURL, setBounceURL] = useState<string | null>(null);
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

  const [viewportStartSecs, setViewportStartSecs] = useLinkedState(
    project.viewportStartSecs
  );

  useEffect(() => {
    if (!projectDiv) {
      return;
    }

    projectDiv.scrollTo({ left: viewportStartSecs });
  }, [projectDiv, viewportStartSecs]);

  useEffect(() => {
    if (!projectDiv) {
      return;
    }

    // var tx = 0;
    // var ty = 0;

    const onWheel = function (e: WheelEvent) {
      // both pinches and two-finger pans trigger the wheel event trackpads.
      // ctrlKey is true for pinches though, so we can use it to differentiate
      // one from the other.
      // console.log("wheel", e);
      if (e.ctrlKey) {
        const sDelta = Math.exp(-e.deltaY / 100);
        const newScale = scaleFactor * Math.exp(-e.deltaY / 100);
        setScaleFactor(newScale);
        const widthUpToMouse = (e as any).layerX as number;
        const deltaX = widthUpToMouse - widthUpToMouse * sDelta;
        const newStart = viewportStartSecs - deltaX;
        console.log("deltaX", deltaX, "sDelta", sDelta);
        setViewportStartSecs(newStart);

        // setScaleFactor((prev) => {
        //   const s = Math.exp(-e.deltaY / 100);
        //   return prev * s;
        // });
        // setViewportStartSecs((prev) => {});
        e.preventDefault();
      } else {
        // const div = projectDiv;
        const start = Math.max(viewportStartSecs + e.deltaX, 0);
        setViewportStartSecs(start);
        // div.scrollBy(e.deltaX, e.deltaY);

        // e.preventDefault();
        // e.preventDefault();
        // // we just allow the div to scroll, no need to do it ourselves
        // // // natural scrolling direction (vs inverted)
        // const natural = true;
        // var direction = natural ? -1 : 1;
        // tx += e.deltaX * direction;
        // // ty += e.deltaY * direction;
        // projectDiv.scrollTo({ left: -tx });
        // console.log("SCROLL", tx);
      }

      // console.log(tx, ty, scale);
    };

    const onScroll = (e: Event) => {
      // console.log(e as any);
      e.preventDefault();
    };

    projectDiv.addEventListener("wheel", onWheel, { capture: true });
    projectDiv.addEventListener("scroll", onScroll, { capture: true });
    return () => {
      projectDiv.removeEventListener("wheel", onWheel, { capture: true });
      projectDiv.addEventListener("scroll", onScroll, { capture: true });
    };
  }, [
    projectDiv,
    scaleFactor,
    setScaleFactor,
    setViewportStartSecs,
    viewportStartSecs,
  ]);

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
              <button
                onClick={async function () {
                  const bounceAll = !selectionWidth || selectionWidth === 0;

                  const result = await (bounceAll
                    ? player.bounceTracks(tracks)
                    : player.bounceTracks(
                        tracks,
                        cursorPos,
                        cursorPos + selectionWidth
                      ));
                  const wav = bufferToWav(result);
                  const blob = new Blob([new DataView(wav)], {
                    type: "audio/wav",
                  });
                  const exportUrl = window.URL.createObjectURL(blob);

                  setBounceURL((prev) => {
                    if (prev) {
                      window.URL.revokeObjectURL(prev);
                    }
                    return exportUrl;
                  });
                }}
              >
                {selectionWidth && selectionWidth > 0
                  ? "bounce selected"
                  : "bounce all"}
              </button>
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
              overflowX: "hidden",
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
                min={Math.log(1)}
                max={Math.log(100)}
                step={0.01}
                value={Math.log(scaleFactor)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setScaleFactor(Math.exp(val));
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
      {bounceURL && (
        <a href={bounceURL} download={"bounce.wav"}>
          Download bounce
        </a>
      )}
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
