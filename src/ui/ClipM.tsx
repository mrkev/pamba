import React, { useMemo } from "react";
import { createUseStyles } from "react-jss";
import { modifierState } from "../ModifierState";
import { CLIP_HEIGHT } from "../constants";
import type AudioClip from "../lib/AudioClip";
import type { AudioTrack } from "../lib/AudioTrack";
import type { AudioProject } from "../lib/project/AudioProject";
import { useDerivedState } from "../lib/state/DerivedState";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { RenamableLabel } from "./RenamableLabel";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";

export function ClipM({
  clip,
  rerender,
  isSelected,
  style = {},
  project,
  track,
}: {
  clip: MidiClip;
  rerender: () => void;
  isSelected: boolean;
  style?: React.CSSProperties;
  project: AudioProject;
  track: MidiTrack | null; // null if clip is being rendered for move
}) {
  const styles = useStyles();
  const secsToPx = useDerivedState(project.secsToPx);
  const pxToSecs = secsToPx.invert;
  const width = secsToPx(clip.durationSec);

  const startTrimmedWidth = secsToPx(clip.trimStartSec);
  const [tool] = useLinkedState(project.pointerTool);
  const height = CLIP_HEIGHT - 3; // to clear the bottom track separator gridlines
  // const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useSubscribeToSubbableMutationHashable(clip, () => {
    rerender();
  });

  function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") {
    e.stopPropagation();
    if (tool !== "move") {
      return;
    }

    pressedState.set({
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
    if (tool !== "move" || track == null) {
      return;
    }

    pressedState.set({
      status: "moving_clip",
      clientX: e.clientX,
      clientY: e.clientY,
      clip,
      track,
      originalTrack: track,
      originalClipOffsetSec: clip.startOffsetSec,
    });

    project.selected.setDyn((prev) => {
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

    project.selectionWidth.set(null);
    e.stopPropagation();
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
      clip.notifyUpdate();
    }
    if (tool === "trimEnd") {
      const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
      const secsFromStartPos = pxToSecs(pxFromStartOfClip);
      const secsFromZero = clip.trimStartSec + secsFromStartPos;
      clip.trimEndSec = secsFromZero;
      clip.notifyUpdate();
    }
  }

  const border = isSelected ? "1px solid #114411" : "1px solid #aaddaa";

  const renameStateDescriptor = useMemo(
    () =>
      ({
        status: "clip",
        clip: clip,
      } as const),
    [clip]
  );

  return (
    <div
      onClick={onClipClick}
      style={{
        backgroundColor: "#ccffcc",
        width: width,
        height: "100%",
        userSelect: "none",
        borderLeft: border,
        borderRight: border,
        color: "white",
        pointerEvents: "all",
        display: "flex",
        flexDirection: "column",
        position: "absolute",
        left: secsToPx(clip.startOffsetSec),
        ...style,
      }}
    >
      <div
        className={styles.clipHeader}
        onMouseDown={onMouseDownToMove}
        style={{
          color: isSelected ? "white" : "black",
          background: isSelected ? "#225522" : "#bbeebb",
          border: border,
        }}
      >
        {/* TODO: not working */}
        <RenamableLabel
          style={{
            color: isSelected ? "white" : "black",
            fontSize: 10,
          }}
          value={clip.name}
          setValue={console.log}
        />{" "}
        ({Math.round(clip.durationSec * 100) / 100})
      </div>
      <div className={styles.resizerStart} onMouseDown={(e) => onMouseDownToResize(e, "start")}></div>
      <div className={styles.resizerEnd} onMouseDown={(e) => onMouseDownToResize(e, "end")}></div>

      {/* <button
        onClick={() => {
          if (canvasRef.current) {
            dataWaveformToCanvas(100, 20, clip.buffer, canvasRef.current);
          }
        }}
      >
        Test waveform worker
      </button> */}
      {/* <ClipAutomation clip={clip} secsToPx={secsToPx} /> */}
    </div>
  );
}
const useStyles = createUseStyles({
  resizerEnd: {
    width: 10,
    background: "rgba(0,0,0,0)",
    height: "100%",
    position: "absolute",
    right: -5,
    top: 0,
    cursor: "ew-resize",
  },
  resizerStart: {
    width: 10,
    background: "rgba(0,0,0,0)",
    height: "100%",
    position: "absolute",
    left: -5,
    top: 0,
    cursor: "ew-resize",
  },
  clipHeader: {
    opacity: 0.8,
    fontSize: 10,
    whiteSpace: "nowrap",
    overflow: "hidden",
    flexShrink: 0,
    paddingBottom: "0px 0px 1px 0px",
  },
});
