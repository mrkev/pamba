import type { ScaleLinear } from "d3-scale";
import { scaleLinear } from "d3-scale";
import { SArray, history } from "structured-state";
import { ulid } from "ulid";
import { modifierState } from "../../ModifierState";
import { DEFAULT_TEMPO, SYNTH_101_URL, liveAudioContext } from "../../constants";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { getFirebaseStorage } from "../../firebase/getFirebase";
import { MidiClip } from "../../midi/MidiClip";
import { MidiInstrument } from "../../midi/MidiInstrument";
import { MidiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import nullthrows from "../../utils/nullthrows";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { AnalizedPlayer } from "../AnalizedPlayer";
import { appEnvironment } from "../AppEnvironment";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { DerivedState } from "../state/DerivedState";
import { LinkedMap } from "../state/LinkedMap";
import { LinkedSet } from "../state/LinkedSet";
import { SPrimitive } from "../state/LinkedState";
import { ignorePromise } from "../state/Subbable";
import { AudioStorage } from "./AudioStorage";
import { clipboard } from "./ClipboardState";
import { ProjectViewportUtil } from "./ProjectViewportUtil";
import { PrimarySelectionState } from "./SelectionState";
import { ProjectTrack } from "../ProjectTrack";

/**
 * TODO:
 * - Make timeline view track separator taller, like the one on the TrackHeader
 *   so it's easier to grab.
 * - Render with panning, gain, effects.
 * - Level Meters in DSP
 * [x] Drop to upload audio file
 * - DSP Bypass button get working
 * - DSP Search Box get working
 * [x] Overscroll towards the end of the project means we got to scroll extra to come back
 * - resizing with slider should resize around the cursor, not 0:00
 * [x] Load previous project if it exists, instead of creating a new one
 */

export type XScale = ScaleLinear<number, number>;

export type Tool = "move" | "trimStart" | "trimEnd" | "slice";

export type TimeSignature = readonly [numerator: number, denominator: number];
export type AxisMeasure = "tempo" | "time";

export class AudioProject {
  readonly projectId: string;
  readonly projectName: SPrimitive<string>;

  readonly viewport: ProjectViewportUtil;
  readonly audioStorage = SPrimitive.of<AudioStorage | null>(null);

  readonly isRecording = SPrimitive.of(false); // environment?
  readonly tempo: SPrimitive<number>;
  readonly timeSignature = SPrimitive.of([4, 4] as const); // TODO: serialize
  readonly primaryAxis = SPrimitive.of<AxisMeasure>("tempo"); // TODO: serialize
  readonly snapToGrid = SPrimitive.of(true); // per project setting?

  // Tracks //
  readonly allTracks: SArray<AudioTrack | MidiTrack>;
  readonly solodTracks = LinkedSet.create<AudioTrack | MidiTrack>(); // TODO: single track kind?
  readonly dspExpandedTracks = LinkedSet.create<AudioTrack | MidiTrack>();
  readonly lockedTracks = LinkedSet.create<AudioTrack | MidiTrack | ProjectTrack<any>>();
  // much like live, there's always an active track. Logic is a great model since
  // the active track is clearly discernable in spite of multi-track selection.
  readonly activeTrack = SPrimitive.of<AudioTrack | MidiTrack | null>(null);
  readonly armedTrack = SPrimitive.of<AudioTrack | MidiTrack | null>(null);

  // Pointer //
  readonly pointerTool = SPrimitive.of<Tool>("move");
  // the width of the selection at the playback cursor
  // TODO: Rename cursor time width or something?
  readonly selectionWidth = SPrimitive.of<number | null>(null);
  readonly cursorPos = SPrimitive.of(0);
  readonly cursorTracks = LinkedSet.create<AudioTrack | MidiTrack>();
  // ^^ TODO: a weak linked set might be a good idea

  // Selection //

  // the selected clip(s), track(s), etc
  readonly selected = SPrimitive.of<PrimarySelectionState | null>(null);

  // the zoom level. min scale is 0.64, max is 1000
  readonly scaleFactor = SPrimitive.of(10);
  // the "left" CSS position for the first second visible in the project div
  readonly viewportStartPx = SPrimitive.of(0);
  // 1 sec corresponds to 10 px
  readonly secsToPx = DerivedState.from(
    [this.scaleFactor],
    (factor: number) =>
      scaleLinear()
        .domain([0, 1])
        .range([0, 1 * factor]) as XScale,
  );
  // factor 2: 1sec => 2px
  // factor 3: 1sec => 3px
  // etc

  readonly secsToViewportPx = DerivedState.from(
    [this.scaleFactor, this.viewportStartPx],
    (factor: number, startPx: number) =>
      scaleLinear()
        .domain([0, 1])
        .range([0 + startPx, 1 * factor + startPx]) as XScale,
  );

  constructor(tracks: (AudioTrack | MidiTrack)[], projectId: string, projectName: string, tempo: number) {
    this.projectId = projectId;
    this.allTracks = SArray.create(tracks);
    this.viewport = new ProjectViewportUtil(this);
    this.projectName = SPrimitive.of(projectName);
    this.tempo = SPrimitive.of(tempo);
    // so it initializes after app environment is initialized
    setTimeout(() => ignorePromise(this.asyncInits()), 0);
  }

  private async asyncInits() {
    try {
      const storage = await getFirebaseStorage();
      if (storage !== "no-storage") {
        const audioStorage = await AudioStorage.initAtRootLocation(this, storage);
        this.audioStorage.set(audioStorage);
      }
    } catch (e) {
      console.error(e);
    }
  }

  static create() {
    const id = ulid();
    return new this([], id, "untitled", DEFAULT_TEMPO);
  }

  public canEditTrack(project: AudioProject, track: MidiTrack | AudioTrack | ProjectTrack<any>) {
    return !project.lockedTracks.has(track); // todo: also check if audio is playing
  }

  //////// Methods on Projects ////////

  // TODO: maybe let's not try to add this track to playback
  static addAudioTrack(
    project: AudioProject,
    player?: AnalizedPlayer,
    track?: AudioTrack,
    position: "top" | "bottom" = "top",
  ) {
    const newTrack = track ?? AudioTrack.create();
    if (position === "top") {
      project.allTracks.unshift(newTrack);
    } else {
      project.allTracks.push(newTrack);
    }
    if (player != null && player.isAudioPlaying) {
      console.log("ADDED TO PLAYBACK");
      player.addTrackToPlayback(newTrack, project.cursorPos.get(), project.tempo.get());
    }
    return newTrack;
  }

  static async addMidiTrack(project: AudioProject, track?: MidiTrack) {
    const wamHostGroupId = nullthrows(appEnvironment.wamHostGroup.get())[0];
    const obxd = await MidiInstrument.createFromUrl(SYNTH_101_URL, wamHostGroupId, liveAudioContext);
    const newTrack = track ?? (await MidiTrack.createWithInstrument(obxd, "midi track"));
    project.allTracks.unshift(newTrack);
    return newTrack;
  }

  static removeTrack(project: AudioProject, player: AnalizedPlayer, track: AudioTrack | MidiTrack) {
    const selected = project.selected.get();
    const pos = project.allTracks.indexOf(track);
    if (pos === -1) {
      return;
    }

    project.allTracks.splice(pos, 1);

    // Remove it from playback
    if (player.isAudioPlaying) {
      console.log("TODO: delete track while playing");
      // player.removeTrackFromPlayback(track);
    }

    // Update selected
    if (selected && selected.status === "tracks" && selected.test.has(track)) {
      selected.test.delete(track);
      const newSelected = {
        ...selected,
        tracks: selected.tracks.filter((selectoin) => selectoin !== track),
      };
      project.selected.set(newSelected);
    }

    // Update potential direct references
    if (project.activeTrack.get() === track) {
      project.activeTrack.set(null);
    }

    if (project.armedTrack.get() === track) {
      project.armedTrack.set(null);
    }

    // Update from trakc state
    project.cursorTracks.delete(track);
    project.solodTracks.delete(track);
    project.lockedTracks.delete(track);
  }

  static removeAudioClip(project: AudioProject, track: AudioTrack, clip: AudioClip): void {
    const selected = project.selected.get();
    if (track instanceof AudioTrack) {
      track.removeClip(project, clip);
    }
    if (selected && selected.status === "clips") {
      project.selected.set({
        ...selected,
        clips: selected.clips.filter((selection) => selection.clip !== clip),
      });
    }
  }

  static removeMidiClip(project: AudioProject, track: MidiTrack, clip: MidiClip): void {
    const selected = project.selected.get();
    track.removeClip(project, clip);
    if (selected && selected.status === "clips") {
      project.selected.set({
        ...selected,
        clips: selected.clips.filter((selection) => selection.clip !== clip),
      });
    }
  }
}

export class ProjectSelection {
  /**
   * selects a track
   */
  static selectTrack(project: AudioProject, track: AudioTrack | MidiTrack) {
    const selected = project.selected.get();
    const selectAdd = modifierState.meta || modifierState.shift;
    if (selectAdd && selected?.status === "tracks") {
      const next = { ...selected };
      next.tracks.push(track);
      next.test.add(track);
      project.selected.set(next);
    } else {
      project.selected.set({
        status: "tracks",
        tracks: [track],
        test: new Set([track]),
      });
      project.activeTrack.set(track);
    }
  }

  static selectEffect(project: AudioProject, effect: FaustAudioEffect | PambaWamNode, track: AudioTrack | MidiTrack) {
    project.selected.set({
      status: "effects",
      effects: [{ effect, track }],
      test: new Set([effect]),
    });
  }

  /**
   * Deletes whatever is selected
   */
  static deleteSelection(project: AudioProject) {
    const selected = project.selected.get();

    if (!selected) {
      return;
    }

    switch (selected.status) {
      case "clips": {
        for (let { clip, track } of selected.clips) {
          console.log("remove", selected);
          if (track instanceof MidiTrack && clip instanceof MidiClip) {
            AudioProject.removeMidiClip(project, track, clip);
          } else if (track instanceof AudioTrack && clip instanceof AudioClip) {
            AudioProject.removeAudioClip(project, track, clip);
          } else {
            console.log("TODO, delete mixed!");
          }
          project.selected.set(null);
        }
        break;
      }
      case "tracks": {
        for (let track of selected.tracks) {
          console.log("remove", selected);
          AudioProject.removeTrack(project, appEnvironment.renderer.analizedPlayer, track);
          project.selected.set(null);
        }
        break;
      }
      case "effects": {
        for (let { track, effect } of selected.effects) {
          console.log("remove", selected);
          AudioTrack.removeEffect(track, effect);
          project.selected.set(null);
        }
        break;
      }
      case "time": {
        history.record(() => {
          for (const track of project.allTracks) {
            deleteTime(project, track, selected.startS, selected.endS);
          }
        });
        break;
      }
      case "track_time":
        for (const track of selected.tracks) {
          if (track instanceof AudioTrack) {
            // TODO: move history.record(...) up to the command level as possible
            history.record(() => {
              track.deleteTime(project, selected.startS, selected.endS);
            });
          } else if (track instanceof MidiTrack) {
            track.deleteTime(
              project,
              project.viewport.secsToPulses(selected.startS),
              project.viewport.secsToPulses(selected.endS),
            );
          }
        }
        break;
      default:
        exhaustive(selected);
    }
  }

  static copySelection(project: AudioProject) {
    const selected = project.selected.get();

    if (!selected) {
      return;
    }

    switch (selected.status) {
      case "clips": {
        clipboard.set({ kind: "clips", clips: selected.clips.map((selection) => selection.clip.clone()) });
        break;
      }
      case "tracks":
      case "effects":
      case "time":
      case "track_time":
        break;
      default:
        exhaustive(selected);
    }
  }
}

export class ProjectMarkers {
  // id -> time
  readonly timeMarkers = LinkedMap.create<number, number>();
  nextTimeMarkerId = 0;
  /**
   * When first clicking a marker, we move the cursor to that point in time.
   * When selecting a previously clicked marker, we select it
   */
  static selectMarker(project: AudioProject, markers: ProjectMarkers, markerId: number) {
    const markerTime = markers.timeMarkers.get(markerId);
    if (!markerTime) {
      return;
    }

    const cursorTime = project.cursorPos.get();
    if (cursorTime !== markerTime) {
      project.cursorPos.set(markerTime);
    } else {
      // TODO: new selection state, marker
    }
  }
}

function deleteTime(project: AudioProject, track: MidiTrack | AudioTrack, startS: number, endS: number): void {
  if (!project.canEditTrack(project, track)) {
    return;
  }

  if (track instanceof MidiTrack) {
    track.deleteTime(project, project.viewport.secsToPulses(startS), project.viewport.secsToPulses(endS));
  }
  if (track instanceof AudioTrack) {
    track.deleteTime(project, startS, endS);
  }
}
