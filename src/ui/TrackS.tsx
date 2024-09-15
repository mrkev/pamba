import classNames from "classnames";
import React, { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { TRACK_SEPARATOR_HEIGHT } from "../constants";
import { useTrackMouseEvents } from "../input/useTrackMouseEvents";
import { AudioClip } from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../pressedState";
import { nullthrows } from "../utils/nullthrows";
import { ClipA } from "./ClipA";
import { ClipInvalid } from "./ClipInvalid";
import { ClipM } from "./ClipM";
import { CursorSelection } from "./CursorSelection";
import { EffectRack } from "./EffectRack";
import { getTrackAcceptableDataTransferResources } from "./dragdrop/getTrackAcceptableDataTransferResources";
import { handleDropOntoAudioTrack } from "./dragdrop/resourceDrop";

function clientXToTrackX(trackElem: HTMLDivElement | null, clientX: number) {
  if (trackElem == null) {
    return 0;
  }
  return clientX + trackElem.scrollLeft - trackElem.getBoundingClientRect().x;
}

/** Standard Track Renderer */
export function TrackS({
  track,
  project,
  isDspExpanded,
  renderer,
  style,
}: {
  track: AudioTrack | MidiTrack;
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

  // TODO: REMOVE RERENDER
  const [, setStateCounter] = useState(0);
  const rerender = useCallback(function () {
    setStateCounter((x) => x + 1);
  }, []);

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

      const transferableResources = await getTrackAcceptableDataTransferResources(
        ev.dataTransfer,
        nullthrows(audioStorage)
      );

      if (track instanceof MidiTrack) {
      } else if (track instanceof AudioTrack) {
        for (const resource of transferableResources) {
          await handleDropOntoAudioTrack(track, resource, draggingOver ?? 0, project);
        }
      } else {
        throw new Error("Unknown track kind");
      }

      setDraggingOver(null);
    },
    [audioStorage, draggingOver, project, track]
  );

  const dragType =
    pressed == null || pressed.status !== "dragging_library_item" || draggingOver != null
      ? null
      : pressed.libraryItem.kind === "audio"
      ? "audio"
      : "effect";

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
          filter: dragType == "effect" ? "brightness(0.7)" : undefined,
          ...style,
        }}
      >
        {/* RENDER CLIPS */}
        {clips.map((clip, i) => {
          if (pressed && pressed.status === "moving_clip" && pressed.track !== track && pressed.clip === clip) {
            return null;
          }
          const isSelected = selected !== null && selected.status === "clips" && selected.test.has(clip);

          if (track instanceof MidiTrack && clip instanceof MidiClip) {
            return (
              <ClipM key={i} clip={clip} rerender={rerender} isSelected={isSelected} track={track} project={project} />
            );
          }

          if (track instanceof AudioTrack && clip instanceof AudioClip) {
            return (
              <ClipA editable={!locked} key={i} clip={clip} isSelected={isSelected} track={track} project={project} />
            );
          }

          console.warn("Invalid clip in track???");
          return null;
        })}

        {/* RENDER SELECTION */}
        <CursorSelection track={track} project={project} />

        {/* RENDER DRAG DROP MARKER */}
        {/* note: only for audio */}
        {pressed &&
          pressed.status === "dragging_library_item" &&
          pressed.libraryItem.kind === "audio" &&
          draggingOver != null && (
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
          (track instanceof AudioTrack && pressed.clip instanceof AudioClip ? (
            <ClipA clip={pressed.clip} isSelected={true} project={project} track={null} />
          ) : track instanceof MidiTrack && pressed.clip instanceof MidiClip ? (
            <ClipM clip={pressed.clip} rerender={rerender} track={track} project={project} isSelected={true} />
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
