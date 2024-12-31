import { useCallback } from "react";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { pressedState } from "../ui/pressedState";
import { useEventListener } from "../ui/useEventListener";
import { snapped } from "../lib/viewport/ProjectViewport";
import { MidiTrack } from "../midi/MidiTrack";

// TODO: merge into project mouse events?
export function useTrackMouseEvents(
  trackRef: React.RefObject<HTMLDivElement | null | undefined>,
  project: AudioProject,
  track: AudioTrack | MidiTrack,
) {
  useEventListener(
    "mousedown",
    trackRef,
    useCallback(
      (e: MouseEvent) => {
        if (
          e.target instanceof HTMLElement &&
          (e.target.getAttribute("data-clip-header") === "true" ||
            // TODO: hack find a more reliable way to not move the cursor when clicking the header
            // withought preventDefault on the clip header's mousedown because it breaks the clip
            // header's double-click. We look at the parent in case the user clicks the renamable label
            e.target.parentElement?.getAttribute("data-clip-header") === "true")
        ) {
          return true;
        }

        const div = trackRef.current;
        if (div == null) {
          return;
        }

        if (project.pointerTool.get() !== "move") {
          return;
        }

        if (e.button !== 0) {
          return;
        }

        const position = {
          x: e.clientX + div.scrollLeft - div.getBoundingClientRect().x,
          y: e.clientY + div.scrollTop - div.getBoundingClientRect().y,
        };

        const asSecs = project.viewport.pxToSecs(position.x);
        const newPos = snapped(project, e, asSecs);

        pressedState.set({
          status: "selecting_track_time",
          clientX: e.clientX,
          clientY: e.clientY,
          startTime: newPos,
          track,
        });

        // The tracks the cursor currently operates on
        project.cursorTracks.clear();
        project.cursorTracks.add(track);
        // the cursor
        project.cursorPos.set(newPos);
        project.selectionWidth.set(null);
        // selection state
        // project.selected.set(null);

        // We handle it here, we dont want the projectDiv mouse event to handle it too
        e.stopPropagation();
        // e.preventDefault();
      },
      [project, track, trackRef],
    ),
  );

  useEventListener(
    "mouseenter",
    trackRef,
    useCallback(
      function (_e) {
        // tood: add tracks to selecting_track_time

        if (project.pointerTool.get() !== "move") {
          return;
        }

        // TODOOOOOOOOOOOOOOO
        const pressed = pressedState.get();
        if (pressed && pressed.status === "moving_clip") {
          pressedState.setDyn((prev) => Object.assign({}, prev, { track }));
        }
      },
      [project.pointerTool, track],
    ),
  );

  useEventListener(
    "mouseleave",
    trackRef,
    useCallback(() => {
      // tood: remove tracks from selecting_track_time
      // console.log("mouse leave");
    }, []),
  );
}
