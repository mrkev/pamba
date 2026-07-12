import {
  InitFunctions,
  JSONOfAuto,
  ReplaceFunctions,
  SBoolean,
  SSet,
  SString,
  Structured,
  arrayOf,
  history,
  set,
} from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../constants";
import { AbstractClip, Pulses } from "../lib/AbstractClip";
import { standardTrack } from "../lib/StandardTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { TimeUnit, TimelineT, time } from "../lib/project/TimelineT";
import { MidiViewport } from "../lib/viewport/MidiViewport";
import { clamp } from "../utils/math";
import { MidiBuffer, midiBuffer } from "./MidiBuffer";
import { MidiNote, mnote } from "./MidiNote";
import { MidiTrack, midiTrack } from "./MidiTrack";
import { SAMPLE_MIDI } from "./SAMPLE_MIDI";
import type { NoteT } from "./SharedMidiTypes";

type AutoMidiClip = {
  name: SString;
  timelineStart: TimelineT;
  timelineLength: TimelineT;
  buffer: MidiBuffer;
  bufferTimelineStart: TimelineT;
  viewport: MidiViewport;
  muted: SBoolean;
};

export class MidiClip extends Structured<AutoMidiClip, typeof MidiClip> implements AbstractClip<Pulses> {
  readonly bufferOffset: TimelineT = time(0, "pulses"); // unused, rn here just for types

  constructor(
    readonly name: SString,
    readonly timelineStart: TimelineT,
    readonly timelineLength: TimelineT,
    readonly buffer: MidiBuffer,
    readonly detailedViewport: MidiViewport,
    readonly selectedNotes: SSet<MidiNote>,
    // todo: as of now, unused. midi can be trimmed like audio though.
    readonly bufferTimelineStart: TimelineT,
    readonly muted: SBoolean,
  ) {
    super();
  }

  override autoSimplify(): AutoMidiClip {
    return {
      name: this.name,
      timelineStart: this.timelineStart,
      timelineLength: this.timelineLength,
      buffer: this.buffer,
      viewport: this.detailedViewport,
      bufferTimelineStart: this.bufferTimelineStart,
      muted: this.muted,
    };
  }

  override replace(json: JSONOfAuto<AutoMidiClip>, replace: ReplaceFunctions): void {
    replace.string(json.name, this.name);
    replace.structured(json.timelineStart, this.timelineStart);
    replace.structured(json.timelineLength, this.timelineLength);
    replace.structured(json.buffer, this.buffer);
    replace.structured(json.bufferTimelineStart, this.bufferTimelineStart);
    replace.structured(json.viewport, this.detailedViewport);
    replace.boolean(json.muted, this.muted);
  }

  static construct(auto: JSONOfAuto<AutoMidiClip>, init: InitFunctions): MidiClip {
    return Structured.create(
      MidiClip,
      init.string(auto.name),
      init.structured(auto.timelineStart, TimelineT),
      init.structured(auto.timelineLength, TimelineT),
      init.structured(auto.buffer, MidiBuffer),
      init.structured(auto.viewport, MidiViewport),
      set([]),
      init.structured(auto.bufferTimelineStart, TimelineT),
      init.boolean(auto.muted),
    );
  }

  static of(
    name: string,
    startOffsetPulses: number,
    lengthPulses: number,
    notes: NoteT[],
    viewport?: MidiViewport,
    bufferTimelineStart?: number,
  ) {
    return Structured.create(
      MidiClip,
      SString.create(name),
      time(startOffsetPulses, "pulses"),
      time(lengthPulses, "pulses"),
      Structured.create(MidiBuffer, arrayOf([MidiNote], notes.map(mnote)), time(lengthPulses, "pulses")),
      viewport ?? MidiViewport.of(10, 10, 0, 0),
      set([]),
      time(bufferTimelineStart ?? startOffsetPulses, "pulses"),
      SBoolean.create(false),
    );
  }

  // interface AbstractClip

  get _timelineStartU(): Pulses {
    return this.timelineStart.ensurePulses() as Pulses;
  }

  get _timelineEndU(): Pulses {
    return (this.timelineStart.ensurePulses() + this.timelineLength.ensurePulses()) as Pulses;
  }

  public timelineEndPulses() {
    return this.timelineStart.ensurePulses() + this.timelineLength.ensurePulses();
  }

  _setTimelineEndU(newEnd: number): void {
    if (newEnd < this.timelineStart.ensurePulses()) {
      throw new Error("Can't set endOffsetSec to be before startOffsetSec");
    }
    // this.lengthPulses = (newEnd - this._startOffsetPulses) as Pulses;
    this.timelineLength.set(newEnd - this.timelineStart.ensurePulses(), "pulses");
  }

