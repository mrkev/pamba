import React, { useCallback } from "react";
import { useContainer } from "structured-state";
import { modifierState } from "../ModifierState";
import type { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip, pulsesToSec } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../pressedState";
import { StandardClip } from "./StandardClip";
import { PrimarySelectionState } from "../lib/project/SelectionState";

export function ClipM({
  clip,
  isSelected,
  project,
  track,
}: {
  clip: MidiClip;
  rerender: () => void; // todo: unused
  isSelected: boolean;
  project: AudioProject;
  track: MidiTrack | null; // null if clip is being rendered for move
}) {
  const [bpm] = useLinkedState(project.tempo);
  const notes = useContainer(clip.notes);
  // const startTrimmedWidth = project.viewport.secsToPx(clip.trimStartSec);
  const [tool] = useLinkedState(project.pointerTool);
  const width = project.viewport.pulsesToPx(clip.timelineLength.ensurePulses());
  const left = Math.floor(project.viewport.pulsesToPx(clip.startOffsetPulses));

  // const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useSubscribeToSubbableMutationHashable(clip);

  const onMouseDownToResize = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") => {
      e.stopPropagation();
      if (tool !== "move") {
        return;
      }

      // pressedState.set({
      //   status: "resizing_clip",
      //   clip,
      //   // IDEA: just clone and have the original clip at hand
      //   originalClipEndPosSec: clip.trimEndSec,
      //   originalClipStartPosSec: clip.trimStartSec,
      //   originalClipOffsetSec: clip.startOffsetSec,
      //   from,
      //   clientX: e.clientX,
      //   clientY: e.clientY,
      // });
    },
    [tool],
  );

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

      project.selected.setDyn((prev): PrimarySelectionState | null => {
        const selectAdd = modifierState.meta || modifierState.shift;
        if (selectAdd && prev !== null && prev.status === "clips") {
          prev.clips.push({ kind: "midi", clip, track });
          prev.test.add(clip);
          prev.test.add(track);
          return { ...prev };
        } else {
          return {
            status: "clips",
            clips: [{ kind: "midi", clip, track }],
            test: new Set([clip, track]),
          };
        }
      });

      project.selectionWidth.set(null);
      e.stopPropagation();
    },
    [bpm, clip, project.selected, project.selectionWidth, tool, track],
  );

  const onClipClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const div = e.currentTarget;
    if (!(div instanceof HTMLDivElement)) {
      return;
    }
    // if (tool === "trimStart") {
    //   const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
    //   const asSec = project.viewport.pxToSecs(pxFromStartOfClip);
    //   clip.trimStartSec += asSec;
    //   clip.startOffsetSec += asSec;
    //   clip.notifyUpdate();
    // }
    // if (tool === "trimEnd") {
    //   const pxFromStartOfClip = e.clientX - div.getBoundingClientRect().x;
    //   const secsFromStartPos = project.viewport.pxToSecs(pxFromStartOfClip);
    //   const secsFromZero = clip.trimStartSec + secsFromStartPos;
    //   clip.trimEndSec = secsFromZero;
    //   clip.notifyUpdate();
    // }
  }, []);

  return (
    <StandardClip
      clip={clip}
      isSelected={isSelected}
      onMouseDownToResize={onMouseDownToResize}
      onMouseDownToMove={onMouseDownToMove}
      onClipClick={onClipClick}
      width={width}
      left={left}
      style={{}}
    >
      {notes.length}
    </StandardClip>
  );
}
