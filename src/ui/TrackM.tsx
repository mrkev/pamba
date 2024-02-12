import React, { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { TRACK_SEPARATOR_HEIGHT } from "../constants";
import { useTrackMouseEvents } from "../input/useTrackMouseEvents";
import { AudioClip } from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../pressedState";
import { ClipInvalid } from "./ClipInvalid";
import { ClipM } from "./ClipM";
import { CursorSelection } from "./CursorSelection";
import { EffectRack } from "./EffectRack";
import { useEventListener } from "./useEventListener";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { createEmptyMidiClipInTrack } from "../midi/MidiClip";
import { history, useContainer, usePrimitive } from "structured-state";

function preventDefault(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
}

export function TrackM({
  track,
  project,
  isDspExpanded,
  renderer,
  style,
}: {
  track: MidiTrack;
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
  const [lockedTracks] = useLinkedSet(project.lockedTracks);
  const trackRef = useRef<HTMLDivElement>(null);
  const [, setStateCounter] = useState(0);
  const rerender = useCallback(function () {
    setStateCounter((x) => x + 1);
  }, []);

  const isLocked = lockedTracks.has(track);

  useTrackMouseEvents(trackRef, project, track);

  useEventListener(
    "mouseenter",
    trackRef,
    useCallback(
      function (_e) {
        const pressed = pressedState.get();
        if (pressed && pressed.status === "moving_clip") {
          pressedState.setDyn((prev) => Object.assign({}, prev, { track }));
        }
      },
      [track],
    ),
  );

  return (
    <>
      <div
        ref={trackRef}
        onDragOver={preventDefault}
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
            <ClipM key={i} clip={clip} rerender={rerender} isSelected={isSelected} track={track} project={project} />
          );
        })}

        {/* RENDER SELECTION */}
        <CursorSelection track={track} project={project} />
        {selected?.status === "track_time" && (
          <button
            title="Create clip"
            onMouseDownCapture={(e) => {
              e.stopPropagation();
              history.record(() => {
                createEmptyMidiClipInTrack(project, track, selected.startS, selected.endS);
              });
            }}
            style={{
              position: "absolute",
              left: project.viewport.secsToPx(selected.endS),
            }}
          >
            +
          </button>
        )}
        {selected && selected.status === "track_time" && selected.test.has(track) && <div>FOOOOOOOOOOO</div>}
        {/* RENDER CLIP BEING MOVED */}
        {pressed &&
          pressed.status === "moving_clip" &&
          pressed.track === track &&
          (pressed.clip instanceof AudioClip ? (
            <ClipInvalid clip={pressed.clip} project={project} />
          ) : (
            <ClipM clip={pressed.clip} rerender={rerender} track={track} project={project} isSelected={true} />
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
});
