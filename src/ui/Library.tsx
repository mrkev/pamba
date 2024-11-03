import React, { useCallback, useMemo, useState } from "react";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { LIBRARY_SEARCH_INPUT_ID } from "../constants";
import { AudioPackage } from "../data/AudioPackage";
import { FAUST_EFFECTS, FaustEffectID } from "../dsp/FAUST_EFFECTS";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { WAMAvailablePlugin, appEnvironment } from "../lib/AppEnvironment";
import { AudioClip } from "../lib/AudioClip";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { ProjectTrack } from "../lib/ProjectTrack";
import { addAvailableWamToTrack } from "../lib/addAvailableWamToTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedMap } from "../lib/state/LinkedMap";
import { pressedState } from "../pressedState";
import { exhaustive } from "../utils/exhaustive";
import { ignorePromise } from "../utils/ignorePromise";
import { nullthrows } from "../utils/nullthrows";
import { doConfirm } from "./ConfirmDialog";
import { UploadAudioButton } from "./UploadAudioButton";
import { ListEntry, UtilityDataList } from "./UtilityList";
import { transferObject } from "./dragdrop/setTransferData";
import { closeProject } from "./header/ToolHeader";

const STATIC_AUDIO_FILES = ["drums.mp3", "clav.mp3", "bassguitar.mp3", "horns.mp3", "leadguitar.mp3"];

function useAudioLibrary(project: AudioProject, filter: string): (string | AudioPackage)[] {
  // const [audioStorage] = usePrimitive(appEnvironment.audioStorage);
  // const remoteAudio = useLinkedArrayMaybe(audioStorage?.remoteFiles ?? null);
  const [localAudio] = useLinkedMap(appEnvironment.localFiles.audioLib.state);
  const audioLibrary = [...STATIC_AUDIO_FILES, ...localAudio.values()];

  return audioLibrary.filter((audio) => {
    if (typeof audio === "string") {
      return audio.includes(filter);
    } else {
      return audio.name.includes(filter);
    }
  });
}

export type LibraryItem =
  | { kind: "project"; id: string }
  | { kind: "audio"; url: string; name: string }
  | { kind: "wam"; plugin: WAMAvailablePlugin }
  | { kind: "fausteffect"; id: FaustEffectID };

function faustEffectLibraryListEntries(): ListEntry<LibraryItem>[] {
  return Object.keys(FAUST_EFFECTS).map((id) => ({
    title: id,
    icon: <i className="ri-pulse-fill"></i>,
    data: { kind: "fausteffect", id: id as FaustEffectID },
  }));
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
  const [isAudioPlaying] = usePrimitive(renderer.isAudioPlaying);
  const [libraryFilter, setLibraryFilter] = useState("");
  const audioLibrary = useAudioLibrary(project, libraryFilter);
  const [localProjects] = useLinkedMap(appEnvironment.localFiles.projectLib.state);
  const wamPlugins = useContainer(appEnvironment.wamPlugins);

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
        AudioProject.addAudioTrack(project, "top", newTrack, player);
        console.log("loaded");
      } catch (e) {
        console.trace(e);
        return;
      }
    },
    [player, project],
  );

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
            data: { kind: "audio", url: audio.url().toString(), name: audio.name },
          } as const;
        } else {
          exhaustive(audio);
        }
      }),
      "separator",
      ...[...wamPlugins.entries()].map(([key, plugin]): ListEntry<LibraryItem> => {
        return {
          title: plugin.descriptor.name.replace(/^WebAudioModule[_ ]/, "").replace(/(?:Module|Plugin)$/, ""),
          icon: plugin.pluginKind === "m-a" ? <i style={{ fontSize: 11 }}>♩</i> : <i className="ri-pulse-fill"></i>,
          data: { kind: "wam", plugin },
        };
      }),
      ...faustEffectLibraryListEntries(),
    ];
  }, [audioLibrary, localProjects, project.projectId, wamPlugins]);

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

      {/* TODO: uncomment. commented out because it prevents scroll in the list */}
      {/* <AudioFileUploadDropzone className={classes.list} project={project}> */}
      {/* Library */}
      <UtilityDataList<LibraryItem>
        // data is url
        filter={libraryFilter}
        draggable={!isAudioPlaying}
        disabled={isAudioPlaying}
        onDragStart={function (item, ev: React.DragEvent<HTMLDivElement>) {
          console.log(item.data);
          ev.dataTransfer.effectAllowed = "copy";

          switch (item.data.kind) {
            case "audio":
              // ev.dataTransfer.setData("text/uri-list", item.data.url);
              // ev.dataTransfer.setData("text/plain", item.data.url);
              // TODO: add files, so they show up when we drag out of the application
              // NOTE: internally if we handle an application/pamba.* data item we will skip handling files too,
              // so this is no problem and we won't get double audio drops on the track or anything like that
              // ev.dataTransfer.items.add()
              transferObject(ev.dataTransfer, item.data);
              break;
            case "project": {
              // TODO: can't even be dragged right now
              transferObject(ev.dataTransfer, item.data);
              break;
            }
            case "wam": {
              ev.dataTransfer.setData("application/pamba.wam", item.data.plugin.url);
              pressedState.set({
                status: "dragging_transferable",
                kind: "application/pamba.wam",
              });
              break;
            }
            case "fausteffect": {
              transferObject(ev.dataTransfer, item.data);
              break;
            }
            default:
              exhaustive(item.data);
          }
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

              await ProjectPersistance.openProject(item.data.id);
              break;
            }
            case "fausteffect": {
              const selected = project.selected.get();
              switch (selected?.status) {
                case "tracks":
                  const track = nullthrows(selected.tracks.at(0), "no track to add dsp to");
                  ignorePromise(track.dsp.addFaustEffect(item.data.id, "last"));
                  break;
                case "clips":
                case "effects":
                case "loop_marker":
                case "time":
                case "track_time":
                case undefined:
                  throw new Error("UNIMPLEMENTED");
                default:
                  exhaustive(selected);
              }
              break;
            }
            case "wam": {
              const selected = project.selected.get();
              switch (selected?.status) {
                case "tracks":
                  const track = nullthrows(selected.tracks.at(0), "no track to add dsp to");
                  await addAvailableWamToTrack(track, item.data.plugin, "last");
                  break;
                case "clips":
                case "effects":
                case "loop_marker":
                case "time":
                case "track_time":
                case undefined:
                  throw new Error("UNIMPLEMENTED");
                default:
                  exhaustive(selected);
              }
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

              const result = await appEnvironment.localFiles.projectLib.delete(item.data.id);
              // todo do something with result? necessary?
              break;
            }
            case "wam":
            case "fausteffect":
              throw new Error("UNIMPLEMENTED");
            default:
              exhaustive(item.data);
          }
        }}
        items={items}
      />
      {/* </AudioFileUploadDropzone> */}

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
    borderRadius: "3px",
    flexGrow: 1,
    fontSize: 12,
    flexShrink: 1,
  },
});
