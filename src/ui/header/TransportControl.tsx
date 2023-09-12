import React, { useEffect, useRef } from "react";
import { AnalizedPlayer } from "../../lib/AnalizedPlayer";
import { AudioRenderer } from "../../lib/AudioRenderer";
import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedArray } from "../../lib/state/LinkedArray";
import { useLinkedState } from "../../lib/state/LinkedState";
import { exhaustive } from "../../utils/exhaustive";
import { AudioRecorder } from "../../utils/useMediaRecorder";
import { utility } from "../utility";

export function TransportControl({
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
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const [recorderStatus] = useLinkedState(recorder.status);
  const isRecording = recorderStatus === "recording";

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
        26,
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
