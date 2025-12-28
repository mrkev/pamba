export type MIDIMessage =
  | NoteOnMessage
  | NoteOffMessage
  | KeyPressureMessage
  | ControlChangeMessage
  | ProgramChangeMessage
  | ChannelPressureMessage
  | PitchBendMessage;

interface BaseMessage {
  channel: number;
  type: string;
}

export interface NoteOnMessage extends BaseMessage {
  type: "noteon";
  key: number;
  velocity: number;
}

export interface NoteOffMessage extends BaseMessage {
  type: "noteoff";
  key: number;
  velocity: number;
}

export interface KeyPressureMessage extends BaseMessage {
  type: "keypressure";
  key: number;
  pressure: number;
}

export type ChannelModeMessage =
  | "allsoundoff"
  | "resetallcontrollers"
  | "localcontroloff"
  | "localcontrolon"
  | "allnotesoff"
  | "omnimodeoff"
  | "omnimodeon"
  | "monomodeon"
  | "polymodeon";

export interface ControlChangeMessage extends BaseMessage {
  type: "controlchange";
  controllerNumber: number;
  controllerValue: number;
  channelModeMessage?: ChannelModeMessage;
}

export interface ProgramChangeMessage extends BaseMessage {
  type: "programchange";
  program: number;
}

export interface ChannelPressureMessage extends BaseMessage {
  type: "channelpressure";
  pressure: number;
}

export interface PitchBendMessage extends BaseMessage {
  type: "pitchbendchange";
  pitchBend: number;
}

export function parseMIDIMessage(data: Uint8Array | null): MIDIMessage | null {
  if (data == null || data.length < 2) {
    console.warn("Invalid MIDI message length:", data?.length);
    return null;
  }

  const status = data[0];
  const messageCode = status & 0xf0;
  const channel = (status & 0x0f) + 1;

  switch (messageCode) {
    case 0x80:
      return {
        type: "noteoff",
        channel,
        key: data[1] & 0x7f,
        velocity: data[2] & 0x7f,
      };

    case 0x90:
      return {
        type: "noteon",
        channel,
        key: data[1] & 0x7f,
        velocity: data[2] & 0x7f,
      };

    case 0xa0:
      return {
        type: "keypressure",
        channel,
        key: data[1] & 0x7f,
        pressure: data[2] & 0x7f,
      };

    case 0xb0: {
      const controllerNumber = data[1] & 0x7f;
      const controllerValue = data[2] & 0x7f;

      return {
        type: "controlchange",
        channel,
        controllerNumber,
        controllerValue,
        channelModeMessage: resolveChannelMode(controllerNumber, controllerValue),
      };
    }

    case 0xc0:
      return {
        type: "programchange",
        channel,
        program: data[1],
      };

    case 0xd0:
      return {
        type: "channelpressure",
        channel,
        pressure: data[1] & 0x7f,
      };

    case 0xe0: {
      const lsb = data[1] & 0x7f;
      const msb = data[2] & 0x7f;
      return {
        type: "pitchbendchange",
        channel,
        pitchBend: (msb << 7) + lsb,
      };
    }

    default:
      return null;
  }
}

function resolveChannelMode(controller: number, value: number): ChannelModeMessage | undefined {
  if (controller === 120 && value === 0) return "allsoundoff";
  if (controller === 121) return "resetallcontrollers";
  if (controller === 122) return value === 0 ? "localcontroloff" : "localcontrolon";
  if (controller === 123 && value === 0) return "allnotesoff";
  if (controller === 124 && value === 0) return "omnimodeoff";
  if (controller === 125 && value === 0) return "omnimodeon";
  if (controller === 126) return "monomodeon";
  if (controller === 127) return "polymodeon";
  return undefined;
}

export function noteon(channel: number, key: number, velocity: number): NoteOnMessage {
  return {
    type: "noteon",
    channel,
    key,
    velocity,
  };
}

export function noteoff(channel: number, key: number, velocity: number): NoteOffMessage {
  return {
    type: "noteoff",
    channel,
    key,
    velocity,
  };
}

export function keypressure(channel: number, key: number, pressure: number): KeyPressureMessage {
  return {
    type: "keypressure",
    channel,
    key,
    pressure,
  };
}

export function controlchange(
  channel: number,
  controllerNumber: number,
  controllerValue: number,
  channelModeMessage?: ChannelModeMessage,
): ControlChangeMessage {
  return {
    type: "controlchange",
    channel,
    controllerNumber,
    controllerValue,
    channelModeMessage,
  };
}

export function programchange(channel: number, program: number): ProgramChangeMessage {
  return {
    type: "programchange",
    channel,
    program,
  };
}

export function channelpressure(channel: number, pressure: number): ChannelPressureMessage {
  return {
    type: "channelpressure",
    channel,
    pressure,
  };
}

export function pitchbendchange(channel: number, pitchBend: number): PitchBendMessage {
  return {
    type: "pitchbendchange",
    channel,
    pitchBend,
  };
}

export const channelMode = {
  allSoundOff: (channel: number): ControlChangeMessage => controlchange(channel, 120, 0, "allsoundoff"),
  resetAllControllers: (channel: number): ControlChangeMessage => controlchange(channel, 121, 0, "resetallcontrollers"),
  localControlOff: (channel: number): ControlChangeMessage => controlchange(channel, 122, 0, "localcontroloff"),
  localControlOn: (channel: number): ControlChangeMessage => controlchange(channel, 122, 127, "localcontrolon"),
  allNotesOff: (channel: number): ControlChangeMessage => controlchange(channel, 123, 0, "allnotesoff"),
  omniModeOff: (channel: number): ControlChangeMessage => controlchange(channel, 124, 0, "omnimodeoff"),
  omniModeOn: (channel: number): ControlChangeMessage => controlchange(channel, 125, 0, "omnimodeon"),
  monoModeOn: (channel: number): ControlChangeMessage => controlchange(channel, 126, 0, "monomodeon"),
  polyModeOn: (channel: number): ControlChangeMessage => controlchange(channel, 127, 0, "polymodeon"),
};

export const clamp8bit = (v: number) => Math.max(0, Math.min(127, v));
