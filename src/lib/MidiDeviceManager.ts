import { MarkedMap, MarkedSet } from "marked-subbable";
import { result, Result } from "../result";
import { EventEmitter } from "./EventEmitter";

/**
 * Handles midi devices at the app environment level.
 * For project-specific midi, see ProjectMidi
 */
export class MidiDeviceManager {
  readonly inputs = MarkedMap.create<string, MIDIInput>();
  readonly outputs = MarkedMap.create<string, MIDIOutput>();

  // the midi devices we're listening to
  readonly activeInputs = MarkedSet.create<string>();
  readonly events = new EventEmitter<{
    midimessage: (e: MIDIMessageEvent) => void;
  }>();

  listen(port: MIDIInput) {
    this.activeInputs.add(port.id);
    port.addEventListener("midimessage", this.emitMidiMessage);
  }

  stopListening(port: MIDIInput) {
    this.activeInputs.delete(port.id);
    port.removeEventListener("midimessage", this.emitMidiMessage);
  }

  //////////////////////// Initialization and setup

  private constructor(
    //
    private readonly midiAccess: MIDIAccess,
  ) {
    for (const [id, port] of this.midiAccess.inputs) {
      this.inputs.set(id, port);
      this.activeInputs.add(port.id); // listen by default
      port.addEventListener("midimessage", this.emitMidiMessage);
    }
    for (const [id, output] of this.midiAccess.outputs) {
      this.outputs.set(id, output);
    }
    // TODO: destruct?
    this.midiAccess.addEventListener("statechange", this.updateInputsOutputs.bind(this));
  }

  static async initialize(): Promise<Result<MidiDeviceManager>> {
    try {
      const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      return result.success(new MidiDeviceManager(midiAccess));
    } catch (e) {
      return result.error(e);
    }
  }

  private emitMidiMessage = (e: MIDIMessageEvent) => {
    // don't need since we unsubscribe from devices we're not listening to
    // const src = e.target as MIDIPort;
    // if (!this.activeInputs.has(src.id)) {
    //   return;
    // }
    this.events.emit("midimessage", e);
  };

  private updateInputsOutputs(event: MIDIConnectionEvent) {
    const port = event.port;
    if (port instanceof MIDIInput) {
      if (port.state === "connected") {
        this.inputs.set(port.id, port);
        this.activeInputs.add(port.id); // listen by default
        port.addEventListener("midimessage", this.emitMidiMessage);
      } else {
        this.inputs.delete(port.id);
        this.activeInputs.delete(port.id);
        port.removeEventListener("midimessage", this.emitMidiMessage);
      }
    }

    if (port instanceof MIDIOutput) {
      if (port.state === "connected") {
        this.outputs.set(port.id, port);
      } else {
        this.outputs.delete(port.id);
      }
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
