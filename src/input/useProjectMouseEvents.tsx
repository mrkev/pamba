import { useCallback } from "react";
import { history } from "structured-state";
import { MIN_TRACK_HEIGHT } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { clipMovePPQN, clipMoveSec } from "../lib/clipMoveSec";
import { AudioProject } from "../lib/project/AudioProject";
import { snapped } from "../lib/project/ProjectViewportUtil";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../pressedState";
import { useDocumentEventListener, useEventListener } from "../ui/useEventListener";
import { exhaustive } from "../utils/exhaustive";
import { clamp } from "../utils/math";

export function timelineSecs(e: MouseEvent, projectDiv: HTMLDivElement, project: AudioProject) {
  const viewportStartPx = project.viewportStartPx.get();
  const position = {
    x: e.clientX + projectDiv.scrollLeft - projectDiv.getBoundingClientRect().x,
    y: e.clientY + projectDiv.scrollTop - projectDiv.getBoundingClientRect().y,
  };
  const asSecs = project.viewport.pxToSecs(position.x + viewportStartPx);
  return asSecs;
}

export function useAxisContainerMouseEvents(
  project: AudioProject,
  axisContainer: React.MutableRefObject<HTMLDivElement | null>,
) {
  useEventListener(
    "mousedown",
    axisContainer,
    useCallback(
      (e: MouseEvent) => {
        const div = axisContainer.current;
        if (div == null) {
          return;
        }

        if (project.pointerTool.get() != "move") {
          return;
        }

        const viewportStartPx = project.viewportStartPx.get();
        const position = {
          x: e.clientX + div.scrollLeft - div.getBoundingClientRect().x,
          y: e.clientY + div.scrollTop - div.getBoundingClientRect().y,
        };
        const asSecs = project.viewport.pxToSecs(position.x + viewportStartPx);

        const newPos = snapped(project, e, asSecs);
        // player.setCursorPos(asSecs);
        project.cursorPos.set(newPos);
        project.selectionWidth.set(null);
        pressedState.set({
          status: "selecting_global_time",
          clientX: e.clientX,
          clientY: e.clientY,
          startTime: newPos,
        });
      },
      [axisContainer, project],
    ),
  );
}

