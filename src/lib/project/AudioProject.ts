import type { ScaleLinear } from "d3-scale";
import { scaleLinear } from "d3-scale";
import { ulid } from "ulid";
import { modifierState } from "../../ModifierState";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { getFirebaseStorage } from "../../firebase/getFirebase";
import { exhaustive } from "../../utils/exhaustive";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { AnalizedPlayer } from "../AnalizedPlayer";
import AudioClip from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { DerivedState } from "../state/DerivedState";
import { LinkedArray } from "../state/LinkedArray";
import { LinkedSet } from "../state/LinkedSet";
import { SPrimitive } from "../state/LinkedState";
import { ignorePromise } from "../state/Subbable";
import { AudioStorage } from "./AudioStorage";
import { ProjectViewportUtil } from "./ProjectViewportUtil";
import { SelectionState } from "./SelectionState";
import { LinkedMap } from "../state/LinkedMap";
import { MidiTrack } from "../../midi/MidiTrack";
import { MidiInstrument } from "../../midi/MidiInstrument";
import { MidiClip } from "../../midi/MidiClip";

/**
 * TODO:
 * - Make timeline view track separator taller, like the one on the TrackHeader
 *   so it's easier to grab.
 * - Render with panning, gain, effects.
 * - Level Meters in DSP
 * - Drop to upload audio file
 * - DSP Bypass button get working
 * - DSP Search Box get working
 * [x] Overscroll towards the end of the project means we got to scroll extra to come back
 * - resizing with slider should resize around the cursor, not 0:00
 * - Load previous project if it exists, instead of creating a new one
 */

export type XScale = ScaleLinear<number, number>;

export type Tool = "move" | "trimStart" | "trimEnd";

export type TimeSignature = readonly [numerator: number, denominator: number];
export type AxisMeasure = "tempo" | "time";

export class AudioProject {
  readonly projectId: string;

  readonly viewport: ProjectViewportUtil;
  readonly audioStorage = SPrimitive.of<AudioStorage | null>(null);

  readonly isRecording = SPrimitive.of(false); // environment?
  readonly tempo = SPrimitive.of(75); // TODO: serialize
  readonly timeSignature = SPrimitive.of([4, 4] as const); // TODO: serialize
  readonly primaryAxis = SPrimitive.of<AxisMeasure>("tempo"); // TODO: serialize
  readonly snapToGrid = SPrimitive.of(true); // per project setting?

  allAudioTracks_TODO_REMOVE() {
    return this.allTracks._getRaw().filter((t) => t instanceof AudioTrack) as AudioTrack[];
  }

  // Tracks //
  readonly allTracks: LinkedArray<AudioTrack | MidiTrack>;
  readonly solodTracks = LinkedSet.create<AudioTrack | MidiTrack>(); // TODO: single track kind?
  readonly dspExpandedTracks = LinkedSet.create<AudioTrack | MidiTrack>();
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
  readonly selected = SPrimitive.of<SelectionState | null>(null);

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

  constructor(tracks: (AudioTrack | MidiTrack)[], projectId: string) {
    this.projectId = projectId;
    this.allTracks = LinkedArray.create(tracks);
    this.viewport = new ProjectViewportUtil(this);
    ignorePromise(this.asyncInits());
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
    return new this([], id);
  }

  //////// Methods on Projects ////////

  // TODO: maybe let's not try to add this track to playback
  static addAudioTrack(project: AudioProject, player?: AnalizedPlayer, track?: AudioTrack) {
    const newTrack = track ?? AudioTrack.create();
    project.allTracks.unshift(newTrack);
    if (player != null && player.isAudioPlaying) {
      console.log("ADDED TO PLAYBACK");
      player.addTrackToPlayback(newTrack, project.cursorPos.get());
    }
    return newTrack;
  }

  static async addMidiTrack(project: AudioProject, track?: MidiTrack) {
    const obxd = await MidiInstrument.createFromUrl("https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js");
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

    // Update active track
    if (project.activeTrack.get() === track) {
      project.activeTrack.set(null);
    }

    // Update cursor tracks
    project.cursorTracks.delete(track);
  }

  static removeClip(project: AudioProject, track: AudioTrack, clip: AudioClip) {
    const selected = project.selected.get();
    track.removeClip(clip);
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

  static selectEffect(project: AudioProject, effect: FaustAudioEffect | PambaWamNode, track: AudioTrack) {
    project.selected.set({
      status: "effects",
      effects: [{ effect, track }],
      test: new Set([effect]),
    });
  }

  /**
   * Deletes whatever is selected
   */
  static deleteSelection(project: AudioProject, player: AnalizedPlayer) {
    const selected = project.selected.get();

    if (!selected) {
      return;
    }

    switch (selected.status) {
      case "clips": {
        for (let { clip, track } of selected.clips) {
          console.log("remove", selected);
          if (track instanceof MidiTrack || clip instanceof MidiClip) {
            throw new Error("MIDI TRACK NOT SUPPORTED");
          }
          AudioProject.removeClip(project, track, clip);
          project.selected.set(null);
        }
        break;
      }
      case "tracks": {
        for (let track of selected.tracks) {
          console.log("remove", selected);
          AudioProject.removeTrack(project, player, track);
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
        // todo
        break;
      }
      case "track_time":
        for (const track of selected.tracks) {
          if (track instanceof AudioTrack) {
            track.deleteTime(selected.start, selected.end);
          }
        }
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
