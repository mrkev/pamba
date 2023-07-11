import React, { useCallback, useEffect, useRef, useState } from "react";
import { TRACK_SEPARATOR_HEIGHT } from "../constants";
import AudioClip from "../lib/AudioClip";
import { AudioProject } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { ignorePromise } from "../utils/ignorePromise";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { Clip } from "./Clip";
import { EffectRack } from "./EffectRack";
import { usePambaFirebaseStoreRef } from "../firebase/useFirebase";
import { AudioStorage } from "../lib/audioStorage";
import { useEventListener } from "./useEventListener";

export function Track({
  track,
  project,
  isDspExpanded,
  renderer,
}: {
  track: AudioTrack;
  project: AudioProject;
  renderer: AudioRenderer;
  isDspExpanded: boolean;
}): React.ReactElement {
  const [pressed, setPressed] = useLinkedState(pressedState);
  const [selected] = useLinkedState(project.selected);
  const [clips] = useLinkedArray(track.clips);
  const [height] = useLinkedState(track.height);
  const [activeTrack] = useLinkedState(project.activeTrack);
  const trackRef = useRef<HTMLDivElement>(null);
  const [, setStateCounter] = useState(0);
  const rerender = useCallback(function () {
    setStateCounter((x) => x + 1);
  }, []);

  const firebaseStoreRef = usePambaFirebaseStoreRef();

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
      // We can drop audio files from outside the app
      let url: string | null = null;

      for (let i = 0; i < ev.dataTransfer.files.length; i++) {
        const file = ev.dataTransfer.files[i];
        console.log("TODO: VERIFY FILE TYPE. Parallel uploads", file);
        if (firebaseStoreRef == null) {
          continue;
        }
        const result = await AudioStorage.uploadAudioFile(file, firebaseStoreRef, project);
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
    [firebaseStoreRef, loadClipIntoTrack, project, track]
  );

  useEffect(() => {
    const trackDiv = trackRef.current;
    if (!trackDiv) {
      return;
    }

    function onMouseDown() {
      // TODO
      console.log("TRACK MOUSE DOWN, TODO: TRACK BACKGROUND");
      // const div = e.currentTarget;
      // if (!(div instanceof HTMLDivElement)) return;
      // const position = {
      //   x: e.clientX + div.scrollLeft - div.getBoundingClientRect().x,
      //   y: e.clientY + div.scrollTop - div.getBoundingClientRect().y,
      // };
      // const asSecs = pxToSecs(position.x);
      // // player.setCursorPos(asSecs);
      // project.cursorPos.set(asSecs);
      // project.selectionWidth.set(null);
      // pressedState.set({
      //   status: "selecting_global_time",
      //   clientX: e.clientX,
      //   clientY: e.clientY,
      //   startTime: asSecs,
      // });
    }

    function onMouseMove() {}
    function onMouseUp() {}

    trackDiv.addEventListener("mousedown", onMouseDown);
    trackDiv.addEventListener("mousemove", onMouseMove);
    trackDiv.addEventListener("mouseup", onMouseUp);
    return () => {
      trackDiv.removeEventListener("mousedown", onMouseDown);
      trackDiv.removeEventListener("mousemove", onMouseMove);
      trackDiv.removeEventListener("mouseup", onMouseUp);
    };
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
        }}
      >
        {clips.map((clip, i) => {
          if (pressed && pressed.status === "moving_clip" && pressed.track !== track && pressed.clip === clip) {
            return null;
          }

          const isSelected = selected !== null && selected.status === "clips" && selected.test.has(clip);

          return (
            <Clip key={i} clip={clip} rerender={rerender} isSelected={isSelected} track={track} project={project} />
          );
        })}
        {/* RENDER CLIP BEING MOVED */}
        {pressed && pressed.status === "moving_clip" && pressed.track === track && (
          <Clip clip={pressed.clip} rerender={rerender} isSelected={true} project={project} track={null} />
        )}
        {/* <div
          style={{
            width: "200px",
            height: "30px",
            position: "fixed",
            background: "red",
          }}
        /> */}
      </div>

      {/* EFFECT RACK */}
      {isDspExpanded && <EffectRack track={track} project={project} renderer={renderer} />}

      {/* Bottom border */}
      <div
        style={{
          height: TRACK_SEPARATOR_HEIGHT,
          width: "100%",
          background: "#BABABA",
          // to keep the selection div from showing above this effect track
          // So it "sticks" when we scroll the timeline
          position: "sticky",
          left: "0",
          // pointerEvents: "none",
          cursor: "ns-resize",
        }}
        onMouseDown={(e) => {
          setPressed({
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
