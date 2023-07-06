import { StorageReference, getDownloadURL } from "firebase/storage";
import React, { useCallback, useEffect, useState } from "react";
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

function useAudioLibrary(project: AudioProject, firebaseStoreRef: StorageReference | null, filter: string): string[] {
  const audioFiles = useListProjectAudioFiles(project, firebaseStoreRef ?? undefined);
  const [audioLibrary, setAudioLibrary] = useState([
    "drums.mp3",
    "clav.mp3",
    "bassguitar.mp3",
    "horns.mp3",
    "leadguitar.mp3",
  ]);

  useEffect(() => {
    if (audioFiles.status !== "ready" || audioFiles.value == null) {
      return;
    }
    ignorePromise(
      (async () => {
        for (const ref of audioFiles.value) {
          getDownloadURL(ref)
            .then((url) => {
              setAudioLibrary((prev) => prev.concat(url));
            })
            .catch(console.error);
        }
      })()
    );
  }, [audioFiles.status, audioFiles]);

  return audioLibrary.filter((url) => {
    return url.includes(filter);
  });
}

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
  const [libraryFilter, setLibraryFilter] = useState("");
  const audioLibrary = useAudioLibrary(project, firebaseStoreRef, libraryFilter);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 0px 4px 4px" }}>
      <input
        type="search"
        placeholder="Search..."
        value={libraryFilter}
        onChange={(e) => {
          setLibraryFilter(e.target.value);
        }}
      />
      <div className={classes.list}>
        {audioLibrary.map(function (url, i) {
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
              {url}
            </div>
          );
        })}
      </div>
      <hr style={{ width: "100%" }} />
      {/* TODO: library won't be updated when new audio gets uploaded, unless it's constantly executed when I think it might be */}
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
  listItemDisabled: {
    color: "gray",
  },
});
