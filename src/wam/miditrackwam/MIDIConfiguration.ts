import { exhaustive } from "../../utils/exhaustive";

export type MIDIConfiguration = {
  hostRecordingArmed: boolean;
  pluginRecordingArmed: boolean;
  inputMidiChannel: number;
  outputMidiChannel: number;
};

export type PartialMIDI =
  | ["on", note: number, velocity: number]
  | ["off", note: number, velocity: number]
  | ["cc", number: number, value: number]
  | ["alloff"];

export function midiOfPartial(partial: PartialMIDI, channel: number) {
  switch (partial[0]) {
    case "on": {
      const [_, note, velocity] = partial;
      return MIDI.noteOn(channel, note, velocity);
    }
    case "off": {
      const [_, note, velocity] = partial;
      return MIDI.noteOff(channel, note, velocity);
    }
    case "cc": {
      const [_, num, value] = partial;
      return MIDI.cc(channel, num, value);
    }
    case "alloff": {
      return MIDI.alloff(channel);
    }
    default:
      exhaustive(partial);
  }
}

export class MIDI {
  static NOTE_ON = 144;
  static NOTE_OFF = 128;
  static CC = 176;
  static ALL_NOTES_OFF = 123; // http://midi.teragonaudio.com/tech/midispec/ntnoff.htm

  static noteOn(channel: number, note: number, velocity: number) {
    return [MIDI.NOTE_ON | channel, note, velocity];
  }

  static noteOff(channel: number, note: number, velocity: number) {
    return [MIDI.NOTE_OFF | channel, note, velocity];
  }

  static cc(channel: number, num: number, value: number) {
    return [MIDI.CC | channel, num, value];
  }

  static alloff(channel: number) {
    return [MIDI.ALL_NOTES_OFF | channel, 0];
  }

  static kind(type: PartialMIDI[0]) {
    switch (type) {
      case "cc":
        return MIDI.CC;
      case "off":
        return MIDI.NOTE_OFF;
      case "on":
        return MIDI.NOTE_ON;
      case "alloff":
        return MIDI.ALL_NOTES_OFF;
      default:
        exhaustive(type);
    }
  }
}

export function token() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(0, 16);
}

// pulses per quarter note (beat)
export const PPQN = 24;
// pulses per 16th note
export const PP16 = PPQN / 4;

// todo: technically calculated using time signature
export const ONE_BAR_PULSES = PPQN * 4;