export function useTimelineMouseEvents(
  project: AudioProject,
  projectDivRef: React.MutableRefObject<HTMLDivElement | null>,
): void {
  useEventListener(
    "mousedown",
    projectDivRef,
    useCallback(
      (e) => {
        const div = projectDivRef.current;
        if (div == null) {
          return;
        }

        if (project.pointerTool.get() !== "move") {
          return;
        }

        if (
          e.target instanceof HTMLElement &&
          (e.target.getAttribute("data-clip-header") === "true" ||
            // TODO: hack find a more reliable way to not move the cursor when clicking the header
            // withought preventDefault on the clip header's mousedown because it breaks the clip
            // header's double-click. We look at the parent in case the user clicks the renamable label
            e.target.parentElement?.getAttribute("data-clip-header") === "true")
        ) {
          // duble-clicking the clip headr
          if (e.detail === 2) {
            appEnvironment.activeBottomPanel.set("editor");
          }
          return;
        }

        const position = {
          x: e.clientX + div.scrollLeft - div.getBoundingClientRect().x,
          y: e.clientY + div.scrollTop - div.getBoundingClientRect().y,
        };

        const asSecs = project.viewport.pxToSecs(position.x);
        const newPos = snapped(project, e, asSecs);

        pressedState.set({
          status: "selecting_global_time",
          clientX: e.clientX,
          clientY: e.clientY,
          startTime: newPos,
        });

        // TODO: the bottomost track?
        // project.cursorTracks.clear();
        // project.cursorTracks.add(track);
        // the cursor
        project.cursorPos.set(newPos);
        project.selectionWidth.set(null);
      },
      [project, projectDivRef],
    ),
  );

  useDocumentEventListener(
    "mouseup",
    useCallback(
      (e: MouseEvent) => {
        const pressed = pressedState.get();
        if (!pressed) {
          return;
        }

        if (project.pointerTool.get() != "move") {
          return;
        }

        const { status } = pressed;
        switch (status) {
          case "moving_clip": {
            // console.log("HEREHERE", e.target);
            if (
              pressed.track instanceof AudioTrack &&
              pressed.originalTrack instanceof AudioTrack &&
              pressed.clip instanceof AudioClip
            ) {
              pressed.track.deleteTime(project, pressed.clip.timelineStartSec, pressed.clip.timelineEndSec);
              pressed.track.addClip(project, pressed.clip);
              pressed.originalTrack.removeClip(project, pressed.clip);
            }

            if (
              pressed.track instanceof MidiTrack &&
              pressed.originalTrack instanceof MidiTrack &&
              pressed.clip instanceof MidiClip
            ) {
              pressed.track.deleteTime(project, pressed.clip.startOffsetPulses, pressed.clip._timelineEndU);
              pressed.originalTrack.removeClip(project, pressed.clip);
              pressed.track.addClip(project, pressed.clip);
            }

            console.warn("mouseup: moving_clip: can't operate");
            pressedState.set(null);
            break;
          }
          case "dragging_new_audio": {
            // Seems more reliable to end "dragging_new_audio" in the dragged
            // div's onDragEnd, so we end it there instead.
            // pressedState.set(null);
            break;
          }

          case "resizing_track":
          case "resizing_clip": {
            pressedState.set(null);
            break;
          }

          case "selecting_global_time": {
            const { startTime } = pressed;
            const deltaXSecs = project.viewport.pxToSecs(e.clientX - pressed.clientX);

            pressedState.set(null);
            const selWidth = snapped(project, e, deltaXSecs);

            if (selWidth === 0) {
              return;
            }

            if (selWidth > 0) {
              project.selected.set({
                status: "time",
                startS: startTime,
                endS: startTime + selWidth,
              });
              return;
            }

            project.selected.set({
              status: "time",
              startS: startTime + selWidth,
              endS: startTime,
            });

            // Move the cursor to the beggining of the selection
            // and make the selection positive
            project.cursorPos.setDyn((pos) => {
              // player.setCursorPos(pos + selWidth);
              return pos + selWidth;
            });

            project.selectionWidth.set(Math.abs(selWidth));
            break;
          }

          case "selecting_track_time": {
            const deltaXSecs = project.viewport.pxToSecs(e.clientX - pressed.clientX);
            const selWidthS = snapped(project, e, deltaXSecs);

            pressedState.set(null);
            const { startTime, track } = pressed;
            if (selWidthS === 0) {
              return;
            }
            if (selWidthS > 0) {
              project.selected.set({
                status: "track_time",
                startS: startTime,
                endS: startTime + selWidthS,
                tracks: [track],
                test: new Set([track]),
              });
            } else {
              project.selected.set({
                status: "track_time",
                startS: startTime + selWidthS,
                endS: startTime,
                tracks: [track],
                test: new Set([track]),
              });
              // Move the cursor to the beggining of the selection
              // and make the selection positive
              project.cursorPos.setDyn((pos) => {
                // player.setCursorPos(pos + selWidth);
                return pos + selWidthS;
              });

              project.selectionWidth.set(Math.abs(selWidthS));
            }

            break;
          }
          default:
            exhaustive(status);
        }
      },
      [project],
    ),
  );

  useDocumentEventListener(
    "mousemove",
    useCallback(
      (e: MouseEvent) => {
        const pressed = pressedState.get();
        if (!pressed) {
          return;
        }
        if (project.pointerTool.get() != "move") {
          return;
        }

        switch (pressed.status) {
          case "moving_clip": {
            if (!pressed.inHistory) {
              history.push([pressed.clip]);
            }

            // metaKey flips it
            const snap = e.metaKey ? !project.snapToGrid.get() : project.snapToGrid.get();
            const deltaX = e.clientX - pressed.clientX;
            const deltaXSecs = project.viewport.pxToSecs(deltaX);
            const newOffset = Math.max(0, pressed.originalClipStartOffsetSec + deltaXSecs);
            if (pressed.clip instanceof AudioClip) {
              clipMoveSec(pressed.clip, newOffset, pressed.originalClipStartOffsetSec, project, snap);
            } else {
              clipMovePPQN(pressed.clip, newOffset, project, snap);
            }

            // Hacking around the readonly
            (pressed as any).inHistory = true;

            break;
          }
          case "dragging_new_audio": {
            console.log("TODO");
            break;
          }

          case "resizing_track": {
            const delta = e.clientY - pressed.clientY;
            const newHeight = Math.max(MIN_TRACK_HEIGHT, pressed.originalHeight + delta);
            pressed.track.height.set(newHeight);
            break;
          }

          case "resizing_clip": {
            const opDeltaXSecs = project.viewport.pxToSecs(e.clientX - pressed.clientX);
            if (pressed.clip instanceof MidiClip) {
              throw new Error("MidiClip unimplemented");
            }

            if (!pressed.inHistory) {
              history.push([pressed.clip]);
            }

            if (pressed.from === "end") {
              const newClipEnd = clamp(
                // We can't trim a clip to end before it's beggining
                0,
                pressed.originalClipLength + opDeltaXSecs,
                // and also prevent it from extending beyond its original length
                pressed.clip.bufferLength - pressed.clip.bufferOffset,
              );
              pressed.clip.clipLengthSec = newClipEnd;
            } else if (pressed.from === "start") {
              const newBufferOffset = clamp(
                // let's not allow extending the beginning back before 0
                0,
                pressed.originalBufferOffset + opDeltaXSecs,
                // Can't trim past the length of the clip
                pressed.originalBufferOffset + pressed.originalClipLength,
              );
              // console.log("NBO", newBufferOffset, pressed.originalClipLength);
              const newTimelineStartSec = clamp(
                pressed.originalTimelineStartSec - pressed.originalBufferOffset,
                pressed.originalTimelineStartSec + opDeltaXSecs,
                pressed.originalTimelineStartSec + pressed.originalClipLength,
              );
              const newClipLength = clamp(
                // zero length is minimum
                0,
                pressed.originalClipLength - opDeltaXSecs,
                // since trimming from start, max is going back all the way to zero
                pressed.originalClipLength + pressed.originalBufferOffset,
              );
              pressed.clip.bufferOffset = newBufferOffset;
              pressed.clip.timelineStartSec = newTimelineStartSec;
              pressed.clip.clipLengthSec = newClipLength;
            } else {
              exhaustive(pressed.from);
            }

            // NOTE: hacking away the readonly
            (pressed as any).inHistory = true;

            pressed.clip._notifyChange();
            break;
          }

          case "selecting_global_time": {
            const deltaXSecs = project.viewport.pxToSecs(e.clientX - pressed.clientX);
            const newWidth = snapped(project, e, deltaXSecs);
            project.selectionWidth.set(newWidth);
            project.selected.set(null);
            // project.selected.set({ status: "time", start: pressed.startTime, end: pressed.startTime + deltaXSecs });
            break;
          }

          case "selecting_track_time":
            const deltaXSecs = project.viewport.pxToSecs(e.clientX - pressed.clientX);
            const newWidth = snapped(project, e, deltaXSecs);
            project.selectionWidth.set(newWidth);
            // project.selected.set(null);
            break;
          default:
            exhaustive(pressed);
        }
      },
      [project],
    ),
  );
}
