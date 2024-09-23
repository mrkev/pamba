import React from "react";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiClip } from "../midi/MidiClip";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";

export function getClipSizePx(clip: MidiClip | AudioClip, project: AudioProject) {
  const width =
    clip instanceof AudioClip
      ? project.viewport.secsToPx(clip.timelineLength.ensureSecs())
      : project.viewport.pxForPulse(clip.timelineLength.ensurePulses());
  const left =
    clip instanceof AudioClip
      ? project.viewport.secsToPx(clip.timelineStart.ensureSecs())
      : project.viewport.pxForPulse(clip.timelineStart.ensurePulses());
  return { left, width };
}

export function ClipInvalid({ clip, project }: { clip: MidiClip | AudioClip; project: AudioProject }) {
  useSubscribeToSubbableMutationHashable(clip);
  const { width, left } = getClipSizePx(clip, project);

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

export function ClipPlaceholder({ left, width }: { left: number; width: number }) {
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
