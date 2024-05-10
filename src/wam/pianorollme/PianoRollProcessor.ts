import type { AudioWorkletGlobalScope, WamMidiData, WamTransportData } from "@webaudiomodules/api";
import type { Note, PianoRollProcessorMessage, SimpleMidiClip } from "../../midi/SharedMidiTypes";
import { nullthrows } from "../../utils/nullthrows";
import { MIDI, MIDIConfiguration, PPQN } from "./MIDIConfiguration";
import { Clip, MIDINoteRecorder } from "./PianoRollClip";

const MODULE_ID = "com.foo.pianoRoll";

console.log("PIANO ROLL ROOT");

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope;
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(MODULE_ID);
const WamProcessor = ModuleScope.WamProcessor;

class PianoRollProcessor extends WamProcessor {
  _generateWamParameterInfo() {
    return {};
  }

  lastTime: number | null;
  isPlaying: boolean;

  ticks: number;
  startingTicks: number = 0;

  transportData?: WamTransportData;
  count: number;

  clips: Map<string, Clip>;
  // new system
  seqClips: SimpleMidiClip[] = [];
  loop: readonly [number, number] | null = null;

  pendingClipChange?: { id: string; timestamp: number };
  currentClipId: string;

  noteRecorder: MIDINoteRecorder;
  midiConfig: MIDIConfiguration;

  constructor(options: { processorOptions: { moduleId: string; instanceId: string } }) {
    console.log("PIANO ROLL CONSTRUCTOR");
    // console.log("PRE");
    super(options);

    const { moduleId, instanceId } = options.processorOptions;

    this.lastTime = null;
    this.ticks = -1;
    this.clips = new Map();
    this.currentClipId = "default";
    this.count = 0;
    this.isPlaying = false;
    this.midiConfig = {
      hostRecordingArmed: false,
      pluginRecordingArmed: false,
      inputMidiChannel: -1,
      outputMidiChannel: 0,
    };

    this.noteRecorder = new MIDINoteRecorder(
      () => {
        return nullthrows(this.clips.get(this.currentClipId));
      },
      (tick: number, number: number, duration: number, velocity: number) => {
        super.port.postMessage({ event: "addNote", note: { tick, number, duration, velocity } });
      },
    );

    super.port.start();
  }

  /**
   * Implement custom DSP here.
   * @param {number} startSample beginning of processing slice
   * @param {number} endSample end of processing slice
   * @param {Float32Array[][]} inputs
   * @param {Float32Array[][]} outputs
   */
  _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
    const { currentTime } = audioWorkletGlobalScope;

