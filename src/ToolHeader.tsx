import React, { useCallback, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./globals";
import { AnalizedPlayer } from "./AnalizedPlayer";
import { AudioProject } from "./lib/AudioProject";
import { useLinkedState } from "./lib/LinkedState";
import bufferToWav from "audiobuffer-to-wav";
import { useLinkedArray } from "./lib/LinkedArray";
import { AudioClip } from "./lib/AudioClip";
import { AudioTrack } from "./lib/AudioTrack";
import { useMediaRecorder } from "./lib/useMediaRecorder";

export function ToolHeader({
  project,
  player,
  togglePlayback,
  isAudioPlaying,
  firebaseStoreRef,
  ctxRef,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  togglePlayback: () => void;
  isAudioPlaying: boolean;
  firebaseStoreRef: any;
  ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
}) {
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const [tracks] = useLinkedArray(project.allTracks);
  const [tool] = useLinkedState(project.pointerTool);
  const [bounceURL, setBounceURL] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const loadClip = useCallback(
    async function loadClip(url: string, name?: string) {
      try {
        console.log("LOAD CLIP");
        // load clip
        const clip = await AudioClip.fromURL(url, name);
        const newTrack = AudioTrack.fromClip(clip);
        tracks.push(newTrack);
        console.log("loaded");
      } catch (e) {
        console.trace(e);
        return;
      }
    },
    [tracks]
  );

  const mediaRecorder = useMediaRecorder(loadClip);

  return (
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
                ? player.bounceTracks(tracks._getRaw())
                : player.bounceTracks(tracks._getRaw(), cursorPos, cursorPos + selectionWidth));
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
            {selectionWidth && selectionWidth > 0 ? "bounce selected" : "bounce all"}
          </button>
          {bounceURL && (
            <a href={bounceURL} download={"bounce.wav"}>
              Download bounce
            </a>
          )}

          {tool === "move" ? "move ⇄" : tool === "trimStart" ? "trimStart ⇥" : tool === "trimEnd" ? "trimEnd ⇤" : tool}
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
              const snapshot = await firebaseStoreRef.child("images/" + file.name).put(file, {
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
        {["viper.mp3", "drums.mp3", "clav.mp3", "bassguitar.mp3", "horns.mp3", "leadguitar.mp3"].map(function (url, i) {
          return (
            <button
              key={i}
              draggable
              onDragStart={function (ev: React.DragEvent<HTMLButtonElement>) {
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
  );
}
