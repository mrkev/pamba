import { StorageReference, getDownloadURL } from "firebase/storage";
import React, { useCallback } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import AudioClip from "../lib/AudioClip";
import { AudioProject } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { useListProjectAudioFiles } from "../lib/audioStorage";
import { useLinkedState } from "../lib/state/LinkedState";
import { ignorePromise } from "../utils/ignorePromise";
import { UploadAudioButton } from "./UploadAudioButton";
import { createUseStyles } from "react-jss";
import classNames from "classnames";
import { pressedState } from "../pressedState";

export function Library({
  project,
  renderer,
  player,
  firebaseStoreRef,
}: {
  project: AudioProject;
  renderer: AudioRenderer;
  player: AnalizedPlayer;
  firebaseStoreRef: StorageReference | null;
}) {
  const classes = useStyles();
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);
  const audioFiles = useListProjectAudioFiles(project, firebaseStoreRef ?? undefined);

  const loadClip = useCallback(
    async function loadClip(url: string, name?: string) {
      try {
        console.log("LOAD CLIP");
        // load clip
        const clip = await AudioClip.fromURL(url, name);
        const newTrack = AudioTrack.fromClip(clip);
        AudioProject.addTrack(project, player, newTrack);
        console.log("loaded");
      } catch (e) {
        console.trace(e);
        return;
      }
    },
    [player, project]
  );

  return (
    <div className={classes.list}>
      {["drums.mp3", "clav.mp3", "bassguitar.mp3", "horns.mp3", "leadguitar.mp3"].map(function (url, i) {
        return (
          <div
            tabIndex={0}
            className={classNames(classes.listItem, isAudioPlaying && classes.listItemDisabled)}
            key={i}
            draggable={!isAudioPlaying}
            onDragStart={function (ev: React.DragEvent<HTMLDivElement>) {
              if (isAudioPlaying) {
                return;
              }
              ev.dataTransfer.setData("text/uri-list", url);
              ev.dataTransfer.setData("text/plain", url);
              pressedState.set({
                status: "dragging_new_audio",
                clientX: ev.clientX,
                clientY: ev.clientY,
              });
            }}
            onDragEnd={() => {
              pressedState.set(null);
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (isAudioPlaying) {
                return;
              }

              if (e.target instanceof HTMLDivElement) {
                e.target.focus();
              }
            }}
            onDoubleClick={() => {
              ignorePromise(loadClip(url));
            }}
          >
            load {url}
          </div>
        );
      })}
      <hr style={{ width: "100%" }} />
      {/* TODO: this won't be updated when new audio gets uploaded, unless it's constantly executed when I think it might be */}
      {audioFiles.status === "ready" && audioFiles.value !== null && (
        <>
          {audioFiles.value.map(function (ref, i) {
            return (
              <button
                key={i}
                draggable
                disabled={isAudioPlaying}
                // onDragStart={function (ev: React.DragEvent<HTMLButtonElement>) {
                //   // ev.dataTransfer.setData("text/uri-list", url);
                //   // ev.dataTransfer.setData("text/plain", url);
                // }}
                onClick={async function () {
                  const url = await getDownloadURL(ref);
                  ignorePromise(loadClip(url));
                }}
              >
                {ref.name}
              </button>
            );
          })}
          <hr style={{ width: "100%" }} />
        </>
      )}
      <UploadAudioButton project={project} firebaseStoreRef={firebaseStoreRef ?? null} loadClip={loadClip} />
    </div>
  );
}

const useStyles = createUseStyles({
  list: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #999",
  },
  listItem: {
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    padding: "0px 2px",
    "&:focus": {
      outline: "5px auto -webkit-focus-ring-color",
      background: "white",
    },
  },
  listItemDisabled: {},
});
