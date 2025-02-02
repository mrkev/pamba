import { SMap } from "structured-state";
import { result, Result } from "./result";

export class MidiDevices {
  readonly inputs = SMap.create<string, MIDIInput>();
  readonly outputs = SMap.create<string, MIDIOutput>();

  private constructor(private midiAccess: MIDIAccess) {
    for (const [id, input] of this.midiAccess.inputs) {
      this.inputs.set(id, input);
    }

    for (const [id, output] of this.midiAccess.outputs) {
      this.outputs.set(id, output);
    }

    this.midiAccess.onstatechange = (event) => {
      // todo, some connection changed
      console.log("onstatechange", event.port?.name, event.port?.manufacturer, event.port?.state);
    };

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
      const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      return result.success(new MidiDevices(midiAccess));
    } catch (e) {
      return result.error(e);
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
