import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useContainer } from "structured-state";
import useResizeObserver from "use-resize-observer";
import { useTimelineMouseEvents } from "../input/useProjectMouseEvents";
import { AudioClip } from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { useDerivedState } from "../lib/state/DerivedState";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiTrack } from "../midi/MidiTrack";
import { exhaustive } from "../utils/exhaustive";
import nullthrows from "../utils/nullthrows";
import { Axis } from "./Axis";
import { TimelineCursor } from "./TimelineCursor";
import { TrackA, getDroppedAudioURL } from "./TrackA";
import { TrackM } from "./TrackM";
import { useEventListener } from "./useEventListener";
import { useStyles } from "./TimelineView";

export function ProjectView({ project, renderer }: { project: AudioProject; renderer: AudioRenderer }) {
  const projectDivRef = useRef<HTMLDivElement | null>(null);
  const [dspExpandedTracks] = useLinkedSet(project.dspExpandedTracks);
  const [draggingOver, setDraggingOver] = useState<boolean>(false);
  const [audioStorage] = useLinkedState(project.audioStorage);
  const [viewportStartPx] = useLinkedState(project.viewportStartPx);
  const tracks = useContainer(project.allTracks);
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const secsToPx = useDerivedState(project.secsToPx);
  const player = renderer.analizedPlayer;

  useEffect(() => {
    const pbdiv = playbackPosDiv.current;
    if (pbdiv) {
      pbdiv.style.left = String(secsToPx(player.playbackTime)) + "px";
    }
  }, [player, project.viewport, secsToPx]);

  useEffect(() => {
    player.onFrame = function (playbackTime) {
      const pbdiv = playbackPosDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(secsToPx(playbackTime)) + "px";
      }
    };
  }, [player, project.viewport, secsToPx]);

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
          // console.log("THIS");
          const sDelta = Math.exp(-e.deltaY / 100);
          const expectedNewScale = project.scaleFactor.get() * sDelta;
          const mousePosX = project.viewportStartPx.get() + mouseX;
          const mousePosS = project.viewport.timeForPx(mousePosX);

          console.log(project.viewportStartPx.get(), mousePosS);
          project.viewport.setScale(expectedNewScale, mousePosS);
          // // min scale is 0.64, max is 1000
          // const newScale = clamp(0.64, expectedNewScale, 1000);
          // project.scaleFactor.set(newScale);
          // const realSDelta = expectedNewScale / project.scaleFactor.get();
          // const widthUpToMouse = mouseX + viewportStartPx;
          // const deltaX = widthUpToMouse - widthUpToMouse * realSDelta;
          // const newStart = viewportStartPx - deltaX;
          // project.viewportStartPx.set(newStart);
          e.preventDefault();
          e.stopPropagation();

          // translate so mouse is at zero
          // zoom in
          // translate so mouse is at right position again
        }

        // pan
        else {
          const start = Math.max(project.viewportStartPx.get() + e.deltaX, 0);
          project.viewportStartPx.set(start);
        }
      },
      [project.scaleFactor, project.viewport, project.viewportStartPx],
    ),
    { capture: false },
  );

  // useEventListener(
  //   "scroll",
  //   projectDivRef,
  //   useCallback(
  //     (e: Event) => {
  //       console.log("Scroollll");
  //       project.viewportStartPx.set((e.target as any).scrollLeft);
  //       e.preventDefault();
  //       e.stopPropagation();
  //     },
  //     [project.viewportStartPx],
  //   ),
  // );

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
    if (!projectDivRef) {
      return;
    }

    projectDivRef.current?.scrollTo({ left: viewportStartPx });
  }, [viewportStartPx]);

  const onDrop = useCallback(
    async (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      const url = await getDroppedAudioURL(audioStorage, ev.dataTransfer);

      if (url && url.length > 0) {
        console.log("dropped", url, "to timeline");
        const clip = await AudioClip.fromURL(url);

        const track = AudioTrack.fromClip(clip);
        AudioProject.addAudioTrack(project, undefined, track, "bottom");
      }
      setDraggingOver(false);
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
        const newVal = ev.target instanceof HTMLDivElement && ev.target === projectDivRef.current;
        if (newVal != draggingOver) {
          setDraggingOver(newVal);
        }
        ev.preventDefault();
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
        // TODO: Singel track renderer??
        if (track instanceof AudioTrack) {
          return (
            <TrackA
              key={i}
              track={track}
              project={project}
              isDspExpanded={isDspExpanded}
              renderer={renderer}
              style={{ width: viewportStartPx + (projectDivRef.current?.clientWidth ?? 0) }}
            />
          );
        }
        if (track instanceof MidiTrack) {
          return (
            <TrackM
              key={i}
              track={track}
              project={project}
              renderer={renderer}
              isDspExpanded={isDspExpanded}
              style={{ width: viewportStartPx + (projectDivRef.current?.clientWidth ?? 0) }}
            ></TrackM>
          );
        }
        exhaustive(track);
      })}
      {draggingOver && <div style={{ padding: "16px", pointerEvents: "none" }}>Create a new track from clip</div>}
      <TimelineCursor project={project} />
      <div ref={playbackPosDiv} className={classes.playbackPosDiv}></div>
    </div>
  );
}