    if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
      this.currentClipId = this.pendingClipChange.id;
      this.pendingClipChange = undefined;
    }

    let clip = this.clips.get(this.currentClipId);
    if (!clip) {
      return;
    }
    if (!this.transportData) {
      return;
    }

    const transportData = nullthrows(this.transportData, "no transport dataa");

    // lookahead
    const schedulerTime = currentTime + 0.05;

    // kevin: this is called all the time, as soon as we initialize apparently. I think that's just how
    // I run the audio context? In any case, the "wam-transport" event just sets isPlaying = true
    // did we just start playing? set ticks to the beginning of 'currentBar'
    if (!this.isPlaying && transportData.playing && transportData.currentBarStarted <= currentTime) {
      this.isPlaying = true;

      // current position in ticks = (current bar * beats per bar) * (ticks per beat) % (clip length in ticks)
      this.startingTicks = transportData.currentBar * transportData.timeSigNumerator * PPQN;

      // rewind one tick so that on our first loop we process notes for the first tick
      this.ticks = Math.floor(this.startingTicks - 1);
    }

    if (!this.transportData.playing && this.isPlaying) {
      this.isPlaying = false;
    }

    // console.log(this.transportData!.playing, this.transportData!.currentBarStarted <= schedulerTime);

    if (
      this.transportData!.playing &&
      this.transportData!.currentBarStarted <= schedulerTime &&
      this.seqClips.length != 0
    ) {
      this.newSystemPlayback(schedulerTime);
      return;
    }

    // OLD SYSTEM? I DON'T THINK THIS RUNS ANYMORE
    if (this.transportData!.playing && this.transportData!.currentBarStarted <= schedulerTime) {
      const timeElapsed = schedulerTime - this.transportData!.currentBarStarted;
      const beatPosition =
        this.transportData!.currentBar * this.transportData!.timeSigNumerator +
        (this.transportData!.tempo / 60.0) * timeElapsed;
      const absoluteTickPosition = Math.floor(beatPosition * PPQN);

      let clipPosition = absoluteTickPosition % clip.state.length;

      if (this.recordingArmed && this.ticks % clip.state.length > clipPosition) {
        // we just circled back, so finalize any notes in the buffer
        this.noteRecorder.finalizeAllNotes(clip.state.length - 1);
      }

      const secondsPerTick = 1.0 / ((this.transportData!.tempo / 60.0) * PPQN);

      console.log("ticks", this.ticks);

      while (this.ticks < absoluteTickPosition) {
        this.ticks = this.ticks + 1;

        const tickMoment = this.transportData.currentBarStarted + (this.ticks - this.startingTicks) * secondsPerTick;

        clip.notesForTick(this.ticks % clip.state.length).forEach((note) => {
          this.emitEvents(
            {
              type: "wam-midi",
              time: tickMoment,
              data: { bytes: [MIDI.NOTE_ON | this.midiConfig.outputMidiChannel, note.number, note.velocity] },
            },
            {
              type: "wam-midi",
              time: tickMoment + note.duration * secondsPerTick - 0.001,
              data: { bytes: [MIDI.NOTE_OFF | this.midiConfig.outputMidiChannel, note.number, note.velocity] },
            },
          );
        });
      }
    }

    return;
  }

  // schedulerTime:
  // - ever increasing timer, in seconds. Total time web audio has been playing? I keep it playing even when timeline is paused.
  // - looks into the future. not current playback, but up to where we want to schedule
  private newSystemPlayback(schedulerTime: number) {
    const clipLength = 96; // todo, clip length in PPQN units // clip.state.length
    const theClips = this.seqClips;
    const transportData = nullthrows(this.transportData, "no transport data");
    const startingTicks = this.startingTicks; // where we started playback in the timeline

    // seconds since playback started, without accounting for loop
    const timeElapsed = schedulerTime - transportData.currentBarStarted;
    const beatPosition =
      transportData.currentBar * transportData.timeSigNumerator + (transportData.tempo / 60.0) * timeElapsed;

    // absolute tick (pulse) position in track, without accounting for looping
    const absoluteTickPosition = Math.floor(beatPosition * PPQN);

    const clipPosition = absoluteTickPosition % clipLength; // remove `% clipLength`. But unimportant for now, only used when recordingArmed
    const currMidiPulse = this.ticks; // % clipLength; // todo, remove `% clipLength`, add offset

    if (this.recordingArmed && currMidiPulse > clipPosition) {
      // we just circled back, so finalize any notes in the buffer
      this.noteRecorder.finalizeAllNotes(clipLength - 1);
    }

    const secondsPerTick = 1.0 / ((transportData.tempo / 60.0) * PPQN);

    // console.log(currMidiPulse, "->", absoluteTickPosition);
    const loopStart = this.loop == null ? null : this.loop[0];
    const loopEnd = this.loop == null ? null : this.loop[1];

    console.log("Hello");

    // console.log("startingTikcs", this.startingTicks);
    while (this.ticks < absoluteTickPosition) {
      // update ticks
      this.ticks = this.ticks + 1;

      const loopedTicks =
        loopEnd != null &&
        loopStart != null &&
        //  in the loop
        this.ticks - loopStart > 0
          ? ((this.ticks - loopStart) % (loopEnd - loopStart)) + loopStart
          : this.ticks;
      // const loopTime = (currentTimeInBuffer - loopStart) % (loopEnd - loopStart);

      // console.log("ticks", this.ticks, "loopedTicks", loopedTicks);
      // note: schedule based on real ticks, not looped ticks
      const tickMoment = transportData.currentBarStarted + (this.ticks - startingTicks) * secondsPerTick;

      // console.log(loopedTicks, tickMoment);
      notesForTickNew(loopedTicks, theClips).forEach(([ntick, nnumber, nduration, nvelocity]: Note) => {
        // console.log("events", tickMoment);
        this.emitEvents(
          {
            type: "wam-midi",
            time: tickMoment,
            data: { bytes: [MIDI.NOTE_ON | this.midiConfig.outputMidiChannel, nnumber, nvelocity] },
          },
          {
            type: "wam-midi",
            time: tickMoment + nduration * secondsPerTick - 0.001,
            data: { bytes: [MIDI.NOTE_OFF | this.midiConfig.outputMidiChannel, nnumber, nvelocity] },
          },
        );
      });
    }
  }

  /**
   * Messages from main thread appear here.
   * @param {MessageEvent} message
   */
  async _onMessage(message: { data: PianoRollProcessorMessage }): Promise<void> {
    if (!message.data) {
      return;
    }

    switch (message.data.action) {
      case "clip": {
        console.log("OLD CLIP MESSAGE");
        let clip = new Clip(message.data.id, message.data.state);
        this.clips.set(message.data.id, clip);
        return;
      }

      case "prepare_playback": {
        // New clips message
        const { seqClips, loop } = message.data;
        this.seqClips = seqClips;
        this.loop = loop;
        console.log(message);
        return;
      }

      case "midiConfig": {
        const currentlyRecording = this.midiConfig.hostRecordingArmed && this.midiConfig.pluginRecordingArmed;
        const stillRecording = message.data.config.hostRecordingArmed && message.data.config.pluginRecordingArmed;

        if (currentlyRecording && !stillRecording) {
          this.noteRecorder.finalizeAllNotes(this.ticks);
        }

        this.midiConfig = message.data.config;
        this.noteRecorder.channel = this.midiConfig.inputMidiChannel;
        return;
      }

      case "play": {
        this.pendingClipChange = {
          id: message.data.id,
          timestamp: 0,
        };
        break;
      }
      default:
        super._onMessage(message);
        break;
    }
  }

  _onTransport(transportData: WamTransportData) {
    this.transportData = transportData;
    this.noteRecorder.transportData = transportData;
    this.isPlaying = false;

    super.port.postMessage({
      event: "transport",
      transport: transportData,
    });
  }

  _onMidi(midiData: WamMidiData) {
    const { currentTime } = audioWorkletGlobalScope;

    // /* eslint-disable no-lone-blocks */
    const bytes = midiData.bytes;
    if (!(this.midiConfig.pluginRecordingArmed && this.midiConfig.hostRecordingArmed)) {
      return;
    }
    if (!this.transportData?.playing || this.transportData!.currentBarStarted > currentTime) {
      return;
    }

    this.noteRecorder.onMIDI(bytes, currentTime);
  }
}

try {
  audioWorkletGlobalScope.registerProcessor(MODULE_ID, PianoRollProcessor as typeof WamProcessor);
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn(error);
}

// todo; can be optimized by keeping track of where we are in the array during this "playback session"
function notesForTickNew(currMidiTick: number, simpleClips: SimpleMidiClip[]): readonly Note[] {
  let currentClip = null;
  for (const clip of simpleClips) {
    if (clip.startOffsetPulses <= currMidiTick && clip.endOffsetPulses >= currMidiTick) {
      currentClip = clip;
    }
  }

  if (currentClip == null) {
    return [];
  }

  const notesToPlay = [];

  for (let i = 0; i < currentClip.notes.length; i++) {
    const [ntick] = currentClip.notes[i];

    if (currentClip.startOffsetPulses + ntick < currMidiTick) {
      // in the past
      continue;
    }

    if (currentClip.startOffsetPulses + ntick === currMidiTick) {
      notesToPlay.push(currentClip.notes[i]);
    }

    if (currentClip.startOffsetPulses + ntick > currMidiTick) {
      // in the future
      // notes are ordered by start, so we can exit early
      break;
    }
  }

  return notesToPlay;
}
