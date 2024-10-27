import { ensureError } from "./ensureError";

type Result<T> =
  | Readonly<{
      status: "success";
      value: T;
    }>
  | Readonly<{
      status: "error";
      error: Error;
    }>;

export class MidiDevices {
  private constructor(private midiAccess: MIDIAccess) {
    function onMIDIMessage(this: MIDIInput, ev: MIDIMessageEvent) {
      let str = `MIDI message received at timestamp ${ev.timeStamp}[${ev.data?.length} bytes]: `;
      for (const character of ev.data ?? []) {
        str += `0x${character.toString(16)} `;
      }
      console.log(str);
    }

    midiAccess.inputs.forEach((entry) => {
      entry.onmidimessage = onMIDIMessage;
    });
  }

  static async initialize(): Promise<Result<MidiDevices>> {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      return {
        status: "success",
        value: new MidiDevices(midiAccess),
      };
    } catch (e) {
      return {
        status: "error",
        error: ensureError(e),
      };
    }
  }

  async listInputsAndOutputs() {
    for (const entry of this.midiAccess.inputs) {
      const input = entry[1];
      console.log(
        `Input port [type:'${input.type}']` +
          ` id:'${input.id}'` +
          ` manufacturer:'${input.manufacturer}'` +
          ` name:'${input.name}'` +
          ` version:'${input.version}'`,
      );
    }

    for (const entry of this.midiAccess.outputs) {
      const output = entry[1];
      console.log(
        `Output port [type:'${output.type}'] id:'${output.id}' manufacturer:'${output.manufacturer}' name:'${output.name}' version:'${output.version}'`,
      );
    }
  }
}
