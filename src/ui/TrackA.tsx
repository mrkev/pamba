import classNames from "classnames";
import React, { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { history, useContainer, usePrimitive } from "structured-state";
import { TRACK_SEPARATOR_HEIGHT } from "../constants";
import { useTrackMouseEvents } from "../input/useTrackMouseEvents";
import { secs } from "../lib/AbstractClip";
import { AudioClip } from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { ProjectTrack } from "../lib/ProjectTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { AudioStorage } from "../lib/project/AudioStorage";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { ignorePromise } from "../utils/ignorePromise";
import { ClipA } from "./ClipA";
import { ClipInvalid } from "./ClipInvalid";
import { CursorSelection } from "./CursorSelection";
import { EffectRack } from "./EffectRack";

function clientXToTrackX(trackElem: HTMLDivElement | null, clientX: number) {
  if (trackElem == null) {
    return 0;
  }
  return clientX + trackElem.scrollLeft - trackElem.getBoundingClientRect().x;
}

export async function getDroppedAudioURL(audioStorage: AudioStorage | null, dataTransfer: DataTransfer) {
  if (audioStorage == null) {
    return null;
  }

  // We can drop audio files from outside the app
  let url: string | null = null;

  for (let i = 0; i < dataTransfer.files.length; i++) {
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

const loadAudioClipIntoTrack = async (
  project: AudioProject,
  url: string,
  track: AudioTrack,
  startOffsetSec: number,
  name: string,
): Promise<void> => {
  try {
    if (!project.canEditTrack(project, track)) {
      return;
    }
    const clip = await AudioClip.fromURL(url, name);
    history.record(() => {
      // load clip
      clip.timelineStartSec = secs(startOffsetSec);
      ProjectTrack.addClip(project, track, clip);
    });
  } catch (e) {
    console.trace(e);
    return;
  }
};

export function TrackA({
  track,
  project,
  isDspExpanded,
  renderer,
  style,
}: {
  track: AudioTrack;
  project: AudioProject;
  renderer: AudioRenderer;
  isDspExpanded: boolean;
  style?: React.CSSProperties;
}): React.ReactElement {
  const styles = useStyles();
  const [pressed] = usePrimitive(pressedState);
  const [selected] = useLinkedState(project.selected);
  const clips = useContainer(track.clips);
  const [height] = usePrimitive(track.height);
  const [activeTrack] = useLinkedState(project.activeTrack);
  const lockedTracks = useContainer(project.lockedTracks);
  const [audioStorage] = useLinkedState(project.audioStorage);
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingOver, setDraggingOver] = useState<number | null>(null);

  const locked = lockedTracks.has(track);

  // const [, setStateCounter] = useState(0);
  // const rerender = useCallback(function () {
  //   setStateCounter((x) => x + 1);
  // }, []);

  useTrackMouseEvents(trackRef, project, track);

  const onDrop = useCallback(
    async function onDropNewAudio(ev: React.DragEvent<HTMLDivElement>) {
      ev.preventDefault();
      ev.stopPropagation();
      const pressed = pressedState.get();
      // NOTE: dropping from Finder is not handled here. Figure out where that is handled.
      // this just seems to handle things dragged from the library right now anyway.
      if (pressed?.status !== "dragging_library_item") {
        console.warn("dropped something but pressed status was wrong?");
        return;
      }

      if (pressed.libraryItem.kind !== "audio") {
        console.warn("This should never happen");
        return;
      }

      const url = await getDroppedAudioURL(audioStorage, ev.dataTransfer);
      if (url && url.length > 0) {
        const startOffsetSec = project.viewport.pxToSecs(draggingOver ?? 0);
        ignorePromise(loadAudioClipIntoTrack(project, url, track, startOffsetSec, pressed.libraryItem.name));
      }
      setDraggingOver(null);
    },
    [audioStorage, draggingOver, project, track],
  );

  return (
    <>
      <div
        ref={trackRef}
        className={classNames(locked && styles.locked)}
        onDrop={onDrop}
        // For some reason, need to .preventDefault() so onDrop gets called
        onDragOver={function allowDrop(ev) {
          const draggedOffsetPx = clientXToTrackX(trackRef.current, ev.clientX);
          setDraggingOver(draggedOffsetPx);
          ev.preventDefault();
        }}
        onDragLeave={() => {
          setDraggingOver(null);
        }}
        style={{
          position: "relative",
          height: height - TRACK_SEPARATOR_HEIGHT,
          background: activeTrack === track ? "rgba(64,64,64,0.1)" : "none",
          ...style,
        }}
      >
        {/* RENDER CLIPS */}
        {clips.map((clip, i) => {
          if (pressed && pressed.status === "moving_clip" && pressed.track !== track && pressed.clip === clip) {
            return null;
          }
          const isSelected = selected !== null && selected.status === "clips" && selected.test.has(clip);
          return (
            <ClipA editable={!locked} key={i} clip={clip} isSelected={isSelected} track={track} project={project} />
          );
        })}

        {/* RENDER SELECTION */}
        <CursorSelection track={track} project={project} />

        {/* RENDER DRAG DROP MARKER */}
        {pressed && pressed.status === "dragging_library_item" && draggingOver != null && (
          <div
            style={{
              width: 1,
              left: draggingOver,
              backgroundColor: "#114411",
              height: "100%",
              userSelect: "none",
              pointerEvents: "none",
              position: "absolute",
            }}
          ></div>
        )}

        {/* RENDER CLIP BEING MOVED FROM ANOTHER TRACK */}
        {pressed &&
          pressed.status === "moving_clip" &&
          pressed.track === track &&
          (pressed.clip instanceof AudioClip ? (
            <ClipA clip={pressed.clip} isSelected={true} project={project} track={null} />
          ) : (
            <ClipInvalid clip={pressed.clip} project={project} />
          ))}
      </div>

      {/* EFFECT RACK */}
      {isDspExpanded && <EffectRack track={track} project={project} renderer={renderer} />}

      {/* Bottom border */}
      <div
        className={styles.trackSeparator}
        style={{
          height: TRACK_SEPARATOR_HEIGHT,
        }}
        onMouseDown={(e) => {
          pressedState.set({
            status: "resizing_track",
            clientX: e.clientX,
            clientY: e.clientY,
            track,
            originalHeight: height,
          });
          e.stopPropagation();
        }}
      ></div>
    </>
  );
}

const useStyles = createUseStyles({
  trackSeparator: {
    width: "100%",
    background: "var(--track-separator)",
    // to keep the selection div from showing above this effect track
    // So it "sticks" when we scroll the timeline
    position: "sticky",
    left: "0",
    // pointerEvents: "none",
    cursor: "ns-resize",
  },
  locked: {
    filter: "brightness(0.8)",
  },
});
