import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { history, useContainer } from "structured-state";
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
import { nullthrows } from "../utils/nullthrows";
import { Axis } from "./Axis";
import { TimelineCursor } from "./TimelineCursor";
import { TrackA, getDroppedAudioURL } from "./TrackA";
import { TrackM } from "./TrackM";
import { useEventListener } from "./useEventListener";
import { flushSync } from "react-dom";
import { createUseStyles } from "react-jss";

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
          const expectedNewScale = project.scaleFactor.get() * sDelta;
          project.viewport.setScale(expectedNewScale, mouseX);
          e.preventDefault();
          e.stopPropagation();
        }

        // pan
        else {
          const start = Math.max(project.viewportStartPx.get() + e.deltaX, 0);
          flushSync(() => {
            project.viewportStartPx.set(start);
          });
        }
      },
      [project.scaleFactor, project.viewport, project.viewportStartPx],
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
    console.log("HERE", width);
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
      const url = await getDroppedAudioURL(audioStorage, ev.dataTransfer);

      if (url && url.length > 0) {
        console.log("dropped", url, "to timeline");
        // history.record(() => {});
        const clip = await AudioClip.fromURL(url);
        const track = AudioTrack.fromClip(project, clip);
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
  },
  playbackPosDiv: {
    background: "var(--cursor-playback)",
    width: "1px",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
  },
});
