import { useCallback, useRef } from "react";
import { history } from "structured-state";
import {
  MAX_TIMELINE_SCALE,
  MIDI_CLIP_EDITOR_MAX_H_SCALE,
  MIDI_CLIP_EDITOR_MIN_H_SCALE,
  MIN_TIMELINE_SCALE,
  TRACK_HEIGHT,
} from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { clipMovePPQN, clipMoveSec, pointMovePulses, pointMoveSec } from "../lib/clipMoveSec";
import { AudioProject } from "../lib/project/AudioProject";
import { pulsesToSec } from "../lib/project/TimelineT";
import { standardTrack } from "../lib/StandardTrack";
import { snapped, snapPulses } from "../lib/viewport/snap";
import { standardViewport } from "../lib/viewport/StandardViewport";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../ui/pressedState";
import { useDocumentEventListener, useEventListener } from "../ui/useEventListener";
import { PointerPressMeta, usePointerPressMove } from "../ui/usePointerPressMove";
import { exhaustive } from "../utils/exhaustive";
import { clamp } from "../utils/math";

// Vertical pixels dragged to double (or halve) the zoom level.
const AXIS_ZOOM_PX_PER_DOUBLING = 100;
// Movement (px) below which a gesture counts as a click, not a drag.
const AXIS_DRAG_THRESHOLD_PX = 3;

type AxisZoomPanConfig = {
  minScale: number;
  maxScale: number;
  // Fixed screen-space left padding that does not scale with zoom (0 if none).
  // The zoom anchor is measured from the content origin, so it must be subtracted out.
  paddingPx: number;
  getScale: () => number;
  getScroll: () => number;
  setScale: (scale: number) => void;
  setScroll: (scroll: number) => void;
  // A gesture that never crossed the drag threshold. `anchorPx` is the pointer x
  // relative to the axis' visible left edge, captured at pointer down.
  onClick?: (anchorPx: number, e: PointerEvent) => void;
  // Return true from pointer down to veto the gesture (e.g. when a child element
  // drives its own drag).
  shouldAbort?: (e: PointerEvent) => boolean;
};

/**
 * Ableton-style interaction on a ruler axis: dragging up/down zooms (anchored under
 * the pointer), dragging left/right pans, and a plain click (no drag) fires `onClick`.
 *
 * Viewport-agnostic: it reads/writes scale and scroll through the supplied getters and
 * setters (px-per-second for the timeline, px-per-pulse for the MIDI editor, etc.), so
 * both the timeline header axis and the MIDI clip editor's time axis share it.
 */
export function useAxisZoomPanGesture(
  axisContainer: React.RefObject<HTMLDivElement | null>,
  config: AxisZoomPanConfig,
) {
  // Keep the latest config reachable from stable callbacks so we don't re-attach
  // listeners every render.
  const configRef = useRef(config);
  configRef.current = config;

  const gestureRef = useRef<{
    // Viewport state captured at pointer down, so each move computes from the
    // gesture start (no compounding drift).
    initialScale: number;
    initialScroll: number;
    // Pointer x relative to the axis' visible left edge (the zoom anchor).
    anchorPx: number;
    dragged: boolean;
  } | null>(null);

  const down = useCallback(
    (e: PointerEvent) => {
      const div = axisContainer.current;
      if (div == null || e.button !== 0) {
        return "abort";
      }
      if (configRef.current.shouldAbort?.(e)) {
        return "abort";
      }

      gestureRef.current = {
        initialScale: configRef.current.getScale(),
        initialScroll: configRef.current.getScroll(),
        anchorPx: e.clientX - div.getBoundingClientRect().x,
        dragged: false,
      };
    },
    [axisContainer],
  );

  const move = useCallback((e: PointerEvent, meta: PointerPressMeta) => {
    const gesture = gestureRef.current;
    if (gesture == null) {
      return;
    }

    const deltaX = e.clientX - meta.downX;
    const deltaY = e.clientY - meta.downY;
    if (
      !gesture.dragged &&
      Math.abs(deltaX) < AXIS_DRAG_THRESHOLD_PX &&
      Math.abs(deltaY) < AXIS_DRAG_THRESHOLD_PX
    ) {
      return;
    }
    gesture.dragged = true;

    const cfg = configRef.current;
    // Zoom: dragging down (positive deltaY) zooms in. Mirrors the anchored scroll
    // math in the viewports' setXScale, but computed from the gesture start so
    // combining with the pan below stays drift-free.
    const newScale = clamp(
      cfg.minScale,
      gesture.initialScale * Math.pow(2, deltaY / AXIS_ZOOM_PX_PER_DOUBLING),
      cfg.maxScale,
    );
    const scaleFactorFactor = newScale / gesture.initialScale;
    const anchor = gesture.anchorPx - cfg.paddingPx;
    const zoomedStartPx = (gesture.initialScroll + anchor) * scaleFactorFactor - anchor;
    // Pan: dragging right (positive deltaX) grabs the ruler and pulls it right,
    // revealing earlier content.
    const newStartPx = Math.max(0, zoomedStartPx - deltaX);

    cfg.setScale(newScale);
    cfg.setScroll(newStartPx);
  }, []);

  const up = useCallback((e: PointerEvent) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (gesture == null || gesture.dragged) {
      return;
    }
    configRef.current.onClick?.(gesture.anchorPx, e);
  }, []);

  usePointerPressMove(axisContainer, { down, move, up });
}

