import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import useResizeObserver from "use-resize-observer";
import { MAX_TIMELINE_SCALE, MIN_TIMELINE_SCALE } from "../constants";
import { useTimelineMouseEvents } from "../input/useProjectMouseEvents";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { AudioStorage } from "../lib/project/AudioStorage";
import { pressedState } from "../pressedState";
import { clamp } from "../utils/math";
import { nullthrows } from "../utils/nullthrows";
import { Axis } from "./Axis";
import { getTrackAcceptableDataTransferResources } from "./dragdrop/getTrackAcceptableDataTransferResources";
import { handleDropOntoTimelineWhitespace } from "./dragdrop/resourceDrop";
import { TimelineCursor } from "./TimelineCursor";
import { TrackS } from "./TrackS";
import { useEventListener } from "./useEventListener";

export async function getDroppedAudioURL(audioStorage: AudioStorage | null, dataTransfer: DataTransfer) {
  if (audioStorage == null) {
    return null;
  }

  console.log(dataTransfer.types);

  // We can drop audio files from outside the app
  let url: string | null = null;

  for (let i = 0; i < dataTransfer.files.length; i++) {
    console.log(dataTransfer.types, dataTransfer.items[0]);
    const file = dataTransfer.files[i];
    console.log("TODO: VERIFY FILE TYPE. Parallel uploads", file);

    const result = await audioStorage.uploadToLibrary(file);
    if (result instanceof Error) {
      throw result;
    }
    url = result.url().toString();
  }

  // We can drop urls to audio from other parts of the UI
  if (url == null) {
    url = dataTransfer.getData("text");
  }

  return url;
}

export function ProjectView({ project, renderer }: { project: AudioProject; renderer: AudioRenderer }) {
  const projectDivRef = useRef<HTMLDivElement | null>(null);
  const dspExpandedTracks = useContainer(project.dspExpandedTracks);
  const [draggingOver, setDraggingOver] = useState<boolean>(false);
  const [audioStorage] = usePrimitive(project.audioStorage);
  const [viewportStartPx] = usePrimitive(project.viewport.viewportStartPx);
  const tracks = useContainer(project.allTracks);
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const player = renderer.analizedPlayer;
  const [scale] = usePrimitive(project.viewport.scaleFactor);

  useLayoutEffect(() => {
    const pbdiv = playbackPosDiv.current;
    if (pbdiv) {
      pbdiv.style.left = String(project.viewport.secsToPx(player.playbackTime)) + "px";
    }
  }, [player, project.viewport, scale]);

  useEffect(() => {
    player.onFrame = function (playbackTime) {
      const pbdiv = playbackPosDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(project.viewport.secsToPx(playbackTime)) + "px";
      }
    };
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
            project.viewport.scaleFactor.get() * sDelta,
            MAX_TIMELINE_SCALE,
          );
          project.viewport.setScale(expectedNewScale, mouseX);
          e.preventDefault();
          e.stopPropagation();
        }

        // pan
        else {
          const start = Math.max(project.viewport.viewportStartPx.get() + e.deltaX, 0);
          flushSync(() => {
            project.viewport.viewportStartPx.set(start);
          });
        }
      },
      [project.viewport],
    ),
    { capture: false },
  );

  useTimelineMouseEvents(project, projectDivRef);

  useResizeObserver<HTMLDivElement>({
    ref: projectDivRef,
    onResize: useCallback(
      ({ width }: { width?: number; height?: number }) => {
        project.viewport.projectDivWidth.set(width ?? 0);
      },
      [project.viewport.projectDivWidth],
    ),
  });

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

  const onDrop = useCallback(
    async (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();

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

  const classes = useStyles();
  return (
    <div
      id="projectDiv"
      className={classes.projectDiv}
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
        <div style={{ padding: "16px", pointerEvents: "none", position: "relative" }}>
          Create a new track from audio
        </div>
      )}
      <TimelineCursor project={project} />
      <div ref={playbackPosDiv} className={classes.playbackPosDiv}></div>
    </div>
  );
}

export const useStyles = createUseStyles({
  projectDiv: {
    position: "relative",
    background: "var(--timeline-bg)",
    overflowX: "scroll",
    overflowY: "hidden",
    borderTop: "1px solid var(--axis-timeline-separator)",
  },
  playbackPosDiv: {
    background: "var(--cursor-playback)",
    width: "1px",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    userSelect: "none",
    pointerEvents: "none",
  },
});
