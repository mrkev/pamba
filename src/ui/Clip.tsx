import React from "react";
import { AudioClip } from "../lib/AudioClip";
import { Tool } from "../App";
import { CLIP_HEIGHT, pxToSecs, secsToPx } from "../globals";

type Props = {
  clip: AudioClip;
  tool: Tool;
  rerender: () => void;
  selected: boolean;
  onMouseDownToDrag: React.MouseEventHandler<HTMLDivElement>;
  onRemove: React.MouseEventHandler<HTMLButtonElement>;
  style?: React.CSSProperties;
  onMouseDownToResize: (
    e: React.MouseEvent<HTMLDivElement>,
    from: "start" | "end"
  ) => void;
};

export function Clip({
  clip,
  tool,
  rerender,
  selected,
  onMouseDownToDrag,
  onRemove,
  onMouseDownToResize,
  style = {},
}: Props) {
  const width = secsToPx(clip.durationSec);
  const totalBufferWidth = secsToPx(clip.lengthSec);
  const startTrimmedWidth = secsToPx(clip.trimStartSec);
  const height = CLIP_HEIGHT;

  function onStartResize(e: React.MouseEvent<HTMLDivElement>) {
    onMouseDownToResize(e, "start");
  }

  function onEndResize(e: React.MouseEvent<HTMLDivElement>) {
    onMouseDownToResize(e, "end");
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

  const border = selected ? "1px solid #114411" : "1px solid #aaddaa";

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
        onMouseDown={onMouseDownToDrag}
        style={{
          color: selected ? "white" : "black",
          background: selected ? "#225522" : "#bbeebb",
          border: border,
          opacity: 0.8,
          fontSize: 10,
        }}
      >
        {clip.name} ({Math.round(clip.durationSec * 100) / 100})
        <button
          style={{
            border: "none",
            fontSize: 10,
            cursor: "pointer",
            right: 2,
            position: "absolute",
          }}
          onClick={onRemove}
        >
          remove
        </button>
      </div>
      <div
        style={{
          width: 10,
          background: "rgba(0,0,0,0)",
          height: "100%",
          position: "absolute",
          left: 0,
          top: 0,
          cursor: "ew-resize",
        }}
        onMouseDown={onStartResize}
      ></div>
      <div
        style={{
          width: 10,
          background: "rgba(0,0,0,0)",
          height: "100%",
          position: "absolute",
          right: 0,
          top: 0,
          cursor: "ew-resize",
        }}
        onMouseDown={onEndResize}
      ></div>
    </div>
  );
}
