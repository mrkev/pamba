import { MarkedMap } from "marked-subbable";
import { result, Result } from "../result";

/**
 * Handles midi devices at the app environment level.
 * For project-specific midi, see ProjectMidi
 */
export class MidiDevices {
  readonly inputs = MarkedMap.create<string, MIDIInput>();
  readonly outputs = MarkedMap.create<string, MIDIOutput>();

  private constructor(
    //
    private readonly midiAccess: MIDIAccess,
  ) {
    this.updateInputsOutputs();
    // TODO: destruct?
    this.midiAccess.addEventListener("statechange", this.updateInputsOutputs.bind(this));
  }

  private updateInputsOutputs() {
    for (const [id, input] of this.midiAccess.inputs) {
      this.inputs.set(id, input);
    }
    for (const [id, output] of this.midiAccess.outputs) {
      this.outputs.set(id, output);
    }
  }

  static async initialize(): Promise<Result<MidiDevices>> {
    try {
      const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      return result.success(new MidiDevices(midiAccess));
    } catch (e) {
      return result.error(e);
    }
  }

  public listenToMidi(callback: (this: MIDIInput, ev: MIDIMessageEvent) => void) {
    this.midiAccess.inputs.forEach((entry) => {
      entry.addEventListener("midimessage", callback);
    });
    return () => {
      this.midiAccess.inputs.forEach((entry) => {
        entry.removeEventListener("midimessage", callback);
      });
    };
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
