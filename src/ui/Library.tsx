import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createUseStyles } from "react-jss";
import { LIBRARY_SEARCH_INPUT_ID } from "../constants";
import { AudioPackage } from "../data/AudioPackage";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { ProjectTrack } from "../lib/ProjectTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedArrayMaybe } from "../lib/state/LinkedArray";
import { useLinkedMap } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { exhaustive } from "../utils/exhaustive";
import { ignorePromise } from "../utils/ignorePromise";
import { AudioFileUploadDropzone } from "./AudioFileUploadDropzone";
import { doConfirm } from "./ConfirmDialog";
import { UploadAudioButton } from "./UploadAudioButton";
import { ListEntry, UtilityDataList } from "./UtilityList";
import { closeProject } from "./header/ToolHeader";
import { usePrimitive } from "structured-state";

const STATIC_AUDIO_FILES = ["drums.mp3", "clav.mp3", "bassguitar.mp3", "horns.mp3", "leadguitar.mp3"];

function useAudioLibrary(project: AudioProject, filter: string): (string | AudioPackage)[] {
  const [audioStorage] = useLinkedState(project.audioStorage);
  const remoteAudio = useLinkedArrayMaybe(audioStorage?.remoteFiles ?? null);
  const [localAudio] = useLinkedMap(appEnvironment.localFiles._audioLib);
  const audioLibrary = [...STATIC_AUDIO_FILES, ...(remoteAudio ?? []), ...localAudio.values()];

  return audioLibrary.filter((audio) => {
    if (typeof audio === "string") {
      return audio.includes(filter);
    } else {
      return audio.name.includes(filter);
    }
  });
}

export type LibraryItem = { kind: "project"; id: string } | { kind: "audio"; url: string; name: string };

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
  const [isAudioPlaying] = usePrimitive(renderer.isAudioPlaying);
  const [libraryFilter, setLibraryFilter] = useState("");
  const audioLibrary = useAudioLibrary(project, libraryFilter);
  const [localProjects] = useLinkedMap(appEnvironment.localFiles._projects);

  const loadClip = useCallback(
    async function loadClip(url: string, name?: string) {
      try {
        // load clip
        const clip = await AudioClip.fromURL(url, name);

        const activeTrack = project.activeTrack.get();
        if (activeTrack !== null && activeTrack instanceof AudioTrack) {
          ProjectTrack.pushClip(project, activeTrack, clip);
          return;
        }

        const newTrack = AudioTrack.fromClip(project, clip);
        AudioProject.addAudioTrack(project, player, newTrack);
        console.log("loaded");
      } catch (e) {
        console.trace(e);
        return;
      }
    },
    [player, project],
  );

  useEffect(() => {
    ignorePromise(appEnvironment.localFiles.updateProjects());
  }, []);

  const items: ListEntry<LibraryItem>[] = useMemo(() => {
    return [
      ...localProjects.map((p) => {
        return {
          title: p.name,
          icon: <i className="ri-file-music-line" />,
          data: { kind: "project", id: p.id },
          disableDrag: true,
          secondary:
            p.id === project.projectId ? (
              <i style={{ color: "gray" }}>open</i>
            ) : (
              ""
              // <UtilityMenu label={"foobar"} items={{ delete: () => {} }} />
              // <button
              //   style={{ border: "none", padding: "0px 2px", fontSize: "10px", fontWeight: 800, background: "none" }}
              // >
              //   ...
              // </button>
            ),
        } as const;
      }),
      "separator",
      ...audioLibrary.map((audio) => {
        if (typeof audio === "string") {
          const url = audio;
          return {
            title: url,
            icon: <i className="ri-volume-up-fill"></i>,
            data: { kind: "audio", url, name: url },
          } as const;
        } else if (audio instanceof AudioPackage) {
          return {
            title: audio.name,
            icon: <i className="ri-volume-up-fill"></i>,
            data: { kind: "audio", url: audio.url, name: audio.name },
          } as const;
        } else {
          exhaustive(audio);
        }
      }),
    ];
  }, [audioLibrary, localProjects, project.projectId]);

  return (
    <>
      <input
        id={LIBRARY_SEARCH_INPUT_ID}
        type="search"
        placeholder="Search..."
        value={libraryFilter}
        onChange={(e) => {
          setLibraryFilter(e.target.value);
        }}
      />

      <AudioFileUploadDropzone className={classes.list} project={project}>
        {/* Library */}
        <UtilityDataList<LibraryItem>
          // data is url
          filter={libraryFilter}
          draggable={!isAudioPlaying}
          disabled={isAudioPlaying}
          onDragStart={function (item, ev: React.DragEvent<HTMLDivElement>) {
            if (item.data.kind !== "audio") {
              return;
            }

            ev.dataTransfer.setData("text/uri-list", item.data.url);
            ev.dataTransfer.setData("text/plain", item.data.url);
            pressedState.set({
              status: "dragging_library_item",
              libraryItem: item.data,
            });
          }}
          onDragEnd={() => {
            pressedState.set(null);
          }}
          onItemSelect={async (item) => {
            switch (item.data.kind) {
              case "audio":
                ignorePromise(loadClip(item.data.url));
                break;
              case "project": {
                const didClose = await closeProject(project);
                if (!didClose) {
                  return;
                }

                const openedProject = await appEnvironment.localFiles.openProject(item.data.id);
                if (!(openedProject instanceof AudioProject)) {
                  alert(`issue opening project: ${openedProject.status}`);
                  return;
                }
                appEnvironment.loadProject(openedProject);
                break;
              }
              default:
                exhaustive(item.data);
            }
          }}
          onKeydown={async (item, e) => {
            if (e.key !== "Backspace") {
              return;
            }

            const selection = await doConfirm(
              `Are you sure you want to delete "${item.title}"?\nThis cannot be undone.`,
              "yes",
              "no",
            );

            if (selection === "no" || selection === "cancel") {
              return;
            }

            switch (item.data.kind) {
              case "audio":
                // TODO? Warn about files that use this audio?
                alert("not implemented, coming soon");
                break;
              case "project": {
                if (item.data.id === project.projectId) {
                  alert("cant delete current project");
                  // todo: auto-close, create new empty project, etc
                }

                const result = await appEnvironment.localFiles.deleteProject(item.data.id);
                // todo do something with result? necessary?
                break;
              }
              default:
                exhaustive(item.data);
            }
          }}
          items={items}
        />
      </AudioFileUploadDropzone>

      {/* TODO: library won't be updated when new audio gets uploaded, unless it's constantly executed when I think it might be */}
      <UploadAudioButton project={project} loadClip={loadClip} />
      <hr style={{ width: "100%", borderColor: "var(--border-against-bg)", borderStyle: "dotted" }} />

      {/* <UserAuthControl /> */}
    </>
  );
}

const useStyles = createUseStyles({
  list: {
    display: "flex",
    flexDirection: "column",
    // border: "1px solid #999",
    borderRadius: "3px",
    flexGrow: 1,
    fontSize: 12,
  },
});
