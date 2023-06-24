import React, { useCallback, useEffect, useRef } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../constants";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import AudioClip from "../lib/AudioClip";
import { AudioProject } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedState } from "../lib/state/LinkedState";
import { ignorePromise } from "../utils/ignorePromise";
import { useMediaRecorder } from "../utils/useMediaRecorder";
import { appProjectStatus } from "./App";
import { AnchorButton } from "./FormButtons";
import { utility } from "./utility";
import { UserAuthControl } from "./UserAuthControl";

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
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);

  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx == null || canvas == null) return;
    ctx.font = "24px Verdana";
    ctx.textAlign = "start";
    ctx.fillStyle = "#ffffff";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (selectionWidth !== null) {
      const start = cursorPos.toFixed(2);
      const end = (cursorPos + selectionWidth).toFixed(2);
      ctx.fillText(
        `Time Selection:   Start: ${start}s   End: ${end}s   (Duration: ${selectionWidth.toFixed(2)}s)`,
        6,
        26
      );
    } else {
      ctx.fillText(`Time Selection:   Start: ${cursorPos.toFixed(2)}s   End: --.--s   (Duration: 0.00s)`, 6, 26);
    }
  }, [cursorPos, selectionWidth]);

  return (
    <div style={{ display: "flex", flexDirection: "row", ...style }}>
      <button
        className={utility.button}
        disabled={isAudioPlaying || (cursorPos === 0 && selectionWidth === 0)}
        style={isRecording ? { color: "red" } : undefined}
        onClick={() => {
          project.cursorPos.set(0);
          project.selectionWidth.set(0);
        }}
      >
        {"\u23ee"}
      </button>

      {/* Cursor canvas */}
      <canvas
        style={{
          background: "black",
          width: 2 * 210,
          height: 18,
          alignSelf: "center",
          marginRight: 4,
        }}
        width={2 * (2 * 210) + "px"}
        height={2 * 18 + "px"}
        ref={cursorCanvasRef}
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
      {/* Playtime canvas */}
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
    </div>
  );
}

export function ToolHeader({
  project,
  player,
  renderer,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
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
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "6px",
            alignSelf: "stretch",
            alignItems: "baseline",
          }}
        >
          <UserAuthControl />
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
          <div style={{ flexGrow: 1 }}></div>
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
