import { history } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../constants";
import { clamp } from "../utils/math";
import { midiBuffer } from "./MidiBuffer";
import { MidiClip } from "./MidiClip";
import { MidiNote, mnote } from "./MidiNote";
import { MidiTrack, midiTrack } from "./MidiTrack";
import { SAMPLE_MIDI } from "./SAMPLE_MIDI";
import type { NoteT, SequencerMidiClip } from "./SharedMidiTypes";
import { AudioProject } from "../lib/project/AudioProject";
import { secsToPulses, TimeUnit, TimelineT } from "../lib/project/TimelineT";
import { standardTrack } from "../lib/StandardTrack";

function addNote(clip: MidiClip, tick: number, num: number, duration: number, velocity: number): MidiNote {
  const note = mnote([tick, num, duration, velocity]);
  midiBuffer.addOrderedNote(clip.buffer, note);
  clip.buffer.clearCache();
  clip.notifyChange();
  return note;
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
/**
 * Enforces the per-pitch "note-off before note-on" invariant by carving `note`'s span out of any
 * same-pitch notes it overlaps (except those in `keep`, e.g. the group being moved together).
 * `note` always wins. An overlapped note is:
 *  - truncated to end at `note`'s start when it starts earlier (its tail past `note` is dropped, not split),
 *  - moved to start at `note`'s end when it starts inside `note` but extends past it,
 *  - or removed when `note` fully covers it.
 * Truncation keeps the note's tick, so the buffer stays sorted; the start-shift case removes and
 * re-inserts (via addOrderedNote) to preserve ordering.
 */
function carveOverlaps(clip: MidiClip, keep: { has(note: MidiNote): boolean }, note: MidiNote) {
  const nStart = note.tick;
  const nEnd = note.tick + note.duration;
  const truncate: Array<[MidiNote, number]> = [];
  const remove: MidiNote[] = [];
  const readd: NoteT[] = [];
  for (const other of clip.buffer.notes._getRaw()) {
    if (other === note || keep.has(other) || other.number !== note.number) {
      continue;
    }
    const oStart = other.tick;
    const oEnd = other.tick + other.duration;
    if (oEnd <= nStart || oStart >= nEnd) {
      continue; // no overlap (half-open ranges: touching at a boundary is fine)
    }
    if (oStart < nStart) {
      // starts before `note`: turn it off where `note` turns on, dropping any tail past nStart
      truncate.push([other, nStart - oStart]);
    } else if (oEnd > nEnd) {
      // starts inside `note` and extends past it: keep only the portion after `note`
      remove.push(other);
      readd.push([nEnd, other.number, oEnd - nEnd, other.velocity]);
    } else {
      // fully covered by `note`
      remove.push(other);
    }
  }
  for (const [other, duration] of truncate) {
    other.duration = duration;
  }
  for (const other of remove) {
    midiBuffer.removeNote(clip.buffer, other);
  }
  for (const t of readd) {
    midiBuffer.addOrderedNote(clip.buffer, mnote(t));
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
      carveOverlaps(clip, moves, note);
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
      carveOverlaps(clip, sizes, note);
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

export const NOTE_MIN_VELOCITY = 1;
export const NOTE_MAX_VELOCITY = 127;
/**
 * Sets the velocity of every note in `velocities` by `deltaVelocity` relative to each note's own
 * start velocity (the map value is its original `[tick, number, duration, velocity]`). Records one
 * undo entry and flushes. Like `moveNotes`, it reverts any live-preview change first so undo
 * captures the true original -> final change.
 */
function setVelocities(
  track: MidiTrack,
  clip: MidiClip,
  velocities: ReadonlyMap<MidiNote, NoteT>,
  deltaVelocity: number,
) {
  for (const [note, orig] of velocities) {
    note.velocity = orig[3];
  }
  if (velocities.size === 0 || deltaVelocity === 0) {
    return;
  }
  history.record("set velocity", () => {
    for (const [note, orig] of velocities) {
      note.velocity = clamp(NOTE_MIN_VELOCITY, orig[3] + deltaVelocity, NOTE_MAX_VELOCITY);
    }
    clip.buffer.clearCache();
    clip.notifyChange();
    midiTrack.flushAllClipStateToProcessor(track);
  });
}

/**
 * Adds `notesT` to the clip and carves them into any same-pitch notes they overlap (the new notes
 * win; they don't carve each other). No history — callers wrap in history.record. Returns the
 * created notes.
 */
function addNotes(clip: MidiClip, notesT: Iterable<NoteT>): MidiNote[] {
  const created: MidiNote[] = [];
  for (const [tick, num, duration, velocity] of notesT) {
    const note = mnote([Math.max(0, tick), num, duration, velocity]);
    midiBuffer.addOrderedNote(clip.buffer, note);
    created.push(note);
  }
  const keep = new Set(created);
  for (const note of created) {
    carveOverlaps(clip, keep, note);
  }
  clip.buffer.clearCache();
  clip.notifyChange();
  return created;
}

/**
 * Duplicates the clip's selected notes, tiling the copies immediately after the selection (shifted
 * by the selection's tick span), then selects the copies. One undo entry.
 */
function duplicateNotes(track: MidiTrack, clip: MidiClip) {
  const originals = [...clip.selectedNotes].map((n) => n.t);
  if (originals.length === 0) {
    return;
  }
  const minTick = Math.min(...originals.map((t) => t[0]));
  const maxEnd = Math.max(...originals.map((t) => t[0] + t[2]));
  const shift = maxEnd - minTick;
  let created: MidiNote[] = [];
  history.record("duplicate notes", () => {
    created = addNotes(
      clip,
      originals.map(([tick, num, dur, vel]) => [tick + shift, num, dur, vel] as NoteT),
    );
    midiTrack.flushAllClipStateToProcessor(track);
  });
  clip.selectedNotes._replace(() => new Set(created));
}

/**
 * Pastes `notesT` into the clip at the playhead (clip-relative), preserving the notes' relative
 * layout (the earliest note lands at the playhead), then selects them. One undo entry.
 */
function pasteNotes(project: AudioProject, track: MidiTrack, clip: MidiClip, notesT: ReadonlyArray<NoteT>) {
  if (notesT.length === 0) {
    return;
  }
  const minTick = Math.min(...notesT.map((t) => t[0]));
  const cursorPulses = secsToPulses(project.cursorPos.get(), project.tempo.get());
  const pasteTick = Math.max(0, cursorPulses - clip.timelineStart.pulses(project));
  const shift = pasteTick - minTick;
  let created: MidiNote[] = [];
  history.record("paste notes", () => {
    created = addNotes(
      clip,
      notesT.map(([tick, num, dur, vel]) => [tick + shift, num, dur, vel] as NoteT),
    );
    midiTrack.flushAllClipStateToProcessor(track);
  });
  project.secondarySelection.set({ status: "notes", clip, track });
  clip.selectedNotes._replace(() => new Set(created));
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
  setVelocities,
  duplicateNotes,
  pasteNotes,
  addNotes,
  clampNoteMove,
  createSampleMidiClip() {
    const newClip = MidiClip.of("new midi clip", 0, 96, []);
    for (const note of SAMPLE_MIDI.clips.default.notes) {
      midiClip.addNote(newClip, note.tick, note.number, note.duration, note.velocity);
    }
    return newClip;
  },
};

export function sequencerClipOfMidiClip(clip: MidiClip): SequencerMidiClip {
  return {
    id: clip._id,
    muted: clip.muted.get(),
    notes: clip.buffer.notes._getRaw().map((note) => note.t),
    startOffsetPulses: clip.timelineStart.ensurePulses(),
    endOffsetPulses: clip._timelineEndU,
  };
}
