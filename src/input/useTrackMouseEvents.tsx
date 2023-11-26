import { useCallback } from "react";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { pressedState } from "../pressedState";
import { useEventListener } from "../ui/useEventListener";
import { snapped } from "../lib/project/ProjectViewportUtil";
import { MidiTrack } from "../midi/MidiTrack";

// TODO: merge into project mouse events?
export function useTrackMouseEvents(
  trackRef: React.RefObject<HTMLDivElement>,
  project: AudioProject,
  track: AudioTrack | MidiTrack,
) {
  useEventListener(
    "mousedown",
    trackRef,
    useCallback(
      (e: MouseEvent) => {
        console.log("foobar");
        const div = trackRef.current;
        if (div == null) {
          return;
        }

        if (project.pointerTool.get() !== "move") {
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
        project.selected.set(null);

        // e.stopPropagation();
        e.preventDefault();
      },
      [project, track, trackRef],
    ),
  );

  useEventListener(
    "mouseenter",
    trackRef,
    useCallback(
      function (_e) {
        if (project.pointerTool.get() !== "move") {
          return;
        }

        const pressed = pressedState.get();
        if (pressed && pressed.status === "moving_clip") {
          pressedState.setDyn((prev) => Object.assign({}, prev, { track }));
        }
      },
      [project.pointerTool, track],
    ),
  );
}
