import React from "react";
import { createUseStyles } from "react-jss";
import { modifierState } from "../ModifierState";
import type { AudioProject } from "../lib/project/AudioProject";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip, pulsesToSec } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../pressedState";
import { RenamableLabel } from "./RenamableLabel";

export function ClipM({
  clip,
  isSelected,
  style = {},
  project,
  track,
}: {
  clip: MidiClip;
  rerender: () => void; // todo: unused
  isSelected: boolean;
  style?: React.CSSProperties;
  project: AudioProject;
  track: MidiTrack | null; // null if clip is being rendered for move
}) {
  const styles = useStyles();
  const width = project.viewport.pulsesToPx(clip.lengthPulses);
  const [bpm] = useLinkedState(project.tempo);
  const [notes] = useLinkedArray(clip.notes);
  // const startTrimmedWidth = project.viewport.secsToPx(clip.trimStartSec);
  const [tool] = useLinkedState(project.pointerTool);
  // const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useSubscribeToSubbableMutationHashable(clip);

  // function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") {
  //   e.stopPropagation();
  //   if (tool !== "move") {
  //     return;
  //   }

  //   pressedState.set({
  //     status: "resizing_clip",
  //     clip,
  //     // IDEA: just clone and have the original clip at hand
  //     originalClipEndPosSec: clip.trimEndSec,
  //     originalClipStartPosSec: clip.trimStartSec,
  //     originalClipOffsetSec: clip.startOffsetSec,
  //     from,
  //     clientX: e.clientX,
  //     clientY: e.clientY,
  //   });
  // }

  function onMouseDownToMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (tool !== "move" || track == null) {
      return;
    }

    pressedState.set({
      // TODO: move clip in pulses state? or abstract unit away?
      status: "moving_clip",
      clientX: e.clientX,
      clientY: e.clientY,
      clip,
      track,
      originalTrack: track,
      originalClipOffsetSec: pulsesToSec(clip.startOffsetPulses, bpm),
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

  // function onClipClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
  //   const div = e.currentTarget;
  //   if (!(div instanceof HTMLDivElement)) {
  //     return;
  //   }
  //   if (tool === "trimStart") {
  //     const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
  //     const asSec = project.viewport.pxToSecs(pxFromStartOfClip);
  //     clip.trimStartSec += asSec;
  //     clip.startOffsetSec += asSec;
  //     clip.notifyUpdate();
  //   }
  //   if (tool === "trimEnd") {
  //     const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
  //     const secsFromStartPos = project.viewport.pxToSecs(pxFromStartOfClip);
  //     const secsFromZero = clip.trimStartSec + secsFromStartPos;
  //     clip.trimEndSec = secsFromZero;
  //     clip.notifyUpdate();
  //   }
  // }

  const border = isSelected ? "1px solid #114411" : "1px solid #aaddaa";

  return (
    <div
      // onClick={onClipClick}
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
        left: project.viewport.pulsesToPx(clip.startOffsetPulses),
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
        {/* ({Math.round(clip.durationSec * 100) / 100}) */}
      </div>
      {/* <div className={styles.resizerStart} onMouseDown={(e) => onMouseDownToResize(e, "start")}></div>
      <div className={styles.resizerEnd} onMouseDown={(e) => onMouseDownToResize(e, "end")}></div> */}
      {notes.length}
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
