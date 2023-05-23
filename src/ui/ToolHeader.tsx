import React, { useCallback, useEffect, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../constants";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { useLinkedState } from "../lib/state/LinkedState";
import { useLinkedArray } from "../lib/state/LinkedArray";
import AudioClip from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { useMediaRecorder } from "../utils/useMediaRecorder";
import { ignorePromise } from "../utils/ignorePromise";
import { utility } from "./utility";
import { AnchorButton, UploadButton } from "./FormButtons";
import { appProjectStatus } from "./App";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import type firebase from "firebase/compat";
import { AudioStorage } from "../lib/AudioStorage";
import { useAsyncResult } from "./useAsyncResult";

function NewProjectButton() {
  return (
    <button
      className={utility.button}
      onClick={() => {
        // eslint-disable-next-line no-restricted-globals
        if (confirm("TODO: only one project is supported, so this deletes all data. Continue?")) {
          appProjectStatus.set({
            status: "loaded",
            project: ProjectPersistance.defaultProject(),
          });
        }
      }}
    >
      new project
    </button>
  );
}

function BounceButton({ project, renderer }: { project: AudioProject; renderer: AudioRenderer }) {
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  return (
    <button
      className={utility.button}
      onClick={() => {
        ignorePromise(AudioRenderer.bounceSelection(renderer, project));
      }}
    >
      {selectionWidth && Math.abs(selectionWidth) > 0 ? "bounce selected" : "bounce all"}
    </button>
  );
}

function ToolSelector({ project }: { project: AudioProject }) {
  const [tool, setTool] = useLinkedState(project.pointerTool);
  return (
    <div style={{ width: 140 }}>
      <button
        className={utility.button}
        style={tool === "trimStart" ? { background: "teal", color: "white" } : undefined}
        onClick={() => {
          if (tool === "trimStart") {
            setTool("move");
          } else {
            setTool("trimStart");
          }
        }}
      >
        ⇥
      </button>
      <button
        className={utility.button}
        style={tool === "trimEnd" ? { background: "teal", color: "white" } : undefined}
        onClick={() => {
          if (tool === "trimEnd") {
            setTool("move");
          } else {
            setTool("trimEnd");
          }
        }}
      >
        ⇤
      </button>
      {tool === "move" ? "move \u00b7" : tool === "trimStart" ? "trimStart ⇥" : tool === "trimEnd" ? "trimEnd ⇤" : tool}
    </div>
  );
}

function TransportControl({
  project,
  renderer,
  player,
  loadClip,
  style,
}: {
  loadClip: (url: string, name?: string) => Promise<void>;
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
  style: React.CSSProperties;
}) {
  const mediaRecorder = useMediaRecorder(loadClip);
  const [tracks] = useLinkedArray(project.allTracks);
  const [isRecording, setIsRecording] = useLinkedState(project.isRecording);
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);

  return (
    <div style={{ display: "flex", flexDirection: "row", ...style }}>
      <canvas
        style={{
          background: "black",
          width: 56,
          height: 18,
          alignSelf: "center",
        }}
        width={2 * 56 + "px"}
        height={2 * 18 + "px"}
        ref={(canvas) => {
          const ctx = canvas?.getContext("2d") ?? null;
          player.setPlaytimeCanvas(ctx);
        }}
      />
      <button
        className={utility.button}
        style={{ color: isRecording ? "red" : undefined, width: 17.56 }}
        disabled={tracks.length === 0 || isRecording}
        onClick={() => {
          AudioRenderer.togglePlayback(renderer, project, player);
        }}
      >
        {isAudioPlaying ? "\u23f9" /*stop*/ : "\u23f5" /*play*/}
      </button>
      {mediaRecorder && (
        <button
          className={utility.button}
          disabled={isAudioPlaying}
          style={isRecording ? { color: "red" } : undefined}
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
          {"\u23fa"}
        </button>
      )}
    </div>
  );
}

