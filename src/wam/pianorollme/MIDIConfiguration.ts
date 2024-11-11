import { exhaustive } from "../../utils/exhaustive";

export type MIDIConfiguration = {
  hostRecordingArmed: boolean;
  pluginRecordingArmed: boolean;
  inputMidiChannel: number;
  outputMidiChannel: number;
};

export class MIDI {
  static NOTE_ON = 144;
  static NOTE_OFF = 128;
  static CC = 176;
  static kind(type: "on" | "off" | "cc") {
    switch (type) {
      case "cc":
        return MIDI.CC;
      case "off":
        return MIDI.NOTE_OFF;
      case "on":
        return MIDI.NOTE_ON;
      default:
        exhaustive(type);
    }
  }
}

export type MIDIEvent = Uint8Array;
export type ScheduledMIDIEvent = {
  event: MIDIEvent;
  time: number;
};

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
