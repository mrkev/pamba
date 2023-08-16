import React, { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { TRACK_SEPARATOR_HEIGHT } from "../constants";
import AudioClip from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiTrack } from "../midi/MidiTrack";
import { pressedState } from "../pressedState";
import { ClipA } from "./ClipA";
import { ClipM } from "./ClipM";
import { CursorSelection } from "./CursorSelection";
import { EffectRack } from "./EffectRack";
import { useEventListener } from "./useEventListener";

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
  const [pressed] = useLinkedState(pressedState);
  const [selected] = useLinkedState(project.selected);
  const [clips] = useLinkedArray(track.clips);
  const [height] = useLinkedState(track.height);
  const [activeTrack] = useLinkedState(project.activeTrack);
  const trackRef = useRef<HTMLDivElement>(null);
  const [, setStateCounter] = useState(0);
  const rerender = useCallback(function () {
    setStateCounter((x) => x + 1);
  }, []);

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
      [track]
    )
  );

  useEventListener(
    "mousedown",
    trackRef,
    useCallback(() => {
      project.cursorTracks.clear();
      project.cursorTracks.add(track);
    }, [project.cursorTracks, track])
  );

  return (
    <>
      <div
        ref={trackRef}
        onDragOver={function allowDrop(ev) {
          ev.preventDefault();
        }}
        onMouseDown={(e) => {
          pressedState.set({
            status: "selecting_track_time",
            clientX: e.clientX,
            clientY: e.clientY,
            // TODOOOOOOOOOOOOO
            startTimeFr: 0,
            track,
          });
          e.stopPropagation();
          e.preventDefault();
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
            // TODOOOO: CAN BE CLIPA OR CLIP M
            <ClipM key={i} clip={clip} rerender={rerender} isSelected={isSelected} track={track} project={project} />
          );
        })}

        {/* RENDER SELECTION */}
        <CursorSelection track={track} project={project} />
        {selected && selected.status === "track_time" && selected.test.has(track) && <div>FOOOOOOOOOOO</div>}
        {/* RENDER CLIP BEING MOVED */}
        {pressed &&
          pressed.status === "moving_clip" &&
          pressed.track === track &&
          (pressed.clip instanceof AudioClip ? (
            <ClipA clip={pressed.clip} rerender={rerender} isSelected={true} project={project} track={null} />
          ) : (
            <div>TODO MIDI CLIP</div>
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
    background: "#BABABA",
    // to keep the selection div from showing above this effect track
    // So it "sticks" when we scroll the timeline
    position: "sticky",
    left: "0",
    // pointerEvents: "none",
    cursor: "ns-resize",
  },
});
