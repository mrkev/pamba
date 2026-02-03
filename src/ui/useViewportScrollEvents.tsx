import { useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { MIN_TIMELINE_SCALE, MAX_TIMELINE_SCALE } from "../constants";
import { AudioProject } from "../lib/project/AudioProject";
import { clamp } from "../utils/math";
import { nullthrows } from "../utils/nullthrows";
import { useEventListener } from "./useEventListener";

export function useViewportScrollEvents(project: AudioProject, projectDivRef: React.RefObject<HTMLDivElement | null>) {
  const context = useRef({ wheelCalled: false });

  useEventListener(
    "wheel",
    projectDivRef,
    useCallback(
      (e: WheelEvent) => {
        // e.preventDefault();
        // see comment on "scroll" event below
        context.current.wheelCalled = true;
        requestAnimationFrame(function hello() {
          context.current.wheelCalled = false;
          performance.mark("hello");
        });

        const projectDiv = nullthrows(projectDivRef.current);
        const mouseX = e.clientX - projectDiv.getBoundingClientRect().left;

        // both pinches and two-finger pans trigger the wheel event trackpads.
        // ctrlKey is true for pinches though, so we can use it to differentiate
        // one from the other.
        // pinch
        if (e.ctrlKey) {
          const sDelta = Math.exp(-e.deltaY / 100);
          // max scale is 1000
          const expectedNewScale = clamp(
            MIN_TIMELINE_SCALE,
            project.viewport.pxPerSecond.get() * sDelta,
            MAX_TIMELINE_SCALE,
          );
          project.viewport.setScale(expectedNewScale, mouseX);
          e.preventDefault();
          e.stopPropagation();
        }

        // pan
        else {
          const start = Math.max(project.viewport.scrollLeftPx.get() + e.deltaX, 0);
          flushSync(() => {
            project.viewport.scrollLeftPx.set(start);
          });
        }
      },
      [project.viewport, projectDivRef],
    ),
    { capture: false },
  );

  useEventListener(
    "scroll",
    projectDivRef,
    useCallback(
      /**
       * the "scroll" event:
       * - gets called for any scroll, including, for example, dragging the scrollbar
       * - gets called with a simple Event, which doesn't have much info, we don't use it
       * - gets called after the "wheel" event (tested on Chrome) when the wheel is used to scroll
       * we need to make sure our viewport knows our scroll position even if the user scrolled not using the wheel
       *
       * TODO: can I just use scroll for pan always, wheel for scale, and avoid having to check if wheel was called?
       */
      (e) => {
        e.preventDefault();
        if (context.current.wheelCalled === true) {
          return;
        }

        const projectDiv = nullthrows(projectDivRef.current);
        const scroll = projectDiv.scrollLeft;
        flushSync(() => {
          project.viewport.scrollLeftPx.set(scroll);
        });
        // e?.preventDefault();
      },
      [project.viewport.scrollLeftPx, projectDivRef],
    ),
  );
}
