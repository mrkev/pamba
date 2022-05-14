import { useEffect } from "react";
import { AudioProject } from "../lib/AudioProject";
import { useDerivedState } from "../lib/DerivedState";
import { useLinkedState } from "../lib/LinkedState";
import { pressedState } from "../lib/linkedState/pressedState";

export function useAppProjectMouseEvents({
  project,
  projectDiv,
  rerender,
}: {
  project: AudioProject;
  projectDiv: HTMLDivElement | null;
  rerender: () => void;
}): void {
  const [pressed, setPressed] = useLinkedState(pressedState);
  const [, setCursorPos] = useLinkedState(project.cursorPos);
  const [, setSelectionWidth] = useLinkedState(project.selectionWidth);
  const [, setSelected] = useLinkedState(project.selected);
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
        setCursorPos(asSecs);

        setSelectionWidth(null);
        setPressed({
          status: "selecting",
          clientX: e.clientX,
          clientY: e.clientY,
          startTime: asSecs,
        });
      }
    };

    const mouseUpEvent = function (e: MouseEvent) {
      if (!pressed) {
        return;
      }

      if (pressed.status === "moving_clip") {
        pressed.track.deleteTime(pressed.clip.startOffsetSec, pressed.clip.endOffsetSec);
        pressed.originalTrack.removeClip(pressed.clip);
        pressed.track.addClip(pressed.clip);

        // const deltaX = e.clientX - pressed.clientX;
        // const asSecs = pxToSecs(deltaX);
        // const newOffset = pressed.clip.startOffsetSec + asSecs;
        // // console.log(newOffset)
        // pressed.clip.startOffsetSec = newOffset <= 0 ? 0 : newOffset;
        setPressed(null);
      }

      if (pressed.status === "selecting") {
        const { startTime } = pressed;
        setPressed(null);
        const selWidth = pxToSecs(e.clientX - pressed.clientX);

        if (selWidth == null) {
          return;
        }

        if (selWidth > 0) {
          setSelected({
            status: "time",
            start: startTime,
            end: startTime + selWidth,
          });
          return;
        }

        setSelected({
          status: "time",
          start: startTime + selWidth,
          end: startTime,
        });

        // Move the cursor to the beggining of the selection
        // and make the selection positive
        setCursorPos((pos) => {
          // player.setCursorPos(pos + selWidth);
          return pos + selWidth;
        });

        setSelectionWidth(Math.abs(selWidth));
      }

      if (pressed.status === "resizing_clip") {
        setPressed(null);
      }
    };

    const mouseMoveEvent = function (e: MouseEvent) {
      if (!pressed) {
        return;
      }
      if (pressed.status === "moving_clip") {
        const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
        const newOffset = Math.max(0, pressed.originalClipOffsetSec + deltaXSecs);
        pressed.clip.startOffsetSec = newOffset;
        rerender();
      }

      if (pressed.status === "resizing_clip") {
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

        rerender();
      }

      if (pressed.status === "selecting") {
        const deltaXSecs = pxToSecs(e.clientX - pressed.clientX);
        setSelectionWidth(deltaXSecs);
        setSelected(null);
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
  }, [pressed, projectDiv, rerender, secsToPx, setCursorPos, setPressed, setSelected, setSelectionWidth]);
}