/**
 * Ableton-style interaction on the timeline header axis: drag zooms/pans the project
 * viewport, a plain click moves the playhead (like Ableton's insert marker).
 */
export function useAxisContainerMouseEvents(
  project: AudioProject,
  axisContainer: React.RefObject<HTMLDivElement | null>,
) {
  const vp = project.viewport;
  useAxisZoomPanGesture(axisContainer, {
    minScale: MIN_TIMELINE_SCALE,
    maxScale: MAX_TIMELINE_SCALE,
    paddingPx: vp.START_PADDING_PX,
    getScale: () => vp.pxPerSecond.get(),
    getScroll: () => vp.scrollLeftPx.get(),
    setScale: (scale) => vp.pxPerSecond.set(scale),
    setScroll: (scroll) => vp.scrollLeftPx.set(scroll),
    // The loop markers live inside the axis container and drive their own drag (via
    // pressedState). stopPropagation on their mousedown doesn't stop this native
    // pointerdown, so bail out to avoid panning while dragging them.
    shouldAbort: (e) => e.target instanceof Element && e.target.closest(".name-loop-rect") != null,
    onClick: (anchorPx, e) => {
      const asSecs = standardViewport.pxToSecs(vp, anchorPx + vp.scrollLeftPx.get(), "pos");
      project.cursorPos.set(Math.max(0, snapped(project, e, asSecs)));
      project.selectionWidth.set(null);
      project.selected.set(null);
    },
  });
}

/**
 * Same gesture as the timeline header axis, but bound to a MIDI clip's detailed
 * viewport (px-per-pulse). A plain click moves the project cursor to the clicked
 * clip-relative tick.
 */
export function useMidiAxisMouseEvents(
  clip: MidiClip,
  project: AudioProject,
  axisContainer: React.RefObject<HTMLDivElement | null>,
) {
  const vp = clip.detailedViewport;
  useAxisZoomPanGesture(axisContainer, {
    minScale: MIDI_CLIP_EDITOR_MIN_H_SCALE,
    maxScale: MIDI_CLIP_EDITOR_MAX_H_SCALE,
    // The MIDI ruler has no fixed left padding; its content origin is its left edge.
    paddingPx: 0,
    getScale: () => vp.pxPerPulse.get(),
    getScroll: () => vp.scrollLeftPx.get(),
    setScale: (scale) => vp.pxPerPulse.set(scale),
    setScroll: (scroll) => vp.scrollLeftPx.set(scroll),
    onClick: (anchorPx, e) => {
      // The ruler doesn't scroll its container (it redraws at `pulse * pxPerPulse -
      // scrollLeftPx`), so convert the on-screen anchor back to content px first.
      const contentPx = anchorPx + vp.scrollLeftPx.get();
      const tick = Math.max(0, snapPulses(project, e, Math.floor(vp.pxToPulses(contentPx))));
      project.cursorPos.set(pulsesToSec(clip.timelineStart.pulses(project) + tick, project.tempo.get()));
      project.selectionWidth.set(null);
    },
  });
}

