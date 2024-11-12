import type { ScaleLinear } from "d3-scale";
import {
  SBoolean,
  SNumber,
  SPrimitive,
  SSchemaArray,
  SSet,
  SString,
  Structured,
  arrayOf,
  boolean,
  number,
  string,
} from "structured-state";
import { ulid } from "ulid";
import { DEFAULT_TEMPO, SOUND_FONT_URL, liveAudioContext } from "../../constants";
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
import { LinkedState } from "../state/LinkedState";
import { ProjectViewport } from "../viewport/ProjectViewport";
import { PanelSelectionState, PrimarySelectionState } from "./SelectionState";
import { TimelineT, time } from "./TimelineT";

/**
 * TODO:
 * - Make timeline view track separator taller, like the one on the TrackHeader
 *   so it's easier to grab.
 * [x] Render with panning, gain, effects.
 * - Level Meters in DSP
 * [x] Drop to upload audio file
 * - DSP Bypass button get working
 * [x] DSP Search Box get working
 * [x] Overscroll towards the end of the project means we got to scroll extra to come back
 * [x] resizing with slider should resize around the cursor, not 0:00
 * [x] Load previous project if it exists, instead of creating a new one
 */

export type XScale = ScaleLinear<number, number>;

export type PointerTool = "move" | "trimStart" | "trimEnd" | "slice";
export type SecondaryTool = "move" | "draw";
export type Panel = "primary" | "secondary" | "sidebar";

export type TimeSignature = readonly [numerator: number, denominator: number];
export type AxisMeasure = "tempo" | "time";

export class AudioProject {
  // settings //
  readonly timeSignature = SPrimitive.of([4, 4] as const); // TODO: serialize
  readonly primaryAxis = SPrimitive.of<AxisMeasure>("tempo"); // TODO: serialize
  readonly snapToGrid = SPrimitive.of(false); // per project setting?

  // systems //
  readonly viewport: ProjectViewport;

  // Tracks //
  readonly solodTracks = SSet.create<AudioTrack | MidiTrack>(); // TODO: single track kind?
  readonly dspExpandedTracks = SSet.create<AudioTrack | MidiTrack>();
  readonly lockedTracks = SSet.create<AudioTrack | MidiTrack | StandardTrack<any>>();
  // much like live, there's always an active track. Logic is a great model since
  // the active track is clearly discernable in spite of multi-track selection.
  // TODO: when undoing a track deletion, activetrack.name is being set to {_value: 'Audio', _id: '...'}. WHY?
  // I'm guessing it's becuase history looks at every change, and tries to undo everything that happened when doing
  // history.record(...). But why is activeTrack.name not set properly though?
  readonly activeTrack = SPrimitive.of<AudioTrack | MidiTrack | null>(null);
  readonly armedTrack = SPrimitive.of<AudioTrack | MidiTrack | null>(null);

  // Pointer //
  readonly pointerTool = SPrimitive.of<PointerTool>("move");
  readonly panelTool = SPrimitive.of<SecondaryTool>("draw");
  // the width of the selection at the playback cursor
  // TODO: Rename cursor time width or something?
  readonly selectionWidth = SPrimitive.of<number | null>(null);
  readonly cursorPos = SPrimitive.of(0);
  readonly cursorTracks = SSet.create<AudioTrack | MidiTrack>();
  // ^^ TODO: a weak linked set might be a good idea

  // Selection //

  // the selected clip(s), track(s), etc
  readonly selected = LinkedState.of<PrimarySelectionState | null>(null);
  readonly secondarySelection = LinkedState.of<PanelSelectionState | null>(null);
  readonly activePanel = LinkedState.of<Panel>("primary");

  constructor(
    readonly projectId: string,
    readonly projectName: SString,
    // tracks
    readonly allTracks: SSchemaArray<AudioTrack | MidiTrack>,
    // settings
    readonly tempo: SNumber,
    // looping
    readonly loopStart: TimelineT,
    readonly loopEnd: TimelineT,
    readonly loopOnPlayback: SBoolean,
    scaleFactor: number,
    viewportStartPx: number,
  ) {
    this.viewport = Structured.create(ProjectViewport, this, number(0), number(scaleFactor), number(viewportStartPx));
  }

  static playbackWillLoop(project: AudioProject, cursorPos: number) {
    // If cursor passed the loop already, we don't want to loop playback. WebAudio by default
    // would play the loop as opposed to skipping it
    return project.loopOnPlayback.get() === true && cursorPos < project.loopEnd.secs(project);
  }

  static create() {
    const id = ulid();
    return new this(
      id,
      string("untitled"),
      arrayOf([AudioTrack, MidiTrack], []),
      number(DEFAULT_TEMPO),
      time(0, "pulses"),
      time(PPQN * 4, "pulses"),
      boolean(false),
      10,
      0,
    );
  }

  public canEditTrack(project: AudioProject, track: MidiTrack | AudioTrack | StandardTrack<any>) {
    return !project.lockedTracks.has(track) && !appEnvironment.renderer.analizedPlayer.isAudioPlaying;
  }

  public compareTime(a: TimelineT, op: "<" | ">" | "=", b: TimelineT): boolean {
    return TimelineT.compare(this, a, op, b);
  }

  //////// Methods on Projects ////////

  // TODO: maybe let's not try to add this track to playback
  static addAudioTrack(
    project: AudioProject,
    position: "top" | "bottom" = "top",
    track?: AudioTrack,
    player?: AnalizedPlayer,
  ): AudioTrack {
    const newTrack = track ?? AudioTrack.empty();
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

  static async addMidiTrack(project: AudioProject, position: "top" | "bottom" = "top", track?: MidiTrack) {
    const newTrack = track ?? (await MidiTrack.createDefault());
    if (position === "top") {
      project.allTracks.unshift(newTrack);
    } else {
      project.allTracks.push(newTrack);
    }
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

    // Update from track state
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
