import { useLinkAsState } from "marked-subbable";
import React, { useEffect, useRef } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { documentCommands } from "../../input/documentCommands";
import { AudioRecorder } from "../../lib/io/AudioRecorder";
import { AudioRenderer } from "../../lib/io/AudioRenderer";
import { AudioProject } from "../../lib/project/AudioProject";
import { cn } from "../../utils/cn";
import { exhaustive } from "../../utils/exhaustive";
import { utility } from "../utility";
import { CommandButton } from "./CommandButton";

export function TransportControl({ project, style }: { project: AudioProject; style?: React.CSSProperties }) {
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectionWidth] = usePrimitive(project.selectionWidth);
  const [cursorPos] = usePrimitive(project.cursorPos);

  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx == null || canvas == null) return;
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "start";
    // ctx.fillStyle = "#D3D3D3";
    ctx.fillStyle = "white";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const start = cursorPos.toFixed(2);
    const end = selectionWidth !== null ? (cursorPos + selectionWidth).toFixed(2) : "--.--";
    const duration = selectionWidth !== null ? selectionWidth.toFixed(2) : "0.00";

    // ctx.fillStyle = "#777"; // light mode
    ctx.fillStyle = "#aaa"; // dark mode
    ctx.fillText(`Time Selection:  Start: ${start}s  End: ${end}s  (Duration: ${duration}s)`, 6, 24);
  }, [cursorPos, selectionWidth]);

  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", ...style }}>
      {/* Cursor canvas */}
      <canvas
        style={{
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
  style,
  className,
  recorder,
}: {
  project: AudioProject;
  renderer: AudioRenderer;
  style?: React.CSSProperties;
  className?: string;
  recorder: AudioRecorder;
}) {
  const tracks = useContainer(project.allTracks);
  const [armedTrack] = usePrimitive(project.armedAudioTrack);
  const [armedMidiTrack] = usePrimitive(project.armedMidiTrack);
  const [recordingClip] = usePrimitive(project.midi.recordingClip);
  const [isAudioPlaying] = usePrimitive(renderer.isAudioPlaying);
  const [recorderStatus] = useLinkAsState(recorder.status);
  const isMidiRecording = recordingClip != null;
  const isRecording = recorderStatus === "recording" || isMidiRecording;
  const isTrackArmed = armedTrack != null || armedMidiTrack != null;
  const [selectionWidth] = usePrimitive(project.selectionWidth);
  const [cursorPos] = usePrimitive(project.cursorPos);

  return (
    <div className={cn("flex flex-row", className)} style={style}>
      <CommandButton
        command={documentCommands.getById("jumpToTimelineStart")}
        project={project}
        disabled={isAudioPlaying || isRecording || (cursorPos === 0 && selectionWidth === 0)}
        style={isRecording ? { color: "red" } : {}}
      >
        {"\u23ee" /* rewind */}
      </CommandButton>

      {!isAudioPlaying && (
        <button
          title="play"
          className={utility.button}
          style={{ color: isRecording ? "red" : undefined, width: 17.56 }}
          disabled={tracks.length === 0}
          onClick={() => {
            AudioRenderer.ensurePlaybackGoing(renderer, project, renderer.analizedPlayer);
          }}
        >
          {"\u23f5" /*play*/}
        </button>
      )}

      {isAudioPlaying && (
        <button
          title="stop"
          className={utility.button}
          style={{ color: isRecording ? "red" : undefined, width: 17.56 }}
          disabled={tracks.length === 0}
          onClick={() => {
            AudioRenderer.ensurePlaybackStopped(renderer, project, renderer.analizedPlayer);
            // stop midi recording after playback is stopped, so committing the clip
            // isn't blocked by canEditTrack (which forbids edits while playing)
            if (isMidiRecording) {
              project.midi.stopRecording();
            }
            if (recorderStatus === "recording") {
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
              case "idle": {
                const midiArmed = armedMidiTrack != null;
                const audioArmed = armedTrack != null;
                if (midiArmed) {
                  project.midi.startRecording();
                }
                // record audio to the armed audio track, or to a new track when nothing
                // is armed. Don't spin up a new audio track when only midi is armed.
                if (audioArmed || !midiArmed) {
                  recorder.record();
                }
                AudioRenderer.ensurePlaybackGoing(renderer, project, renderer.analizedPlayer);
                return;
              }
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
          renderer.analizedPlayer.setPlaytimeCanvas(ctx);
        }}
      />
    </div>
  );
}
