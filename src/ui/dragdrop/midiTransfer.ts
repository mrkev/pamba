import midiFile from "midi-file";
import { note, Note } from "../../midi/SharedMidiTypes";
import { MidiTransfer } from "./getTrackAcceptableDataTransferResources";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";

// midiFile.parseMidi()

export async function midiClipsOfMidiFile(file: File): Promise<MidiTransfer | null> {
  const arrayBuffer = await file.arrayBuffer();
  const midiData = midiFile.parseMidi(new Uint8Array(arrayBuffer));

  // todo: time conversion
  const toLocalPulses = (filePulses: number) =>
    midiData.header.ticksPerBeat ? Math.floor((filePulses * PPQN) / midiData.header.ticksPerBeat) : filePulses;

  const clips = [];
  for (let t = 0; t < midiData.tracks.length; t++) {
    const track = midiData.tracks[t];
    let trackName = `midi_track_${t}`;
    const wipNotes = new Map<number, { tick: number; num: number; velocity: number }>();
    const notes: Note[] = [];

    let time = 0;
    for (const event of track) {
      time += event.deltaTime;

      switch (event.type) {
        case "trackName": {
          trackName = event.text;
          break;
        }
        case "noteOn": {
          if (wipNotes.has(event.noteNumber)) {
            console.warn("two noteons for note", event.noteNumber);
            continue;
          }

          // todo: what's up with these?
          // event.channel
          // event.running
          // event.byte9
          wipNotes.set(event.noteNumber, {
            tick: time,
            num: event.noteNumber,
            velocity: event.velocity,
          });
          break;
        }

        case "noteOff": {
          const noteOn = wipNotes.get(event.noteNumber);
          if (noteOn == null) {
            console.warn("noteoff with no noteon", event.noteNumber);
            continue;
          }

          notes.push(note(toLocalPulses(noteOn.tick), noteOn.num, toLocalPulses(time - noteOn.tick), noteOn.velocity));
          wipNotes.delete(event.noteNumber);
          break;
        }
      }
    }

    clips.push({ name: trackName, notes });

    console.log(trackName, trackName, notes, wipNotes);
  }
  return { kind: "miditransfer", tracks: clips } as const;
}
