import React, { useCallback, useEffect, useRef, useState } from "react";
import { TRACK_SEPARATOR_HEIGHT } from "../constants";
import AudioClip from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { ignorePromise } from "../utils/ignorePromise";
import { Clip } from "./Clip";
import { EffectRack } from "./EffectRack";
import { useEventListener } from "./useEventListener";
import { createUseStyles } from "react-jss";
import { useLinkedSet } from "../lib/state/LinkedSet";

export function Track({
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
  const [pressed] = useLinkedState(pressedState);
  const [selected] = useLinkedState(project.selected);
  const [clips] = useLinkedArray(track.clips);
  const [height] = useLinkedState(track.height);
  const [activeTrack] = useLinkedState(project.activeTrack);
  const [audioStorage] = useLinkedState(project.audioStorage);
  const trackRef = useRef<HTMLDivElement>(null);
  const [, setStateCounter] = useState(0);
  const rerender = useCallback(function () {
    setStateCounter((x) => x + 1);
  }, []);

  const loadClipIntoTrack = useCallback(async (url: string, track: AudioTrack, name?: string): Promise<void> => {
    try {
      // load clip
      const clip = await AudioClip.fromURL(url, name);
      track.pushClip(clip);
    } catch (e) {
      console.trace(e);
      return;
    }
  }, []);

  const onDrop = useCallback(
    async (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      console.log(ev.dataTransfer);
      if (audioStorage == null) {
        return;
      }
      // We can drop audio files from outside the app
      let url: string | null = null;

      for (let i = 0; i < ev.dataTransfer.files.length; i++) {
        const file = ev.dataTransfer.files[i];
        console.log("TODO: VERIFY FILE TYPE. Parallel uploads", file);

        const result = await audioStorage.uploadAudioFile(file);
        if (result instanceof Error) {
          throw result;
        }
        url = result;
      }

      // We can drop urls to audio from other parts of the UI
      if (url == null) {
        url = ev.dataTransfer.getData("text");
      }

      if (url.length > 0) {
        ignorePromise(loadClipIntoTrack(url, track));
      }
    },
    [audioStorage, loadClipIntoTrack, track]
  );

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
        onDrop={onDrop}
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
            <Clip key={i} clip={clip} rerender={rerender} isSelected={isSelected} track={track} project={project} />
          );
        })}

        {/* RENDER SELECTION */}
        <CursorSelection track={track} project={project} />
        {selected && selected.status === "track_time" && selected.test.has(track) && <div>FOOOOOOOOOOO</div>}
        {/* RENDER CLIP BEING MOVED */}
        {pressed && pressed.status === "moving_clip" && pressed.track === track && (
          <Clip clip={pressed.clip} rerender={rerender} isSelected={true} project={project} track={null} />
        )}
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

function CursorSelection({ project, track }: { project: AudioProject; track: AudioTrack }) {
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const [cursorTracks] = useLinkedSet(project.cursorTracks);

  if (!cursorTracks.has(track)) {
    return null;
  }

  return (
    <div
      style={{
        backdropFilter: "invert(100%)",
        left:
          selectionWidth == null || selectionWidth >= 0
            ? project.viewport.secsToPx(cursorPos)
            : project.viewport.secsToPx(cursorPos + selectionWidth),
        width: selectionWidth == null || selectionWidth === 0 ? 1 : project.viewport.secsToPx(Math.abs(selectionWidth)),
        position: "absolute",
        height: "100%",
      }}
    ></div>
  );
}
