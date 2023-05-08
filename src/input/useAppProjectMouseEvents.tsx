import { useEffect } from "react";
import { exhaustive } from "../utils/exhaustive";
import { AudioProject } from "../lib/AudioProject";
import { useDerivedState } from "../lib/state/DerivedState";
import { pressedState } from "../pressedState";
import { MIN_TRACK_HEIGHT } from "../constants";

export function useAppProjectMouseEvents({
  project,
  projectDiv,
}: {
  project: AudioProject;
  projectDiv: HTMLDivElement | null;
}): void {
  const secsToPx = useDerivedState(project.secsToPx);

  useEffect(() => {
    if (!projectDiv) {
      return;
    }

    const pxToSecs = secsToPx.invert;

    const mouseDownEvent = function (e: MouseEvent) {
      // currentTarget should always be the element the event is attatched to,
      // so our project div.
      const { target, currentTarget } = e;
      if (!(target instanceof HTMLDivElement) || !(currentTarget instanceof HTMLDivElement)) {
        console.log("WOOP");
        return;
      }

      // // On a child element
      // if (e.target !== e.currentTarget) {
      //   console.log("CHILD");
      //   // drag clips around
      // }

      // On the project div element
      else {
        const div = e.currentTarget;
        if (!(div instanceof HTMLDivElement)) return;
        const position = {
          x: e.clientX + div.scrollLeft - div.getBoundingClientRect().x,
          y: e.clientY + div.scrollTop - div.getBoundingClientRect().y,
        };
        const asSecs = pxToSecs(position.x);
        // player.setCursorPos(asSecs);
        project.cursorPos.set(asSecs);

        project.selectionWidth.set(null);
        pressedState.set({
          status: "selecting_global_time",
          clientX: e.clientX,
          clientY: e.clientY,
          startTime: asSecs,
        });
      }
    };

    const mouseUpEvent = function (e: MouseEvent) {
      const pressed = pressedState.get();
      if (!pressed) {
        return;
      }

      const { status } = pressed;
      switch (status) {
        case "moving_clip": {
          pressed.track.deleteTime(pressed.clip.startOffsetSec, pressed.clip.endOffsetSec);
          pressed.originalTrack.removeClip(pressed.clip);
          pressed.track.addClip(pressed.clip);

          // const deltaX = e.clientX - pressed.clientX;
          // const asSecs = pxToSecs(deltaX);
          // const newOffset = pressed.clip.startOffsetSec + asSecs;
          // // console.log(newOffset)
          // pressed.clip.startOffsetSec = newOffset <= 0 ? 0 : newOffset;
          pressedState.set(null);
          break;
        }
        case "resizing_track":
        case "resizing_clip": {
          pressedState.set(null);
          break;
        }

        case "selecting_global_time": {
          const { startTime } = pressed;
          pressedState.set(null);
          const selWidth = pxToSecs(e.clientX - pressed.clientX);

          if (selWidth === 0) {
            return;
          }

          if (selWidth > 0) {
            project.selected.set({
              status: "time",
              start: startTime,
              end: startTime + selWidth,
            });
            return;
          }

          project.selected.set({
            status: "time",
            start: startTime + selWidth,
            end: startTime,
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
        default:
          exhaustive(status);
      }
    };

    const mouseMoveEvent = function (e: MouseEvent) {
      const pressed = pressedState.get();
      if (!pressed) {
        return;
      }
      const { status } = pressed;
      switch (status) {
        case "moving_clip": {
          const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
          const newOffset = Math.max(0, pressed.originalClipOffsetSec + deltaXSecs);
          pressed.clip.startOffsetSec = newOffset;
          pressed.clip.notifyUpdate();
          break;
        }

        case "resizing_track": {
          const delta = e.clientY - pressed.clientY;
          const newHeight = Math.max(MIN_TRACK_HEIGHT, pressed.originalHeight + delta);
          pressed.track.trackHeight.set(newHeight);
          break;
        }

        case "resizing_clip": {
          const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
          if (pressed.from === "end") {
            // We can't trim a clip to end before it's beggining
            let newEndPosSec = Math.max(0, pressed.originalClipEndPosSec + deltaXSecs);
            // and also prevent it from extending beyond its original length
            newEndPosSec = Math.min(newEndPosSec, pressed.clip.lengthSec);

            pressed.clip.trimEndSec = newEndPosSec;
          } else if (pressed.from === "start") {
            // Can't trim past the length of the clip, so
            // clamp it on one side to that.
            let newTrimStartSec = Math.min(pressed.clip.lengthSec, pressed.originalClipStartPosSec + deltaXSecs);
            // let's not allow extending the begging back before 0
            newTrimStartSec = Math.max(newTrimStartSec, 0);

            // The change in trim, not mouse position
            const actualDelta = newTrimStartSec - pressed.originalClipStartPosSec;
            let newOffset = pressed.originalClipOffsetSec + actualDelta;

            pressed.clip.trimStartSec = newTrimStartSec;
            pressed.clip.startOffsetSec = newOffset;
          }

          pressed.clip.notifyUpdate();
          break;
        }

        case "selecting_global_time": {
          const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
          project.selectionWidth.set(deltaXSecs);
          project.selected.set(null);
          break;
        }

        default:
          exhaustive(status);
      }
    };

    projectDiv.addEventListener("mousedown", mouseDownEvent);
    document.addEventListener("mouseup", mouseUpEvent);
    document.addEventListener("mousemove", mouseMoveEvent);
    return () => {
      projectDiv.removeEventListener("mousedown", mouseDownEvent);
      document.removeEventListener("mouseup", mouseUpEvent);
      document.removeEventListener("mousemove", mouseMoveEvent);
    };
  }, [project.cursorPos, project.selected, project.selectionWidth, projectDiv, secsToPx]);
}
