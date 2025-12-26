import { WamTransportData } from "@webaudiomodules/api";
import { MIDI, PP16, PPQN, token } from "./MIDIConfiguration";

export type Note = {
  tick: number;
  number: number;
  duration: number;
  velocity: number;
};

export type ClipState = {
  id?: string;
  length: number;
  notes: Note[];
};

type NoteState = {
  onTick?: number;
  onVelocity?: number;
};

export class PianoRollClip {
  state: ClipState;
  dirty: boolean;
  quantize: number;
  updateProcessor?: (c: PianoRollClip) => void;

  constructor(id?: string, state?: ClipState) {
    if (state) {
      this.state = {
        id: id || state.id,
        length: state.length,
        notes: state.notes.map((n) => {
          return { ...n };
        }),
      };
    } else {
      this.state = {
        id: id || token(),
        length: 16 * PP16,
        notes: [
          {
            tick: 1,
            number: 20,
            duration: 10,
            velocity: 100,
          },
        ],
      };
    }

    this.dirty = true;
    this.quantize = PP16;
  }

  getState(removeId?: boolean): ClipState {
    const state: ClipState = {
      length: this.state.length,
      notes: this.state.notes.map((n) => {
        return { ...n };
      }),
    };
    if (!removeId) {
      state.id = this.state.id;
    }
    return state;
  }

  async setState(state: ClipState, newId?: string) {
    if (!state.id && !newId) {
      console.error("Need an id for clip!");
      return;
    }

    this.state.id = newId ? newId : state.id;
    this.state.length = state.length;
    this.state.notes = state.notes.map((n) => {
      return { ...n };
    });

    this.dirty = true;
    if (this.updateProcessor) this.updateProcessor(this);
  }

  hasNote(tick: number, number: number) {
    return this.state.notes.some((n) => n.tick == tick && n.number == number);
  }

  addNote(tick: number, number: number, duration: number, velocity: number) {
    this.dirty = true;

    if (this.hasNote(tick, number)) {
      return;
    }
    for (
      // eslint-disable-next-line no-var
      var insertIndex = 0;
      insertIndex < this.state.notes.length && this.state.notes[insertIndex].tick < tick;
      insertIndex++
    );

    this.state.notes = this.state.notes
      .slice(0, insertIndex)
      .concat(
        [{ tick, number, duration, velocity }].concat(this.state.notes.slice(insertIndex, this.state.notes.length)),
      );

    if (this.updateProcessor) this.updateProcessor(this);
  }

  removeNote(tick: number, number: number) {
    this.dirty = true;

    this.state.notes = this.state.notes.filter((n) => n.tick != tick || n.number != number);
    if (this.updateProcessor) this.updateProcessor(this);
  }

  notesForTick(tick: number): Note[] {
    return this.state.notes.filter((n) => n.tick == tick);
  }

  notesInTickRange(startTick: number, endTick: number, note: number): Note[] {
    return this.state.notes.filter((n) => {
      return n.number == note && n.tick + n.duration > startTick && n.tick < endTick;
    });
  }

  setRenderFlag(dirty: boolean) {
    this.dirty = dirty;
  }

  setQuantize(quantize: number) {
    if (this.quantize != quantize) {
      this.dirty = true;
    }
    this.quantize = quantize;
  }

  needsRender(): boolean {
    return this.dirty;
  }
}

export class MIDINoteRecorder {
  states: NoteState[];
  channel: number;
  transportData?: WamTransportData;

  addNote: (tick: number, number: number, duration: number, velocity: number) => void;
  getClip: () => PianoRollClip;

  constructor(
    getClip: () => PianoRollClip,
    addNote: (tick: number, number: number, duration: number, velocity: number) => void,
  ) {
    this.getClip = getClip;
    this.addNote = addNote;
    this.states = [];
    for (let i = 0; i < 128; i++) {
      this.states.push({});
    }
    this.channel = -1;
  }

  onMIDI(event: number[], timestamp: number) {
    let isNoteOn = (event[0] & 240) == MIDI.NOTE_ON;
    let isNoteOff = (event[0] & 240) == MIDI.NOTE_OFF;

    // check channel
    if ((isNoteOn || isNoteOff) && this.channel != -1 && (event[0] & 15) != this.channel) {
      isNoteOn = false;
      isNoteOff = false;
    }

    if (isNoteOn && event[2] == 0) {
      // treat note on with 0 velocity as note off (it's a thing)
      isNoteOn = false;
      isNoteOff = true;
    }

    const state = this.states[event[1]]!;

    const tick = this.getTick(timestamp);

    if (isNoteOff && state.onTick !== undefined) {
      this.finalizeNote(event[1], tick);
    }

    if (isNoteOn && state.onTick !== undefined) {
      this.finalizeNote(event[1], tick);
    }

    if (isNoteOn) {
      this.states[event[1]] = {
        onTick: tick,
        onVelocity: event[2],
      };
    }
  }

  finalizeAllNotes(finalTick: number) {
    for (let i = 0; i < 128; i++) {
      if (this.states[i].onTick !== undefined) {
        this.finalizeNote(i, finalTick);
      }
    }
  }

  finalizeNote(note: number, tick: number) {
    const state = this.states[note] as any; // todo as any

    if (tick > state.onTick) {
      this.addNote(state.onTick, note, tick - state.onTick, state.onVelocity);
    }

    this.states[note] = {};
  }

  getTick(timestamp: number) {
    const timeElapsed = timestamp - this.transportData!.currentBarStarted;
    const beatPosition =
      this.transportData!.currentBar * this.transportData!.timeSigNumerator +
      (this.transportData!.tempo / 60) * timeElapsed;
    const tickPosition = Math.floor(beatPosition * PPQN);

    return tickPosition % this.getClip().state.length;
  }
}