export function UploadAudioButton({
  project,
  firebaseStoreRef,
  loadClip,
}: {
  project: AudioProject;
  firebaseStoreRef: firebase.storage.Reference | null;
  loadClip: (url: string, name?: string) => Promise<void>;
}) {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  return (
    firebaseStoreRef && (
      <UploadButton
        className={utility.button}
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
          const result = await AudioStorage.uploadAudioFile(file, firebaseStoreRef, project);
          if (result instanceof Error) {
            throw result;
          }
          const url = result;
          ignorePromise(loadClip(url, file.name));
          setUploadStatus("idle");
        }}
      />
    )
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
  firebaseStoreRef: firebase.storage.Reference | null;
}) {
  const [bounceURL] = useLinkedState<string | null>(renderer.bounceURL);
  const [scaleFactor] = useLinkedState(project.scaleFactor);

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
      <div
        style={{
          flexGrow: 1,
          gap: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          marginRight: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "6px",
            alignSelf: "stretch",
            alignItems: "baseline",
          }}
        >
          <NewProjectButton />
          <UploadAudioButton project={project} firebaseStoreRef={firebaseStoreRef} loadClip={loadClip} />

          <div style={{ flexGrow: 1 }}></div>

          <BounceButton project={project} renderer={renderer} />
          {bounceURL && (
            <AnchorButton className={utility.button} href={bounceURL} download={"bounce.wav"}>
              Download bounce
            </AnchorButton>
          )}
          <div style={{ flexGrow: 1 }}></div>

          <ToolSelector project={project} />
          <div style={{ flexGrow: 1 }}></div>
          <TransportControl
            project={project}
            loadClip={loadClip}
            player={player}
            renderer={renderer}
            style={{ alignSelf: "center" }}
          />
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
        <input
          type="range"
          min={Math.log(2)}
          max={Math.log(100)}
          step={0.01}
          value={Math.log(scaleFactor)}
          title="Zoom level"
          onChange={(e) => {
            const projectDiv = project.projectDiv.get();
            if (!projectDiv) {
              return;
            }
            const newFactor = Math.exp(parseFloat(e.target.value));

            const renderedWidth = projectDiv.clientWidth;
            const renderedTime = project.viewport.pxToSecs(projectDiv.clientWidth);
            const newRenderedWidth = project.viewport.secsToPx(renderedTime, newFactor);

            console.log("new", newRenderedWidth, "old", renderedWidth);
            const pxDelta = newRenderedWidth - renderedWidth;
            console.log("PXDELTA", pxDelta);

            // console.log(currentFactor, newFactor, currentFactor - newFactor);
            // const totalPixels = projectDiv.clientWidth * (currentFactor - newFactor);
            // console.log(projectDiv.clientWidth, "totalPixels", totalPixels);
            // const viewportEndPx = viewportStartPx + projectDiv.clientWidth;
            // const middlePx = (viewportStartPx + viewportEndPx) / 2;

            project.scaleFactor.set(newFactor);
            project.viewportStartPx.setDyn((prev) => prev + pxDelta / 2);
          }}
        />
      </div>
      <canvas
        style={{
          background: "black",
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
        width={2 * CANVAS_WIDTH + "px"}
        height={2 * CANVAS_HEIGHT + "px"}
        ref={(canvas) => {
          const ctx = canvas?.getContext("2d") ?? null;
          player.setCanvas(ctx);
        }}
      ></canvas>
    </div>
  );
}

export function Library({
  project,
  renderer,
  player,
  firebaseStoreRef,
}: {
  project: AudioProject;
  renderer: AudioRenderer;
  player: AnalizedPlayer;
  firebaseStoreRef: firebase.storage.Reference | null;
}) {
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);
  const audioFiles = useAsyncResult(
    firebaseStoreRef ? AudioStorage.listProjectAudioFiles(project, firebaseStoreRef) : Promise.resolve(null)
  );

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
    <div style={{ display: "flex", flexDirection: "column" }}>
      {["drums.mp3", "clav.mp3", "bassguitar.mp3", "horns.mp3", "leadguitar.mp3"].map(function (url, i) {
        return (
          <button
            key={i}
            draggable
            disabled={isAudioPlaying}
            onDragStart={function (ev: React.DragEvent<HTMLButtonElement>) {
              ev.dataTransfer.setData("text/uri-list", url);
              ev.dataTransfer.setData("text/plain", url);
            }}
            onClick={function () {
              ignorePromise(loadClip(url));
            }}
          >
            load {url}
          </button>
        );
      })}
      <hr style={{ width: "100%" }} />
      {/* TODO: this won't be updated when new audio gets uploaded, unless it's constantly executed when I think it might be */}
      {audioFiles.status === "ready" && audioFiles.value !== null && (
        <>
          {audioFiles.value.map(function (ref, i) {
            return (
              <button
                key={i}
                draggable
                disabled={isAudioPlaying}
                // onDragStart={function (ev: React.DragEvent<HTMLButtonElement>) {
                //   // ev.dataTransfer.setData("text/uri-list", url);
                //   // ev.dataTransfer.setData("text/plain", url);
                // }}
                onClick={async function () {
                  const url = await ref.getDownloadURL();
                  ignorePromise(loadClip(url));
                }}
              >
                {ref.name}
              </button>
            );
          })}
          <hr style={{ width: "100%" }} />
        </>
      )}
    </div>
  );
}
