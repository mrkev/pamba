import { useCallback } from "react";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { pressedState } from "../pressedState";
import { useEventListener } from "../ui/useEventListener";
import { snapped } from "./useAppProjectMouseEvents";

export function useTrackMouseEvents(
  trackRef: React.RefObject<HTMLDivElement>,
  project: AudioProject,
  track: AudioTrack
) {
  useEventListener(
    "mousedown",
    trackRef,
    useCallback(
      (e: MouseEvent) => {
        const div = trackRef.current;
        if (div == null) {
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

        e.stopPropagation();
        e.preventDefault();
      },
      [project, track, trackRef]
    )
  );
}