export function useTimelineMouseEvents(
  project: AudioProject,
  projectDivRef: React.RefObject<HTMLDivElement | null>,
): void {
  useEventListener(
    "mousedown",
    projectDivRef,
    useCallback(
      function mouseDown(e) {
        const div = projectDivRef.current;
        if (div == null) {
          return;
        }

        if (project.pointerTool.get() !== "move") {
          return;
        }

        if (e.button !== 0) {
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

        const asSecs = standardViewport.pxToSecs(project.viewport, position.x, "pos");
        const newPos = Math.max(0, snapped(project, e, asSecs));

        console.log("GLOBAL TIME");
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
      function mouseUp(e: MouseEvent) {
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
            const clipPreview = pressed.clipForRendering;
            if (pressed.clip.timelineStart.eq(clipPreview.timelineStart, project)) {
              pressedState.set(null);
              break;
            }

            history.record("move clip", () => {
              pressed.clip.timelineStart.set(clipPreview.timelineStart);
              if (
                pressed.track instanceof AudioTrack &&
                pressed.originalTrack instanceof AudioTrack &&
                pressed.clip instanceof AudioClip
              ) {
                standardTrack.moveClip(project, pressed.clip, pressed.originalTrack, pressed.track);
              } else if (
                pressed.track instanceof MidiTrack &&
                pressed.originalTrack instanceof MidiTrack &&
                pressed.clip instanceof MidiClip
              ) {
                standardTrack.deleteTime(
                  project,
                  pressed.track,
                  pressed.clip.timelineStart.pulses(project),
                  pressed.clip._timelineEndU,
                );
                standardTrack.removeClip(project, pressed.originalTrack, pressed.clip);
                standardTrack.addClip(project, pressed.track, pressed.clip);
              } else {
                console.warn("mouseup: moving_clip: can't operate");
              }
            });

            pressedState.set(null);
            break;
          }
          case "dragging_transferable": {
            // Seems more reliable to end "dragging_transferable" in the dragged
            // div's onDragEnd, so we end it there instead.
            // pressedState.set(null);
            break;
          }

          case "resizing_track":
            pressedState.set(null);
            break;

          case "selecting_global_time": {
            const { startTime } = pressed;
            const deltaXSecs = standardViewport.pxToSecs(project.viewport, e.clientX - pressed.clientX, "len");
            const selWidth = snapped(project, e, deltaXSecs);
            pressedState.set(null);

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

            // negative selection

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
            const deltaXSecs = standardViewport.pxToSecs(project.viewport, e.clientX - pressed.clientX, "len");
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

          case "moving_timeline_points":
            pressedState.set(null);
            break;
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
      function mouseMove(e: MouseEvent) {
        // TODO: clone clip, render cloned when dragging, move original onmouseup with history
        const pressed = pressedState.get();
        if (!pressed) {
          return;
        }
        if (project.pointerTool.get() != "move") {
          return;
        }

        switch (pressed.status) {
          case "moving_clip": {
            // metaKey flips it
            const snap = e.metaKey ? !project.snapToGrid.get() : project.snapToGrid.get();
            const deltaX = e.clientX - pressed.clientX;

            const previewClip = pressed.clipForRendering;

            if (previewClip instanceof AudioClip) {
              const deltaXSecs = standardViewport.pxToSecs(project.viewport, deltaX, "pos");
              const newOffset = Math.max(0, pressed.originalClipStart.secs(project) + deltaXSecs);
              clipMoveSec(previewClip, newOffset, pressed.originalClipStart, project, snap);
            } else if (previewClip instanceof MidiClip) {
              const deltaXPulses = project.viewport.pxToPulses(deltaX, "pos");
              const newOffset = Math.max(0, pressed.originalClipStart.pulses(project) + deltaXPulses);
              clipMovePPQN(previewClip, newOffset, pressed.originalClipStart, project, snap);
            } else {
              exhaustive(previewClip);
            }

            break;
          }
          case "dragging_transferable": {
            break;
          }

          case "resizing_track": {
            const delta = e.clientY - pressed.clientY;
            const newHeight = Math.max(TRACK_HEIGHT, pressed.originalHeight + delta);
            pressed.track.height.set(newHeight);
            break;
          }

          case "selecting_global_time": {
            const deltaXSecs = standardViewport.pxToSecs(project.viewport, e.clientX - pressed.clientX, "len");
            const selWidth = snapped(project, e, deltaXSecs);
            project.selectionWidth.set(selWidth);
            project.selected.set(null);
            // project.selected.set({ status: "time", start: pressed.startTime, end: pressed.startTime + deltaXSecs });
            break;
          }

          case "moving_timeline_points": {
            // "TimelinePoint obj: num + unit", standard moving behaviour
            // TODO: For: Markers, loop markers, clips, midi notes, etc

            // metaKey flips it
            const snap = e.metaKey ? !project.snapToGrid.get() : project.snapToGrid.get();
            const deltaX = e.clientX - pressed.clientX;
            const lowerLim = pressed.limit?.[0] ?? null;
            const upperLim = pressed.limit?.[1] ?? null;

            for (const { original, point } of pressed.points) {
              switch (point.unit) {
                case "seconds": {
                  const deltaXSecs = standardViewport.pxToSecs(project.viewport, deltaX, "pos");
                  let newOffsetS = Math.max(0, original.t + deltaXSecs);
                  const lowerLimSecs = lowerLim && lowerLim.secs(project);
                  const upperLimSecs = upperLim && upperLim.secs(project);
                  if (lowerLimSecs != null && newOffsetS < lowerLimSecs) {
                    newOffsetS = lowerLimSecs;
                  }
                  if (upperLimSecs != null && newOffsetS > upperLimSecs) {
                    newOffsetS = upperLimSecs;
                  }
                  pointMoveSec(project, point, newOffsetS, snap);
                  break;
                }

                case "pulses": {
                  const deltaXPulses = project.viewport.pxToPulses(deltaX, "pos");
                  let newOffsetP = Math.max(0, original.t + deltaXPulses);
                  const lowerLimPulses = lowerLim && lowerLim.pulses(project);
                  const upperLimPulses = upperLim && upperLim.pulses(project);
                  if (lowerLimPulses != null && newOffsetP < lowerLimPulses) {
                    newOffsetP = lowerLimPulses;
                  }
                  if (upperLimPulses != null && newOffsetP > upperLimPulses) {
                    newOffsetP = upperLimPulses;
                  }

                  pointMovePulses(project, point, newOffsetP, snap);
                  break;
                }

                case "frames":
                case "bars": {
                  throw new Error("todo: unimplmented");
                }

                default:
                  exhaustive(point.unit);
              }
            }

            break;
          }

          case "selecting_track_time":
            const deltaXSecs = standardViewport.pxToSecs(project.viewport, e.clientX - pressed.clientX, "len");
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
