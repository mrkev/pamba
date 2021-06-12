import React from "react";
import { AudioClip } from "../AudioClip";
import { Tool } from "../App";
import { CLIP_HEIGHT, pxToSecs, secsToPx } from "../globals";

type Props = {
  clip: AudioClip;
  tool: Tool;
  rerender: () => void;
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
  onMouseDownToDrag,
  onRemove,
  onMouseDownToResize,
  style = {},
}: Props) {
  const width = secsToPx(clip.durationSec);
  const totalBufferWidth = secsToPx(clip.lengthSec);
  const startTrimmedWidth = secsToPx(clip.startPosSec);
  const height = CLIP_HEIGHT;
  // const [cursorState, setCursorState] = useState(null);

  // useEffect(function () {
  //   const onMouseMove = function () {
  //     setCursorState({})
  //   };
  //   const onMouseUp = function () {

  //   };

  //   document.addEventListener("mousemove", onMouseMove);
  //   document.addEventListener("mouseup", onMouseUp);
  // }, []);

  function onStartResize(e: React.MouseEvent<HTMLDivElement>) {
    onMouseDownToResize(e, "start");
    console.log("START");
  }

  function onEndResize(e: React.MouseEvent<HTMLDivElement>) {
    onMouseDownToResize(e, "end");

    console.log("END");
  }

  return (
    <div
      onClick={function (e) {
        const div = e.currentTarget;
        if (!(div instanceof HTMLDivElement)) {
          return;
        }
        if (tool === "trimStart") {
          const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
          const asSec = pxToSecs(pxFromStartOfClip);
          clip.startPosSec += asSec;
          clip.startOffsetSec += asSec;
          console.log("asdfasdf");
          rerender();
        }
        if (tool === "trimEnd") {
          const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
          const secsFromStartPos = pxToSecs(pxFromStartOfClip);
          const secsFromZero = clip.startPosSec + secsFromStartPos;
          clip.endPosSec = secsFromZero;
          console.log(
            "pxFromStartOfClip",
            pxFromStartOfClip,
            secsFromZero,
            "s"
          );
          console.log("clip.endPosSec", clip.endPosSec);
          rerender();
        }
      }}
      style={{
        backgroundColor: "#ccffcc",
        backgroundImage:
          "url('" + clip.getWaveformDataURL(totalBufferWidth, height) + "')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${startTrimmedWidth * -1}px 0px`,
        width,
        height,
        userSelect: "none",
        border: "1px solid #bbeebb",
        color: "white",
        ...style,
      }}
    >
      <div
        onMouseDown={onMouseDownToDrag}
        style={{
          color: "black",
          background: "#bbeebb",
          borderBottom: "1px solid #aaddaa",
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
