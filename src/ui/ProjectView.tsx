import useResizeObserver from "@react-hook/resize-observer";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useContainer, usePrimitive } from "structured-state";
import { MAX_TIMELINE_SCALE, MIN_TIMELINE_SCALE } from "../constants";
import { useTimelineMouseEvents } from "../input/useProjectMouseEvents";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { START_PADDING_PX } from "../lib/viewport/ProjectViewport";
import { cn } from "../utils/cn";
import { clamp } from "../utils/math";
import { nullthrows } from "../utils/nullthrows";
import { Axis } from "./Axis";
import { getTrackAcceptableDataTransferResources } from "./dragdrop/getTrackAcceptableDataTransferResources";
import { handleDropOntoTimelineWhitespace } from "./dragdrop/resourceDrop";
import { pressedState } from "./pressedState";
import { TimelineCursor, TimelineLine } from "./TimelineCursor";
import { TrackS } from "./TrackS";
import { useEventListener } from "./useEventListener";

function useViewportScrollEvents(project: AudioProject, projectDivRef: React.RefObject<HTMLDivElement | null>) {
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

export function ProjectView({ project, renderer }: { project: AudioProject; renderer: AudioRenderer }) {
  const projectDivRef = useRef<HTMLDivElement | null>(null);
  const dspExpandedTracks = useContainer(project.dspExpandedTracks);
  const [draggingOver, setDraggingOver] = useState<boolean>(false);
  const [audioStorage] = usePrimitive(appEnvironment.audioStorage);
  const [viewportStartPx] = usePrimitive(project.viewport.scrollLeftPx);
  const [projectDivWidth] = usePrimitive(project.viewport.projectDivWidth);
  const tracks = useContainer(project.allTracks);
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const player = renderer.analizedPlayer;
  const [scale] = usePrimitive(project.viewport.pxPerSecond);
  const [loopPlayback] = usePrimitive(project.loopOnPlayback);

  // initial
  useLayoutEffect(() => {
    const pbcursor = playbackPosDiv.current;
    if (pbcursor) {
      const px = project.viewport.secsToPx(player.playbackTime, START_PADDING_PX);
      pbcursor.style.left = String(px) + "px";
    }
  }, [player, project.viewport, scale]);

  // on frame
  useEffect(() => {
    return player.addEventListener("frame", function updateProjectViewCursor(playbackTime) {
      const pbcursor = playbackPosDiv.current;
      if (pbcursor) {
        const px = project.viewport.secsToPx(playbackTime, START_PADDING_PX);
        pbcursor.style.left = String(px) + "px";
      }
    });
  }, [player, project.viewport]);

  useLayoutEffect(() => {
    const width = projectDivRef.current?.getBoundingClientRect().width;
    if (width) {
      project.viewport.projectDivWidth.set(width);
    }
  }, [project.viewport.projectDivWidth]);

  useViewportScrollEvents(project, projectDivRef);
  useLayoutEffect(() => {
    if (!projectDivRef) {
      return;
    }
    projectDivRef.current?.scrollTo({ left: viewportStartPx, behavior: "instant" });
  }, [viewportStartPx]);

  useTimelineMouseEvents(project, projectDivRef);

  useResizeObserver<HTMLDivElement>(
    projectDivRef,
    useCallback(
      (entry) => {
        project.viewport.projectDivWidth.set(entry.contentRect.width);
      },
      [project.viewport.projectDivWidth],
    ),
  );

  const onDrop = useCallback(
    async (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      console.log(ev);

      const resources = await getTrackAcceptableDataTransferResources(
        ev.dataTransfer,
        nullthrows(audioStorage, "error: audio storage not available"),
      );

      await handleDropOntoTimelineWhitespace(resources, project);

      // const url = await getDroppedAudioURL(audioStorage, ev.dataTransfer);

      // if (url && url.length > 0) {
      //   console.log("dropped", url, "to timeline");
      //   // history.record(() => {});
      //   const clip = await AudioClip.fromURL(url);
      //   const track = AudioTrack.fromClip(project, clip);
      //   AudioProject.addAudioTrack(project, undefined, track, "bottom");
      // }
      setDraggingOver(false);
      pressedState.set(null);
    },
    [audioStorage, project],
  );

  return (
    <div
      id="projectDiv"
      className={cn("relative bg-timeline-bg overflow-x-hidden")}
      ref={projectDivRef}
      onDrop={onDrop}
      // For some reason, need to .preventDefault() so onDrop gets called
      onDragOver={function allowDrop(ev) {
        // For some reason, need to .preventDefault() so onDrop gets called
        ev.preventDefault();

        const newVal = ev.target instanceof HTMLDivElement && ev.target === projectDivRef.current;
        if (newVal != draggingOver) {
          setDraggingOver(newVal);
        }
      }}
      onDragLeave={() => {
        setDraggingOver(false);
      }}
    >
      {/* move the axis along with the scroll */}
      <Axis
        viewportStartPx={viewportStartPx}
        className="absolute w-full h-full"
        project={project}
        style={{ left: viewportStartPx }}
      ></Axis>
      {/* <div id="bgs" style={{ position: "absolute", width: "100%", left: viewportStartPx, background: "green" }}>
          {tracks.map(function (track, i) {
            return (
              <div
                key={i}
                style={{
                  width: "200px",
                  height: track.height.get(),
                  position: "sticky",
                  left: 0,
                  background: "red",
                }}
              />
            );
          })}
        </div> */}
      {tracks.map((track, i) => {
        const isDspExpanded = dspExpandedTracks.has(track);
        return (
          <TrackS
            key={i}
            track={track}
            project={project}
            isDspExpanded={isDspExpanded}
            renderer={renderer}
            style={{ width: viewportStartPx + projectDivWidth }}
          />
        );
      })}
      {draggingOver && (
        <div className="relative pointer-events-none" style={{ padding: "16px" }}>
          Create a new track from audio
        </div>
      )}

      {/* Loop Markers */}
      {loopPlayback && <TimelineLine project={project} pos={project.loopStart} color={"rgb(255,165,0)"} />}
      {loopPlayback && <TimelineLine project={project} pos={project.loopEnd} color={"rgb(255,165,0)"} />}

      {/* Selection Cursor  */}
      <TimelineCursor project={project} />

      {/* Playback Cursor */}
      <div
        ref={playbackPosDiv}
        className={cn(
          "name-playback-pos-div",
          "bg-cursor-playback w-px h-full absolute left-0 top-0 select-none pointer-events-none",
        )}
      />
    </div>
  );
}
