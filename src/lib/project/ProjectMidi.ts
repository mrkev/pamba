import { parseMIDIMessage } from "../MidiMessage";
import { exhaustive } from "../state/Subbable";
import { AudioProject } from "./AudioProject";

export class ProjectMidi {
  constructor(
    //
    readonly project: AudioProject,
  ) {}

  onMidi(ev: MIDIMessageEvent) {
    const msg = parseMIDIMessage(ev.data);
    if (msg == null) {
      return;
    }

    console.log("message", msg);

    // if midi is note, send to project.armedMidiTrack
    // otherwise, use midi learn map
    switch (msg.type) {
      case "noteon":
        this.project.armedMidiTrack.get()?.noteOn(msg.key);
        break;
      case "noteoff":
        this.project.armedMidiTrack.get()?.noteOff(msg.key);
        break;
      case "keypressure":
      case "pitchbendchange":
      case "programchange":
      case "controlchange":
      case "channelpressure":
        break;
      default:
        exhaustive(msg);
    }
  }
}
