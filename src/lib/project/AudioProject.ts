import type { ScaleLinear } from "d3-scale";
import { scaleLinear } from "d3-scale";
import { SArray, SSet } from "structured-state";
import { ulid } from "ulid";
import { DEFAULT_TEMPO, SOUND_FONT_URL, SYNTH_101_URL, liveAudioContext } from "../../constants";
import { getFirebaseStorage } from "../../firebase/getFirebase";
import { MidiClip } from "../../midi/MidiClip";
import { MidiInstrument } from "../../midi/MidiInstrument";
import { MidiTrack } from "../../midi/MidiTrack";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/pianorollme/MIDIConfiguration";
import { AnalizedPlayer } from "../AnalizedPlayer";
import { appEnvironment } from "../AppEnvironment";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { ProjectTrack, StandardTrack } from "../ProjectTrack";
import { DerivedState } from "../state/DerivedState";
import { LinkedMap } from "../state/LinkedMap";
import { LinkedState } from "../state/LinkedState";
import { ignorePromise } from "../state/Subbable";
import { AudioStorage } from "./AudioStorage";
import { ProjectViewportUtil } from "./ProjectViewportUtil";
import { PanelSelectionState, PrimarySelectionState } from "./SelectionState";
import { TimelinePoint, time } from "./TimelinePoint";

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
export type SecondaryTool = "move" | "draw";

export type TimeSignature = readonly [numerator: number, denominator: number];
export type AxisMeasure = "tempo" | "time";

export class AudioProject {
  readonly projectId: string;
  readonly projectName: LinkedState<string>;

  readonly viewport: ProjectViewportUtil;
  readonly audioStorage = LinkedState.of<AudioStorage | null>(null);

  readonly isRecording = LinkedState.of(false); // environment?
  readonly tempo: LinkedState<number>;
  readonly timeSignature = LinkedState.of([4, 4] as const); // TODO: serialize
  readonly primaryAxis = LinkedState.of<AxisMeasure>("tempo"); // TODO: serialize
  readonly snapToGrid = LinkedState.of(true); // per project setting?

  // Tracks //
  readonly allTracks: SArray<AudioTrack | MidiTrack>;
  readonly solodTracks = SSet.create<AudioTrack | MidiTrack>(); // TODO: single track kind?
  readonly dspExpandedTracks = SSet.create<AudioTrack | MidiTrack>();
  readonly lockedTracks = SSet.create<AudioTrack | MidiTrack | StandardTrack<any>>();
  // much like live, there's always an active track. Logic is a great model since
  // the active track is clearly discernable in spite of multi-track selection.
  readonly activeTrack = LinkedState.of<AudioTrack | MidiTrack | null>(null);
  readonly armedTrack = LinkedState.of<AudioTrack | MidiTrack | null>(null);

  // Pointer //
  readonly pointerTool = LinkedState.of<Tool>("move");
  readonly panelTool = LinkedState.of<SecondaryTool>("move");
  // the width of the selection at the playback cursor
  // TODO: Rename cursor time width or something?
  readonly selectionWidth = LinkedState.of<number | null>(null);
  readonly cursorPos = LinkedState.of(0);
  readonly cursorTracks = SSet.create<AudioTrack | MidiTrack>();
  // ^^ TODO: a weak linked set might be a good idea

  // Selection //

  // the selected clip(s), track(s), etc
  readonly selected = LinkedState.of<PrimarySelectionState | null>(null);
  readonly secondarySelection = LinkedState.of<PanelSelectionState | null>(null);

  // looping
  readonly loopStart: TimelinePoint;
  readonly loopEnd: TimelinePoint;
  readonly loopOnPlayback = LinkedState.of(false);

  // the zoom level. min scale is 0.64, max is 1000.
  // Px per second. Therefore, small = zoom out. big = zoom in.
  readonly scaleFactor = LinkedState.of(10);
  // the "left" CSS position for the first second visible in the project div
  readonly viewportStartPx = LinkedState.of(0);
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

  constructor(
    tracks: (AudioTrack | MidiTrack)[],
    projectId: string,
    projectName: string,
    tempo: number,
    loopStart: TimelinePoint,
    loopEnd: TimelinePoint,
    loopOnPlayback: boolean,
  ) {
    this.projectId = projectId;
    this.allTracks = SArray.create(tracks);
    this.viewport = new ProjectViewportUtil(this);
    this.projectName = LinkedState.of(projectName);
    this.tempo = LinkedState.of(tempo);
    this.loopStart = loopStart;
    this.loopEnd = loopEnd;
    this.loopOnPlayback = LinkedState.of(loopOnPlayback);
    // so it initializes after app environment is initialized
    setTimeout(() => ignorePromise(this.asyncInits()), 0);
  }

  private async asyncInits() {
    try {
      const storage = await getFirebaseStorage();
      // if (storage !== "no-storage") {
      const audioStorage = await AudioStorage.init(this, storage === "no-storage" ? null : storage);
      this.audioStorage.set(audioStorage);
      // }
    } catch (e) {
      console.error(e);
    }
  }

  static playbackWillLoop(project: AudioProject, cursorPos: number) {
    // If cursor passed the loop already, we don't want to loop playback. WebAudio by default
    // would play the loop as opposed to skipping it
    return project.loopOnPlayback.get() === true && cursorPos < project.loopEnd.secs(project);
  }

  static create() {
    const id = ulid();
    return new this([], id, "untitled", DEFAULT_TEMPO, time(0, "pulses"), time(PPQN * 4, "pulses"), false);
  }

  public canEditTrack(project: AudioProject, track: MidiTrack | AudioTrack | StandardTrack<any>) {
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
    const newTrack = track ?? AudioTrack.of();
    if (position === "top") {
      project.allTracks.unshift(newTrack);
    } else {
      project.allTracks.push(newTrack);
    }
    if (player != null && player.isAudioPlaying) {
      console.log("ADDED TO PLAYBACK");
      player.addTrackToPlayback(project, newTrack, project.cursorPos.get(), project.tempo.get());
    }
    return newTrack;
  }

  static async addMidiTrack(project: AudioProject, track?: MidiTrack) {
    const wamHostGroupId = nullthrows(appEnvironment.wamHostGroup.get())[0];
    const instrument = await MidiInstrument.createFromUrl(SOUND_FONT_URL, wamHostGroupId, liveAudioContext());
    const newTrack = track ?? (await MidiTrack.createWithInstrument(instrument, "midi track"));
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
      ProjectTrack.removeClip(project, track, clip);
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
    ProjectTrack.removeClip(project, track, clip);
    if (selected && selected.status === "clips") {
      project.selected.set({
        ...selected,
        clips: selected.clips.filter((selection) => selection.clip !== clip),
      });
    }
  }
}

class ProjectMarkers {
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

export function deleteTime(project: AudioProject, track: MidiTrack | AudioTrack, startS: number, endS: number): void {
  if (!project.canEditTrack(project, track)) {
    return;
  }

  if (track instanceof MidiTrack) {
    ProjectTrack.deleteTime(project, track, project.viewport.secsToPulses(startS), project.viewport.secsToPulses(endS));
  }
  if (track instanceof AudioTrack) {
    ProjectTrack.deleteTime(project, track, startS, endS);
  }
}
