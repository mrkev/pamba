import { midiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { parseMIDIMessage } from "../MidiMessage";
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

    const armedMidiTrack = this.project.armedMidiTrack.get();
    if (armedMidiTrack == null) {
      return;
    }

    // if midi is note, send to project.armedMidiTrack
    // otherwise, use midi learn map
    switch (msg.type) {
      case "noteon":
        midiTrack.noteOn(armedMidiTrack, msg.key);
        break;
      case "noteoff":
        midiTrack.noteOff(armedMidiTrack, msg.key);
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
