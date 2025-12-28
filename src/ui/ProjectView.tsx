import useResizeObserver from "@react-hook/resize-observer";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useContainer, usePrimitive } from "structured-state";
import { MAX_TIMELINE_SCALE, MIN_TIMELINE_SCALE } from "../constants";
import { useTimelineMouseEvents } from "../input/useProjectMouseEvents";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
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

export function ProjectView({ project, renderer }: { project: AudioProject; renderer: AudioRenderer }) {
  const projectDivRef = useRef<HTMLDivElement | null>(null);
  const dspExpandedTracks = useContainer(project.dspExpandedTracks);
  const [draggingOver, setDraggingOver] = useState<boolean>(false);
  const [audioStorage] = usePrimitive(appEnvironment.audioStorage);
  const [viewportStartPx] = usePrimitive(project.viewport.scrollLeftPx);
  const tracks = useContainer(project.allTracks);
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const player = renderer.analizedPlayer;
  const [scale] = usePrimitive(project.viewport.pxPerSecond);
  const [loopPlayback] = usePrimitive(project.loopOnPlayback);

  useLayoutEffect(() => {
    const pbdiv = playbackPosDiv.current;
    if (pbdiv) {
      pbdiv.style.left = String(project.viewport.secsToPx(player.playbackTime)) + "px";
    }
  }, [player, project.viewport, scale]);

  useLayoutEffect(() => {
    const width = projectDivRef.current?.getBoundingClientRect().width;
    if (width) {
      project.viewport.projectDivWidth.set(width);
    }
  }, [project.viewport.projectDivWidth]);

  useLayoutEffect(() => {
    if (!projectDivRef) {
      return;
    }
    projectDivRef.current?.scrollTo({ left: viewportStartPx, behavior: "instant" });
  }, [viewportStartPx]);

  useEffect(() => {
    return player.addEventListener("frame", function updateProjectViewCursor(playbackTime) {
      const pbdiv = playbackPosDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(project.viewport.secsToPx(playbackTime)) + "px";
      }
    });
  }, [player, project.viewport]);

  // useEventListener(
  //   "scroll",
  //   projectDivRef,
  //   useCallback((e) => console.log(e), [
  // TODO: scrolling with scrollbar
  //   ]),
  // );

  useEventListener(
    "wheel",
    projectDivRef,
    useCallback(
      (e: WheelEvent) => {
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
      [project.viewport],
    ),
    { capture: false },
  );

  useTimelineMouseEvents(project, projectDivRef);

  useResizeObserver<HTMLDivElement>(
    projectDivRef,
    useCallback(
      (entry) => {
        project.viewport.projectDivWidth.set(entry.contentRect.width ?? 0);
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
      className={cn("relative bg-timeline-bg overflow-x-scroll overflow-y-hidden")}
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
      <Axis project={project}></Axis>
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
            style={{ width: viewportStartPx + (projectDivRef.current?.clientWidth ?? 0) }}
          />
        );
      })}
      {draggingOver && (
        <div className="relative pointer-events-none" style={{ padding: "16px" }}>
          Create a new track from audio
        </div>
      )}
      {/*  */}
      <TimelineCursor project={project} />
      <div
        ref={playbackPosDiv}
        className={cn(
          "name-playback-pos-div",
          "bg-cursor-playback w-px h-full absolute left-0 top-0 select-none pointer-events-none",
        )}
      ></div>

      {loopPlayback && <TimelineLine project={project} pos={project.loopStart} color={"rgb(255,165,0)"} />}
      {loopPlayback && <TimelineLine project={project} pos={project.loopEnd} color={"rgb(255,165,0)"} adjust={-1} />}
    </div>
  );
}
