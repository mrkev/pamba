import classNames from "classnames";
import React, { useCallback, useState } from "react";
import { createUseStyles } from "react-jss";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import AudioClip from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedArrayMaybe } from "../lib/state/LinkedArray";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { ignorePromise } from "../utils/ignorePromise";
import { AudioFileUploadDropzone } from "./AudioFileUploadDropzone";
import { UploadAudioButton } from "./UploadAudioButton";

const STATIC_AUDIO_FILES = ["drums.mp3", "clav.mp3", "bassguitar.mp3", "horns.mp3", "leadguitar.mp3"];

function useAudioLibrary(project: AudioProject, filter: string): string[] {
  const [audioStorage] = useLinkedState(project.audioStorage);
  const remoteFiles = useLinkedArrayMaybe(audioStorage?.remoteFiles ?? null);
  const audioLibrary = STATIC_AUDIO_FILES.concat(remoteFiles ?? []);

  return audioLibrary.filter((url) => {
    return url.includes(filter);
  });
}

export function Library({
  project,
  renderer,
  player,
}: {
  project: AudioProject;
  renderer: AudioRenderer;
  player: AnalizedPlayer;
}) {
  const classes = useStyles();
  const [isAudioPlaying] = useLinkedState(renderer.isAudioPlaying);
  const [libraryFilter, setLibraryFilter] = useState("");
  const audioLibrary = useAudioLibrary(project, libraryFilter);

  const loadClip = useCallback(
    async function loadClip(url: string, name?: string) {
      try {
        // load clip
        console.log("LOAD CLIP");
        const clip = await AudioClip.fromURL(url, name);

        const activeTrack = project.activeTrack.get();
        if (activeTrack !== null) {
          activeTrack.pushClip(clip);
          return;
        }

        const newTrack = AudioTrack.fromClip(clip);
        AudioProject.addAudioTrack(project, player, newTrack);
        console.log("loaded");
      } catch (e) {
        console.trace(e);
        return;
      }
    },
    [player, project]
  );

  return (
    <>
      <input
        type="search"
        placeholder="Search..."
        value={libraryFilter}
        onChange={(e) => {
          setLibraryFilter(e.target.value);
        }}
      />
      <AudioFileUploadDropzone className={classes.list} project={project}>
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
      </AudioFileUploadDropzone>
      <hr style={{ width: "100%" }} />
      {/* TODO: library won't be updated when new audio gets uploaded, unless it's constantly executed when I think it might be */}
      <UploadAudioButton project={project} loadClip={loadClip} />
    </>
  );
}

const useStyles = createUseStyles({
  list: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #999",
    borderRadius: "3px",
    flexGrow: 1,
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
