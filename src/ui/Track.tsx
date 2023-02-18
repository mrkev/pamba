import React, { useCallback, useState } from "react";
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
import { AudioStorage } from "../lib/AudioStorage";

let evaaa: any;
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
  const [tool] = useLinkedState(project.pointerTool);
  const [clips] = useLinkedArray(track.clips);
  const [height] = useLinkedState(track.trackHeight);
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

  return (
    <>
      <div
        onDrop={onDrop}
        onDragOver={function allowDrop(ev) {
          console.log(evaaa === ev);
          evaaa = ev.dataTransfer.files[0];

          ev.preventDefault();
        }}
        onMouseEnter={function (_e) {
          // console.log("MOUSE ENTER");
          if (pressed && pressed.status === "moving_clip") {
            setPressed((prev) => Object.assign({}, prev, { track }));
          }
        }}
        onMouseLeave={() => {
          // console.log("LEAVE");
        }}
        onMouseUp={() => {}}
        style={{
          position: "relative",
          height: height - TRACK_SEPARATOR_HEIGHT,
          // pointerEvents: "none",
        }}
      >
        {clips.map((clip, i) => {
          if (pressed && pressed.status === "moving_clip" && pressed.track !== track && pressed.clip === clip) {
            return null;
          }

          const isSelected = selected !== null && selected.status === "clips" && selected.test.has(clip);

          return (
            <Clip
              key={i}
              clip={clip}
              tool={tool}
              rerender={rerender}
              isSelected={isSelected}
              track={track}
              project={project}
            />
          );
        })}
        {/* RENDER CLIP BEING MOVED */}
        {pressed && pressed.status === "moving_clip" && pressed.track === track && (
          <Clip clip={pressed.clip} tool={tool} rerender={rerender} isSelected={true} project={project} track={null} />
        )}
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
