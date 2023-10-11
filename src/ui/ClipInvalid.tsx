import React from "react";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiClip } from "../midi/MidiClip";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";

export function ClipInvalid({ clip, project }: { clip: MidiClip | AudioClip; project: AudioProject }) {
  useSubscribeToSubbableMutationHashable(clip);

  const width =
    clip instanceof AudioClip
      ? project.viewport.secsToPx(clip.durationSec)
      : project.viewport.pulsesToPx(clip.lengthPulses);
  const left =
    clip instanceof AudioClip
      ? project.viewport.secsToPx(clip.startOffsetSec)
      : project.viewport.pulsesToPx(clip.startOffsetPulses);

  return (
    <div
      style={{
        width: width,
        left: left,
        boxSizing: "border-box",
        backgroundColor: "#ffcccc",
        imageRendering: "pixelated",
        height: "100%",
        userSelect: "none",
        border: "1px solid #114411",
        color: "black",
        pointerEvents: "all",
        display: "flex",
        flexDirection: "column",
        position: "absolute",
      }}
    ></div>
  );
}