  trimStartToTimelineU(timePulses: number) {
    if (timePulses < this.timelineStart.ensurePulses()) {
      return;
    }

    if (timePulses > this._timelineEndU) {
      throw new Error("trimming past end time");
    }

    const _delta = timePulses - this.timelineStart.ensurePulses();

    // this._startOffsetPulses = timePulses as Pulses;
    this.timelineStart.set(timePulses, "pulses");

    // TODO
    // this.trimStartSec = this.trimStartSec + delta;
  }

  clone(): MidiClip {
    const newClip = Structured.create(
      MidiClip,
      SString.create(this.name.get()),
      this.timelineStart.clone(),
      this.timelineLength.clone(),
      // we clone when we create a new clip for rendering, when dragging a clip.
      // keep the buffer, so we don't re-draw the midi notes, which can be expensive.
      // it also makes sense no? for midi buffers to be re-used?
      this.buffer,
      this.detailedViewport.clone(),
      set([]),
      this.bufferTimelineStart.clone(),
      SBoolean.create(this.muted.get()),
    );
    return newClip;
  }

  override toString() {
    return `${this.timelineStart.renderSimple()} [ ${this.name.get()} ] ${this._timelineEndU}`;
  }
}

export function setClipLength(project: AudioProject, track: MidiTrack, clip: MidiClip, t: number, u: TimeUnit) {
  const i = track.clips.indexOf(clip);
  const next = track.clips.at(i + 1);
  if (i < 0) {
    throw new Error("setClipLength: clip not in track");
  }

  const prevLength = clip.timelineLength.pulses(project);
  const newLength = TimelineT.pulses(project, t, u);

  // nothing special to do anything in these cases
  if (newLength < prevLength || next === null) {
    clip.timelineLength.set(t, u);
    return;
  }

  // Delete all the area we're expanding into, and set the new length
  const clipStart = clip.timelineStart.pulses(project);
  const start = clipStart + prevLength; // pulses
  const end = clipStart + newLength; // pulses
  standardTrack.deleteTime(project, track, start, end);

  clip.timelineLength.set(t, u);
}

/////////////////////

function addNote(clip: MidiClip, tick: number, num: number, duration: number, velocity: number) {
  midiBuffer.addOrderedNote(clip.buffer, mnote([tick, num, duration, velocity]));
  clip.buffer.clearCache();
  clip.notifyChange();
}

function removeNote(clip: MidiClip, note: MidiNote) {
  const result = clip.buffer.notes.remove(note);
  clip.buffer.clearCache();
  clip.notifyChange();
  return result;
}

// Good for now, works long term?
function findNote(clip: MidiClip, tick: number, number: number) {
  return clip.buffer.notes.find((note: MidiNote) => note.tick == tick && note.number == number) ?? null;
}

// TODO: will be different if clip and buffer start don't align
function findNotesInRange(
  clip: MidiClip,
  minPulse: number = 0,
  maxPulse: number = Infinity,
  minNote: number = 0,
  maxNote: number = TOTAL_VERTICAL_NOTES - 1,
) {
  const result = [];
  for (const note of clip.buffer.notes) {
    const [tick, num] = note.t;
    if (tick >= minPulse && tick <= maxPulse && num >= minNote && num <= maxNote) {
      result.push(note);
    }
    // since notes are ordered by tick, we know no note after this will be in range
    if (tick > maxPulse) {
      break;
    }
  }
  return result;
}

export const NOTE_MIN_SIZE_PULSES = 2;

/**
 * Clamps a (deltaTick, deltaNumber) group translation so every note in `moves` stays in
 * the valid tick (>= 0) and pitch ([0, TOTAL_VERTICAL_NOTES)) range. Clamping is
 * group-aware: the whole set shifts by the same clamped delta so it keeps its shape at
 * the edges instead of collapsing against them.
 */
function clampNoteMove(
  moves: ReadonlyMap<MidiNote, NoteT>,
  deltaTick: number,
  deltaNumber: number,
): [tick: number, number: number] {
  let minTick = Infinity;
  let minNumber = Infinity;
  let maxNumber = -Infinity;
  for (const [, orig] of moves) {
    minTick = Math.min(minTick, orig[0]);
    minNumber = Math.min(minNumber, orig[1]);
    maxNumber = Math.max(maxNumber, orig[1]);
  }
  const clampedTick = Math.max(deltaTick, -minTick);
  const clampedNumber = clamp(-minNumber, deltaNumber, TOTAL_VERTICAL_NOTES - 1 - maxNumber);
  return [clampedTick, clampedNumber];
}

