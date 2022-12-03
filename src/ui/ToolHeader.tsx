import React, { useCallback, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../globals";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { useLinkedState } from "../lib/state/LinkedState";
import { useLinkedArray } from "../lib/state/LinkedArray";
import AudioClip from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { useMediaRecorder } from "../lib/useMediaRecorder";
import { ignorePromise } from "../lib/ignorePromise";

function ToolSelector({ project }: { project: AudioProject }) {
  const [tool] = useLinkedState(project.pointerTool);
  return (
    <div>
      <button>⇄</button>
      <button>⇥</button>
      <button>⇤</button>
      {tool === "move" ? "move ⇄" : tool === "trimStart" ? "trimStart ⇥" : tool === "trimEnd" ? "trimEnd ⇤" : tool}
    </div>
  );
}

function TransportControl({
  project,
  renderer,
  player,
  loadClip,
}: {
  loadClip: (url: string, name?: string) => Promise<void>;
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
}) {
  const mediaRecorder = useMediaRecorder(loadClip);
  const [tracks] = useLinkedArray(project.allTracks);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);

  return (
    <div>
      <button disabled={tracks.length === 0} onClick={() => AudioRenderer.togglePlayback(renderer, project, player)}>
        {isAudioPlaying ? "\u23f9" /*stop*/ : "\u23f5" /*play*/}
      </button>
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
          {!isRecording ? "\u23fa" : "stop recording"}
        </button>
      )}
    </div>
  );
}

export function ToolHeader({
  project,
  player,
  renderer,
  firebaseStoreRef,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
  firebaseStoreRef: any;
}) {
  const ctxRef = useRef<null | CanvasRenderingContext2D>(null);
  const [bounceURL] = useLinkedState<string | null>(renderer.bounceURL);
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");

  const loadClip = useCallback(
    async function loadClip(url: string, name?: string) {
      try {
        console.log("LOAD CLIP");
        // load clip
        const clip = await AudioClip.fromURL(url, name);
        const newTrack = AudioTrack.fromClip(clip);
        AudioProject.addTrack(project, player, newTrack);
        console.log("loaded");
      } catch (e) {
        console.trace(e);
        return;
      }
    },
    [player, project]
  );

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
            justifyContent: "space-between",
          }}
        >
          {firebaseStoreRef && (
            <UploadButton
              value={uploadStatus === "idle" ? "upload audio" : "uploading..."}
              disabled={uploadStatus === "uploading"}
              accept="audio/*"
              onChange={async function (e) {
                const file = (e.target.files || [])[0];
                if (!file) {
                  console.log("NO FILE");
                  return;
                }
                setUploadStatus("uploading");
                // Push to child path.
                const snapshot = await firebaseStoreRef.child("images/" + file.name).put(file, {
                  contentType: file.type,
                });

                console.log("Uploaded", snapshot.totalBytes, "bytes.");
                console.log("File metadata:", snapshot.metadata);
                // Let's get a download URL for the file.
                const url = await snapshot.ref.getDownloadURL();
                console.log("File available at", url);
                ignorePromise(loadClip(url, file.name));
                setUploadStatus("idle");
              }}
            />
          )}
          {/* <BounceButton project={project} renderer={renderer} /> */}
          {bounceURL && (
            <a href={bounceURL} download={"bounce.wav"}>
              Download bounce
            </a>
          )}
          <ToolSelector project={project} />
          <TransportControl
            project={project}
            loadClip={loadClip}
            player={player}
            renderer={renderer}
          ></TransportControl>
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

        <br />
        {["drums.mp3", "clav.mp3", "bassguitar.mp3", "horns.mp3", "leadguitar.mp3"].map(function (url, i) {
          return (
            <button
              key={i}
              draggable
              disabled={isAudioPlaying}
              onDragStart={function (ev: React.DragEvent<HTMLButtonElement>) {
                ev.dataTransfer.setData("text", url);
              }}
              onClick={function () {
                ignorePromise(loadClip(url));
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

function UploadButton({
  value,
  hidden,
  ...props
}: Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref" | "type">) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input type="file" ref={inputRef} {...props} hidden />
      <button
        onClick={() => {
          console.log("HI");
          inputRef.current?.click();
        }}
        hidden={hidden}
      >
        {value}
      </button>
    </>
  );
}
