export class MIDI {}
MIDI.NOTE_ON = 144;
MIDI.NOTE_OFF = 128;
MIDI.CC = 176;
export const PPQN = 24;
// FROM: import { Clip, MIDINoteRecorder } from "./PianoRollClip";
export class Clip {
  constructor(id, state) {
    if (state) {
      this.state = {
        id: id || state.id,
        length: state.length,
        notes: state.notes.map((n) => {
          return Object.assign({}, n);
        }),
      };
    } else {
      this.state = {
        id: id || token(),
        length: 16 * PP16,
        notes: [
          {
            tick: 1,
            number: 20,
            duration: 10,
            velocity: 100,
          },
        ],
      };
    }
    this.dirty = true;
    this.quantize = PP16;
  }
  getState(removeId) {
    let state = {
      length: this.state.length,
      notes: this.state.notes.map((n) => {
        return Object.assign({}, n);
      }),
    };
    if (!removeId) {
      state.id = this.state.id;
    }
    return state;
  }
  async setState(state, newId) {
    if (!state.id && !newId) {
      console.error("Need an id for clip!");
      return;
    }
    this.state.id = newId ? newId : state.id;
    this.state.length = state.length;
    this.state.notes = state.notes.map((n) => {
      return Object.assign({}, n);
    });
    this.dirty = true;
    if (this.updateProcessor) this.updateProcessor(this);
  }
  hasNote(tick, number) {
    return this.state.notes.some((n) => n.tick == tick && n.number == number);
  }
  addNote(tick, number, duration, velocity) {
    this.dirty = true;
    if (this.hasNote(tick, number)) {
      return;
    }
    for (
      var insertIndex = 0;
      insertIndex < this.state.notes.length && this.state.notes[insertIndex].tick < tick;
      insertIndex++
    );
    this.state.notes = this.state.notes
      .slice(0, insertIndex)
      .concat(
        [{ tick, number, duration, velocity }].concat(this.state.notes.slice(insertIndex, this.state.notes.length)),
      );
    if (this.updateProcessor) this.updateProcessor(this);
  }
  removeNote(tick, number) {
    this.dirty = true;
    this.state.notes = this.state.notes.filter((n) => n.tick != tick || n.number != number);
    if (this.updateProcessor) this.updateProcessor(this);
  }
  notesForTick(tick) {
    return this.state.notes.filter((n) => n.tick == tick);
  }
  notesInTickRange(startTick, endTick, note) {
    return this.state.notes.filter((n) => {
      return n.number == note && n.tick + n.duration > startTick && n.tick < endTick;
    });
  }
  setRenderFlag(dirty) {
    this.dirty = dirty;
  }
  setQuantize(quantize) {
    if (this.quantize != quantize) {
      this.dirty = true;
    }
    this.quantize = quantize;
  }
  needsRender() {
    return this.dirty;
  }
}
export class MIDINoteRecorder {
  constructor(getClip, addNote) {
    this.getClip = getClip;
    this.addNote = addNote;
    this.states = [];
    for (let i = 0; i < 128; i++) {
      this.states.push({});
    }
    this.channel = -1;
  }
  onMIDI(event, timestamp) {
    let isNoteOn = (event[0] & 240) == MIDI.NOTE_ON;
    let isNoteOff = (event[0] & 240) == MIDI.NOTE_OFF;
    // check channel
    if ((isNoteOn || isNoteOff) && this.channel != -1 && (event[0] & 15) != this.channel) {
      isNoteOn = false;
      isNoteOff = false;
    }
    if (isNoteOn && event[2] == 0) {
      // treat note on with 0 velocity as note off (it's a thing)
      isNoteOn = false;
      isNoteOff = true;
    }
    const state = this.states[event[1]];
    const tick = this.getTick(timestamp);
    if (isNoteOff && state.onTick !== undefined) {
      this.finalizeNote(event[1], tick);
    }
    if (isNoteOn && state.onTick !== undefined) {
      this.finalizeNote(event[1], tick);
    }
    if (isNoteOn) {
      this.states[event[1]] = {
        onTick: tick,
        onVelocity: event[2],
      };
    }
  }
  finalizeAllNotes(finalTick) {
    for (let i = 0; i < 128; i++) {
      if (this.states[i].onTick !== undefined) {
        this.finalizeNote(i, finalTick);
      }
    }
  }
  finalizeNote(note, tick) {
    const state = this.states[note]; // todo as any
    if (tick > state.onTick) {
      this.addNote(state.onTick, note, tick - state.onTick, state.onVelocity);
    }
    this.states[note] = {};
  }
  getTick(timestamp) {
    var timeElapsed = timestamp - this.transportData.currentBarStarted;
    var beatPosition =
      this.transportData.currentBar * this.transportData.timeSigNumerator +
      (this.transportData.tempo / 60) * timeElapsed;
    var tickPosition = Math.floor(beatPosition * PPQN);
    return tickPosition % this.getClip().state.length;
  }
}
// FROM: import { nullthrows } from "../../utils/nullthrows";
function nullthrows(val, message) {
  if (val == null) {
    throw new Error(message || `Expected ${val} to be non nil.`);
  }
  return val;
}
const MODULE_ID = "com.foo.pianoRoll";
console.log("PIANO ROLL ROOT");
const audioWorkletGlobalScope = globalThis;
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(MODULE_ID);
const WamProcessor = ModuleScope.WamProcessor;
class PianoRollProcessor extends WamProcessor {
  _generateWamParameterInfo() {
    return {};
  }
  constructor(options) {
    console.log("PIANO ROLL CONSTRUCTOR");
    // console.log("PRE");
    super(options);
    this.startingTicks = 0;
    // new system
    this.seqClips = [];
    this.loop = null;
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
      (tick, number, duration, velocity) => {
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
  _process(startSample, endSample, inputs, outputs) {
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
      this.transportData.playing &&
      this.transportData.currentBarStarted <= schedulerTime &&
      this.seqClips.length != 0
    ) {
      this.newSystemPlayback(schedulerTime);
      return;
    }
    // OLD SYSTEM? I DON'T THINK THIS RUNS ANYMORE
    if (this.transportData.playing && this.transportData.currentBarStarted <= schedulerTime) {
      const timeElapsed = schedulerTime - this.transportData.currentBarStarted;
      const beatPosition =
        this.transportData.currentBar * this.transportData.timeSigNumerator +
        (this.transportData.tempo / 60.0) * timeElapsed;
      const absoluteTickPosition = Math.floor(beatPosition * PPQN);
      let clipPosition = absoluteTickPosition % clip.state.length;
      if (this.recordingArmed && this.ticks % clip.state.length > clipPosition) {
        // we just circled back, so finalize any notes in the buffer
        this.noteRecorder.finalizeAllNotes(clip.state.length - 1);
      }
      const secondsPerTick = 1.0 / ((this.transportData.tempo / 60.0) * PPQN);
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
  newSystemPlayback(schedulerTime) {
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
      notesForTickNew(loopedTicks, theClips).forEach(([ntick, nnumber, nduration, nvelocity]) => {
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
  async _onMessage(message) {
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
  _onTransport(transportData) {
    this.transportData = transportData;
    this.noteRecorder.transportData = transportData;
    this.isPlaying = false;
    super.port.postMessage({
      event: "transport",
      transport: transportData,
    });
  }
  _onMidi(midiData) {
    var _a;
    const { currentTime } = audioWorkletGlobalScope;
    // /* eslint-disable no-lone-blocks */
    const bytes = midiData.bytes;
    if (!(this.midiConfig.pluginRecordingArmed && this.midiConfig.hostRecordingArmed)) {
      return;
    }
    if (
      !((_a = this.transportData) === null || _a === void 0 ? void 0 : _a.playing) ||
      this.transportData.currentBarStarted > currentTime
    ) {
      return;
    }
    this.noteRecorder.onMIDI(bytes, currentTime);
  }
}
try {
  audioWorkletGlobalScope.registerProcessor(MODULE_ID, PianoRollProcessor);
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn(error);
}
// todo; can be optimized by keeping track of where we are in the array during this "playback session"
function notesForTickNew(currMidiTick, simpleClips) {
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
