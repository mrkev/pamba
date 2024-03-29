import React, { useCallback } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { modifierState } from "../ModifierState";
import type { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip, pulsesToSec } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../pressedState";
import { RenamableLabel } from "./RenamableLabel";
import { StandardClip } from "./StandardClip";

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
  const width = project.viewport.pxForPulse(clip.lengthPulses);
  const [bpm] = useLinkedState(project.tempo);
  const notes = useContainer(clip.notes);
  // const startTrimmedWidth = project.viewport.secsToPx(clip.trimStartSec);
  const [tool] = useLinkedState(project.pointerTool);
  const [name] = usePrimitive(clip.name);
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

  const onMouseDownToMove = useCallback(
    (e: MouseEvent) => {
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
        originalClipStartOffsetSec: pulsesToSec(clip.startOffsetPulses, bpm),
        originalClipEndOffsetSec: pulsesToSec(clip._timelineEndU, bpm),
        inHistory: false,
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
    },
    [bpm, clip, project.selected, project.selectionWidth, tool, track],
  );

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

  return (
    <StandardClip
      clip={clip}
      isSelected={isSelected}
      onMouseDownToResize={function (e: React.MouseEvent<HTMLDivElement, MouseEvent>, from: "end" | "start"): void {}}
      onMouseDownToMove={onMouseDownToMove}
      onClipClick={() => {}}
      width={width}
      left={Math.floor(project.viewport.pxForPulse(clip.startOffsetPulses))}
      style={{}}
    >
      {notes.length}
    </StandardClip>
  );
}

const useStyles = createUseStyles({
  clip: {
    backgroundColor: "#ccffcc",
    boxSizing: "border-box",
    height: "100%",
    userSelect: "none",
    color: "white",
    pointerEvents: "all",
    display: "flex",
    flexDirection: "column",
    position: "absolute",
  },
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
