import { MarkedValue } from "marked-subbable";
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
  set,
  string,
} from "structured-state";
import { ulid } from "ulid";
import { DEFAULT_TEMPO } from "../../constants";
import { DSP } from "../../dsp/DSP";
import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { appEnvironment } from "../AppEnvironment";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { AnalizedPlayer } from "../io/AnalizedPlayer";
import { ProjectTrack, StandardTrack } from "../ProjectTrack";
import { ProjectViewport } from "../viewport/ProjectViewport";
import { ProjectMidi } from "./ProjectMidi";
import { PanelSelectionState, PrimarySelectionState } from "./SelectionState";
import { TimelineT, time } from "./TimelineT";

export type PointerTool = "move" | "trimStart" | "trimEnd" | "slice";
export type SecondaryTool = "move" | "draw";
export type Panel = "primary" | "secondary" | "sidebar";
export type TimeSignature = readonly [numerator: number, denominator: number];
export type AxisMeasure = "tempo" | "time";

export class AudioProject {
  // settings //
  readonly timeSignature = SPrimitive.of([4, 4] as const); // TODO: serialize, unused
  readonly primaryAxis = SPrimitive.of<AxisMeasure>("tempo"); // TODO: serialize, unused

  // systems //
  readonly viewport: ProjectViewport;
  readonly midi: ProjectMidi;

  // Selection //

  // the selected clip(s), track(s), etc
  readonly selected = MarkedValue.create<PrimarySelectionState | null>(null);
  readonly secondarySelection = MarkedValue.create<PanelSelectionState | null>(null);
  readonly activePanel = MarkedValue.create<Panel>("primary");

  constructor(
    readonly projectId: string,
    readonly projectName: SString,
    // tracks //
    readonly allTracks: SSchemaArray<AudioTrack | MidiTrack>,
    readonly solodTracks: SSet<AudioTrack | MidiTrack>,
    readonly dspExpandedTracks: SSet<AudioTrack | MidiTrack>,
    readonly lockedTracks: SSet<AudioTrack | MidiTrack | StandardTrack<any>>,
    // much like live, there's always an active track. Logic is a great model since
    // the active track is clearly discernable in spite of multi-track selection.
    // TODO: when undoing a track deletion, activetrack.name is being set to {_value: 'Audio', _id: '...'}. WHY?
    // I'm guessing it's becuase history looks at every change, and tries to undo everything that happened when doing
    // history.record(...). But why is activeTrack.name not set properly though?
    readonly activeTrack: SPrimitive<AudioTrack | MidiTrack | null>,
    readonly armedAudioTrack: SPrimitive<AudioTrack | null>,
    readonly armedMidiTrack: SPrimitive<MidiTrack | null>,
    // settings //
    readonly tempo: SNumber,
    readonly snapToGrid: SBoolean,
    // looping //
    readonly loopStart: TimelineT,
    readonly loopEnd: TimelineT,
    readonly loopOnPlayback: SBoolean,
    // pointer //
    readonly pointerTool: SPrimitive<PointerTool>,
    readonly panelTool: SPrimitive<SecondaryTool>,
    // selection //
    // the width of the selection at the playback cursor
    // TODO: Rename cursor time width or something?
    readonly selectionWidth: SPrimitive<number | null>,
    readonly cursorPos: SNumber,
    readonly cursorTracks: SSet<AudioTrack | MidiTrack>,
    // ^^ TODO: a weak linked set might be a good idea

    // viewport //
    scaleFactor: number,
    viewportStartPx: number,
  ) {
    allTracks.map((track) => {
      DSP.connect(track.dsp, appEnvironment.renderer.analizedPlayer.mixDownNode);
    });

    this.viewport = Structured.create(ProjectViewport, this, number(0), number(scaleFactor), number(viewportStartPx));
    this.midi = new ProjectMidi(this);
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
      set<AudioTrack | MidiTrack>(),
      set<AudioTrack | MidiTrack>(),
      set<AudioTrack | MidiTrack | StandardTrack<any>>(),
      SPrimitive.of<AudioTrack | MidiTrack | null>(null),
      SPrimitive.of<AudioTrack | null>(null),
      SPrimitive.of<MidiTrack | null>(null),
      number(DEFAULT_TEMPO),
      boolean(true),
      time(0, "pulses"),
      time(PPQN * 4, "pulses"),
      boolean(false),
      SPrimitive.of<PointerTool>("move"),
      SPrimitive.of<SecondaryTool>("draw"),
      SPrimitive.of<number | null>(null),
      SPrimitive.of(0),
      set<AudioTrack | MidiTrack>(),
      10,
      0,
    );
  }

  public canEditTrack(project: AudioProject, track: MidiTrack | AudioTrack | StandardTrack<any>) {
    return !project.lockedTracks.has(track) && !appEnvironment.renderer.analizedPlayer.isAudioPlaying;
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

    DSP.connect(newTrack.dsp, appEnvironment.renderer.analizedPlayer.mixDownNode);
    return newTrack;
  }

  static async addMidiTrack(project: AudioProject, position: "top" | "bottom" = "top", track?: MidiTrack) {
    const newTrack = track ?? (await MidiTrack.createDefault());
    if (position === "top") {
      project.allTracks.unshift(newTrack);
    } else {
      project.allTracks.push(newTrack);
    }

    DSP.connect(newTrack.dsp, appEnvironment.renderer.analizedPlayer.mixDownNode);
    return newTrack;
  }

  static removeTrack(project: AudioProject, player: AnalizedPlayer, track: AudioTrack | MidiTrack) {
    const selected = project.selected.get();
    const pos = project.allTracks.indexOf(track);
    if (pos === -1) {
      return;
    }

    // Remove it from playback
    if (player.isAudioPlaying) {
      console.log("TODO: delete track while playing");
      // player.removeTrackFromPlayback(track);
    }

    project.allTracks.splice(pos, 1);

    DSP.disconnectAll(track.dsp);

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

    if (project.armedAudioTrack.get() === track) {
      project.armedAudioTrack.set(null);
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
