import { SPrimitive, history } from "structured-state";
import { MidiClip } from "../../midi/MidiClip";
import { midiClip } from "../../midi/MidiClipFn";
import { MidiTrack, midiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { appEnvironment } from "../AppEnvironment";
import { parseMIDIMessage } from "../MidiMessage";
import { standardTrack } from "../StandardTrack";
import { AudioProject } from "./AudioProject";
import { secsToPulses } from "./TimelineT";

type NoteOnState = { onTick: number; onVelocity: number };

type RecordingSession = {
  track: MidiTrack;
  clip: MidiClip;
  // clip start, in absolute timeline pulses. Recorded ticks are relative to this.
  clipStartPulses: number;
  // per midi-note-number (0-127) the currently-held note, or null.
  noteStates: Array<NoteOnState | null>;
};

export class ProjectMidi {
  // The in-progress recording clip, detached from its track and rendered as a live
  // preview overlay. null when we're not recording. Reactive so the UI can subscribe.
  readonly recordingClip = SPrimitive.of<MidiClip | null>(null);
  private session: RecordingSession | null = null;

  // Piano-roll grid snapping (note moves/resizes/draws). Independent of the timeline's
  // `project.snapToGrid`; holding meta inverts it per-gesture. `snapDivision` is the grid
  // step in pulses (default 1/16 note). Runtime-only (not serialized).
  readonly snap = SPrimitive.of<boolean>(true);
  readonly snapDivision = SPrimitive.of<number>(PPQN / 4);

  constructor(
    //
    readonly project: AudioProject,
  ) {}

  isRecording(): boolean {
    return this.session != null;
  }

  /** Is `track` the one we're currently recording onto? (used to place the preview clip) */
  isRecordingTrack(track: MidiTrack): boolean {
    return this.session?.track === track;
  }

  /**
   * Starts recording onto the armed midi track. Notes played from here on are
   * timestamped against the playback position and accumulated into a detached
   * preview clip; call stopRecording to commit it onto the track.
   */
  startRecording() {
    if (this.session != null) {
      return;
    }
    const track = this.project.armedMidiTrack.get();
    if (track == null) {
      return;
    }

    const clipStartPulses = secsToPulses(this.project.cursorPos.get(), this.project.tempo.get());
    const clip = MidiClip.of("recording", clipStartPulses, 0, []);

    this.session = {
      track,
      clip,
      clipStartPulses,
      noteStates: new Array<NoteOnState | null>(128).fill(null),
    };
    this.recordingClip.set(clip);
  }

  /**
   * Finalizes any held notes, then commits the recorded clip onto its track as a
   * single undo entry (overwriting overlapping clips, like audio recording does).
   */
  stopRecording() {
    const session = this.session;
    if (session == null) {
      return;
    }

    // finalize notes still held down when recording stopped
    const finalTick = this.currentTick(session);
    for (let note = 0; note < 128; note++) {
      this.finalizeNote(session, note, finalTick);
    }

    this.session = null;
    this.recordingClip.set(null);

    const clip = session.clip;
    if (clip.buffer.notes.length === 0) {
      // nothing was played; don't add an empty clip
      return;
    }

    // extend the clip to cover the whole recorded span (up to the stop position)
    const lengthPulses = Math.max(clip.timelineLength.ensurePulses(), finalTick);
    clip.timelineLength.set(lengthPulses, "pulses");
    clip.buffer.timelineLength.set(lengthPulses, "pulses");

    history.record("record midi", () => {
      standardTrack.addClip(this.project, session.track, clip);
      midiTrack.flushAllClipStateToProcessor(session.track);
    });
  }

  /** Playback position, in clip-relative pulses. */
  private currentTick(session: RecordingSession): number {
    const player = appEnvironment.renderer.analizedPlayer;
    const absPulse = secsToPulses(player.currentPlaybackTimeSec(), this.project.tempo.get());
    return Math.max(0, absPulse - session.clipStartPulses);
  }

  /** Turns a held note into a recorded note in the preview clip and grows the clip to fit. */
  private finalizeNote(session: RecordingSession, note: number, tick: number) {
    const state = session.noteStates[note];
    if (state == null) {
      return;
    }
    session.noteStates[note] = null;

    const duration = tick - state.onTick;
    if (duration <= 0) {
      return;
    }

    midiClip.addNote(session.clip, state.onTick, note, duration, state.onVelocity);

    const noteEnd = state.onTick + duration;
    if (noteEnd > session.clip.timelineLength.ensurePulses()) {
      session.clip.timelineLength.set(noteEnd, "pulses");
      session.clip.buffer.timelineLength.set(noteEnd, "pulses");
    }
  }

  private recordNoteOn(session: RecordingSession, key: number, velocity: number) {
    const tick = this.currentTick(session);
    // retrigger: close out the previous note on this key before starting a new one
    if (session.noteStates[key] != null) {
      this.finalizeNote(session, key, tick);
    }
    session.noteStates[key] = { onTick: tick, onVelocity: velocity };
  }

  private recordNoteOff(session: RecordingSession, key: number) {
    this.finalizeNote(session, key, this.currentTick(session));
  }

  onMidi(ev: MIDIMessageEvent) {
    const msg = parseMIDIMessage(ev.data);
    if (msg == null) {
      return;
    }

    const armedMidiTrack = this.project.armedMidiTrack.get();
    if (armedMidiTrack == null) {
      return;
    }

    // if midi is note, send to project.armedMidiTrack
    // otherwise, use midi learn map
    switch (msg.type) {
      case "noteon":
        // a note-on with velocity 0 is a note-off (it's a thing)
        if (msg.velocity === 0) {
          midiTrack.noteOff(armedMidiTrack, msg.key);
          if (this.session != null) {
            this.recordNoteOff(this.session, msg.key);
          }
        } else {
          midiTrack.noteOn(armedMidiTrack, msg.key);
          if (this.session != null) {
            this.recordNoteOn(this.session, msg.key, msg.velocity);
          }
        }
        break;
      case "noteoff":
        midiTrack.noteOff(armedMidiTrack, msg.key);
        if (this.session != null) {
          this.recordNoteOff(this.session, msg.key);
        }
        break;
      case "keypressure":
      case "pitchbendchange":
      case "programchange":
      case "controlchange":
      case "channelpressure":
        break;
      default:
        exhaustive(msg);
    }
  }
}
