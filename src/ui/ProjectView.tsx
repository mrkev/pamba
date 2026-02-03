import useResizeObserver from "@react-hook/resize-observer";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { useTimelineMouseEvents } from "../input/useProjectMouseEvents";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { START_PADDING_PX } from "../lib/viewport/ProjectViewport";
import { cn } from "../utils/cn";
import { nullthrows } from "../utils/nullthrows";
import { Axis } from "./Axis";
import { getTrackAcceptableDataTransferResources } from "./dragdrop/getTrackAcceptableDataTransferResources";
import { handleDropOntoTimelineWhitespace } from "./dragdrop/resourceDrop";
import { pressedState } from "./pressedState";
import { TimelineCursor, TimelineLine } from "./TimelineCursor";
import { TrackS } from "./TrackS";
import { useViewportScrollEvents } from "./useViewportScrollEvents";

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

  // initial cursor pos
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
    if (!projectDivRef) {
      return;
    }
    projectDivRef.current?.scrollTo({ left: viewportStartPx, behavior: "instant" });
  }, [viewportStartPx]);

  useResizeObserver<HTMLDivElement>(
    projectDivRef,
    useCallback(
      (entry) => {
        project.viewport.projectDivWidth.set(entry.contentRect.width);
      },
      [project.viewport.projectDivWidth],
    ),
  );

  useViewportScrollEvents(project, projectDivRef);

  useTimelineMouseEvents(project, projectDivRef);

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