/** Removes notes `note` now overlaps (same pitch, overlapping tick range), except those in `keep`. */
function removeNotesOverlapping(clip: MidiClip, keep: ReadonlyMap<MidiNote, NoteT>, note: MidiNote) {
  const start = note.tick;
  const end = start + note.duration - 1;
  for (const other of findNotesInRange(clip, start, end, note.number, note.number)) {
    if (keep.has(other)) {
      continue;
    }
    midiBuffer.removeNote(clip.buffer, other);
  }
}

/**
 * Translates every note in `moves` by (deltaTick, deltaNumber) relative to each note's own
 * start position (the map value is its original `[tick, number, duration, velocity]`).
 * Records one undo entry and flushes the result to the audio processor. Callers that show a
 * live preview (dragging) may have already moved the notes; this reverts them first so undo
 * captures the true original -> final change.
 */
function moveNotes(
  track: MidiTrack,
  clip: MidiClip,
  moves: ReadonlyMap<MidiNote, NoteT>,
  deltaTick: number,
  deltaNumber: number,
) {
  if (moves.size === 0) {
    return;
  }
  for (const [note, orig] of moves) {
    note.tick = orig[0];
    note.number = orig[1];
  }
  const [clampedTick, clampedNumber] = clampNoteMove(moves, deltaTick, deltaNumber);
  if (clampedTick === 0 && clampedNumber === 0) {
    return;
  }
  history.record("move notes", () => {
    for (const [note, orig] of moves) {
      note.tick = orig[0] + clampedTick;
      note.number = orig[1] + clampedNumber;
    }
    for (const note of moves.keys()) {
      removeNotesOverlapping(clip, moves, note);
    }
    clip.buffer.clearCache();
    clip.notifyChange();
    midiTrack.flushAllClipStateToProcessor(track);
  });
}

/**
 * Resizes every note in `sizes` by `deltaDuration` relative to each note's own start
 * duration. Records one undo entry and flushes to the audio processor. Like `moveNotes`, it
 * reverts any live-preview resize first so undo captures the true original -> final change.
 */
function resizeNotes(track: MidiTrack, clip: MidiClip, sizes: ReadonlyMap<MidiNote, NoteT>, deltaDuration: number) {
  if (sizes.size === 0 || deltaDuration === 0) {
    for (const [note, orig] of sizes) {
      note.duration = orig[2];
    }
    return;
  }
  for (const [note, orig] of sizes) {
    note.duration = orig[2];
  }
  history.record("resize notes", () => {
    for (const [note, orig] of sizes) {
      note.duration = Math.max(NOTE_MIN_SIZE_PULSES, orig[2] + deltaDuration);
    }
    for (const note of sizes.keys()) {
      removeNotesOverlapping(clip, sizes, note);
    }
    clip.buffer.clearCache();
    clip.notifyChange();
    midiTrack.flushAllClipStateToProcessor(track);
  });
}

/** Removes `notes` from the clip as one undo entry, flushes, and clears them from the selection. */
function deleteNotes(track: MidiTrack, clip: MidiClip, notes: Iterable<MidiNote>) {
  const toDelete = [...notes];
  if (toDelete.length === 0) {
    return;
  }
  history.record("delete notes", () => {
    for (const note of toDelete) {
      midiBuffer.removeNote(clip.buffer, note);
    }
    clip.buffer.clearCache();
    clip.notifyChange();
    midiTrack.flushAllClipStateToProcessor(track);
  });
  // dangling refs to removed notes; the notes are gone so nothing stays selected
  clip.selectedNotes.clear();
}

/** Nudges the clip's currently selected notes by (deltaTick, deltaNumber) — used by keyboard arrows. */
function moveSelectedNotes(track: MidiTrack, clip: MidiClip, deltaTick: number, deltaNumber: number) {
  const moves = new Map<MidiNote, NoteT>();
  for (const note of clip.selectedNotes) {
    moves.set(note, note.t);
  }
  moveNotes(track, clip, moves, deltaTick, deltaNumber);
}

export const midiClip = {
  addNote,
  findNote,
  removeNote,
  findNotesInRange,
  moveNotes,
  resizeNotes,
  moveSelectedNotes,
  deleteNotes,
  clampNoteMove,
  createSampleMidiClip() {
    const newClip = MidiClip.of("new midi clip", 0, 96, []);
    for (const note of SAMPLE_MIDI.clips.default.notes) {
      midiClip.addNote(newClip, note.tick, note.number, note.duration, note.velocity);
    }
    return newClip;
  },
};

export function sequencerClipOfMidiClip(clip: MidiClip) {
  return {
    id: clip._id,
    muted: clip.muted.get(),
    notes: clip.buffer.notes._getRaw().map((note) => note.t),
    startOffsetPulses: clip.timelineStart.ensurePulses(),
    endOffsetPulses: clip._timelineEndU,
  };
}
