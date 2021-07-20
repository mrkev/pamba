import { CLIP_HEIGHT } from "../globals";
import { useLinkedState } from "../lib/LinkedState";
import { pressedState } from "../lib/linkedState/pressedState";
import { modifierState } from "../ModifierState";

import type React from "react";
import type { Tool } from "../App";
import type { AudioProject } from "../lib/AudioProject";
import type { AudioTrack } from "../lib/AudioTrack";
import type { AudioClip } from "../lib/AudioClip";

type Props = {
  clip: AudioClip;
  tool: Tool;
  rerender: () => void;
  isSelected: boolean;
  style?: React.CSSProperties;
  project: AudioProject;
  track: AudioTrack | null; // null if clip is being rendered for move
};

const styles: Record<string, React.CSSProperties> = {
  resizerEnd: {
    width: 10,
    background: "rgba(0,0,0,0)",
    height: "100%",
    position: "absolute",
    right: 0,
    top: 0,
    cursor: "ew-resize",
  },
  resizerStart: {
    width: 10,
    background: "rgba(0,0,0,0)",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    cursor: "ew-resize",
  },
};

export function Clip({
  clip,
  tool,
  rerender,
  isSelected,
  style = {},
  project,
  track,
}: Props) {
  const [secsToPx] = useLinkedState(project.secsToPx);
  const pxToSecs = secsToPx.invert;
  const width = secsToPx(clip.durationSec);
  const totalBufferWidth = secsToPx(clip.lengthSec);
  const startTrimmedWidth = secsToPx(clip.trimStartSec);
  const height = CLIP_HEIGHT;
  const [, setPressed] = useLinkedState(pressedState);
  const [, setSelectionWidth] = useLinkedState(project.selectionWidth);
  const [, setSelected] = useLinkedState(project.selected);

  function onMouseDownToResize(
    e: React.MouseEvent<HTMLDivElement>,
    from: "start" | "end"
  ) {
    e.stopPropagation();
    if (tool !== "move") {
      return;
    }
    setPressed({
      status: "resizing_clip",
      clip,
      // IDEA: just clone and have the original clip at hand
      originalClipEndPosSec: clip.trimEndSec,
      originalClipStartPosSec: clip.trimStartSec,
      originalClipOffsetSec: clip.startOffsetSec,
      from,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  }

  function onMouseDownToMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    e.stopPropagation();
    if (tool !== "move" || track == null) {
      return;
    }
    setPressed({
      status: "moving_clip",
      clientX: e.clientX,
      clientY: e.clientY,
      clip,
      track,
      originalTrack: track,
      originalClipOffsetSec: clip.startOffsetSec,
    });
    setSelected((prev) => {
      const selectAdd = modifierState.meta || modifierState.shift;
      if (selectAdd && prev !== null && prev.status === "clips") {
        prev.clips.push({ clip, track });
        prev.test.add(clip);
        prev.test.add(track);
        return { ...prev };
      } else {
        return {
          status: "clips",
          clips: [{ clip, track }],
          test: new Set([clip, track]),
        };
      }
    });
    setSelectionWidth(null);
  }

  function onClipClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const div = e.currentTarget;
    if (!(div instanceof HTMLDivElement)) {
      return;
    }
    if (tool === "trimStart") {
      const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
      const asSec = pxToSecs(pxFromStartOfClip);
      clip.trimStartSec += asSec;
      clip.startOffsetSec += asSec;
      console.log("asdfasdf");
      rerender();
    }
    if (tool === "trimEnd") {
      const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
      const secsFromStartPos = pxToSecs(pxFromStartOfClip);
      const secsFromZero = clip.trimStartSec + secsFromStartPos;
      clip.trimEndSec = secsFromZero;
      console.log("pxFromStartOfClip", pxFromStartOfClip, secsFromZero, "s");
      console.log("clip.endPosSec", clip.trimEndSec);
      rerender();
    }
  }

  const border = isSelected ? "1px solid #114411" : "1px solid #aaddaa";

  return (
    <div
      onClick={onClipClick}
      style={{
        backgroundColor: "#ccffcc",
        backgroundImage:
          "url('" + clip.getWaveformDataURL(totalBufferWidth, height) + "')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${startTrimmedWidth * -1}px 0px`,
        width,
        height,
        // pointerEvents: 'none',
        userSelect: "none",
        borderLeft: border,
        borderRight: border,
        color: "white",
        ...style,
      }}
    >
      <div
        onMouseDown={onMouseDownToMove}
        style={{
          color: isSelected ? "white" : "black",
          background: isSelected ? "#225522" : "#bbeebb",
          border: border,
          opacity: 0.8,
          fontSize: 10,
        }}
      >
        {clip.name} ({Math.round(clip.durationSec * 100) / 100})
      </div>
      <div
        style={styles.resizerStart}
        onMouseDown={(e) => onMouseDownToResize(e, "start")}
      ></div>
      <div
        style={styles.resizerEnd}
        onMouseDown={(e) => onMouseDownToResize(e, "end")}
      ></div>
    </div>
  );
}
