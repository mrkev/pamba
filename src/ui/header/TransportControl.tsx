import React, { useEffect, useRef } from "react";
import { AnalizedPlayer } from "../../lib/AnalizedPlayer";
import { AudioRenderer } from "../../lib/AudioRenderer";
import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedArray } from "../../lib/state/LinkedArray";
import { useLinkedState } from "../../lib/state/LinkedState";
import { exhaustive } from "../../utils/exhaustive";
import { AudioRecorder } from "../../lib/AudioRecorder";
import { utility } from "../utility";

export function TransportControl({
  project,
  renderer,
  recorder,
}: {
  project: AudioProject;
  renderer: AudioRenderer;
  recorder: AudioRecorder;
}) {
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const [recorderStatus] = useLinkedState(recorder.status);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const isRecording = recorderStatus === "recording";

  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx == null || canvas == null) return;
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "start";
    ctx.fillStyle = "#D3D3D3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const start = cursorPos.toFixed(2);
    const end = selectionWidth !== null ? (cursorPos + selectionWidth).toFixed(2) : "--.--";
    const duration = selectionWidth !== null ? selectionWidth.toFixed(2) : "0.00";

    ctx.fillStyle = "#777";
    ctx.fillText(`Time Selection:  Start: ${start}s  End: ${end}s  (Duration: ${duration}s)`, 6, 24);
  }, [cursorPos, selectionWidth]);

  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      <button
        className={utility.button}
        disabled={isAudioPlaying || isRecording || (cursorPos === 0 && selectionWidth === 0)}
        style={isRecording ? { color: "red" } : undefined}
        onClick={() => {
          project.cursorPos.set(0);
          project.selectionWidth.set(0);
        }}
      >
        {"\u23ee" /* rewind */}
      </button>

      {/* Cursor canvas */}
      <canvas
        style={{
          background: "black",
          width: 2 * 220,
          height: 18,
          alignSelf: "center",
          marginRight: 4,
        }}
        width={2 * (2 * 220) + "px"}
        height={2 * 18 + "px"}
        ref={cursorCanvasRef}
      />
    </div>
  );
}

export function PlaybackControl({
  project,
  renderer,
  player,
  style,
  recorder,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
  style: React.CSSProperties;
  recorder: AudioRecorder;
}) {
  const [tracks] = useLinkedArray(project.allTracks);
  const [armedTrack] = useLinkedState(project.armedTrack);
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);
  const [recorderStatus] = useLinkedState(recorder.status);
  const isRecording = recorderStatus === "recording";
  const isTrackArmed = armedTrack != null;

  return (
    <div style={{ display: "flex", flexDirection: "row", ...style }}>
      {!isAudioPlaying && (
        <button
          className={utility.button}
          style={{ color: isRecording ? "red" : undefined, width: 17.56 }}
          disabled={tracks.length === 0}
          onClick={() => {
            AudioRenderer.ensurePlaybackGoing(renderer, project, player);
          }}
        >
          {"\u23f5" /*play*/}
        </button>
      )}

      {isAudioPlaying && (
        <button
          className={utility.button}
          style={{ color: isRecording ? "red" : undefined, width: 17.56 }}
          disabled={tracks.length === 0}
          onClick={() => {
            AudioRenderer.ensurePlaybackStopped(renderer, project, player);
            if (isRecording) {
              recorder.stop();
            }
          }}
        >
          {"\u23f9" /*stop*/}
        </button>
      )}

      {recorder && (
        <button
          className={utility.button}
          disabled={isAudioPlaying}
          style={isRecording ? { color: "red" } : undefined}
          title={isTrackArmed ? "record to armed track" : "record to new track"}
          onClick={function () {
            switch (recorderStatus) {
              case "error":
                console.error("errorrrrr");
                return;
              case "idle":
                recorder.record();
                AudioRenderer.ensurePlaybackGoing(renderer, project, player);
                return;
              case "recording":
                recorder.stop();
                return;
              default:
                exhaustive(recorderStatus);
            }
          }}
        >
          {"\u23fa" /* record */}
          {isTrackArmed ? "" : " +"}
        </button>
      )}
      {/* Playtime canvas */}
      <canvas
        style={{
          background: "black",
          width: 58,
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
