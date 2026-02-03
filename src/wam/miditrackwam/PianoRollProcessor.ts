import type {
  AudioWorkletGlobalScope,
  WamEvent,
  WamEventBase,
  WamMidiData,
  WamProcessor as WamProcessorT,
  WamTransportData,
} from "@webaudiomodules/api";
import { OrderedMap } from "../../lib/data/OrderedMap";
import type { NoteT, PianoRollProcessorMessage, SequencerMidiClip } from "../../midi/SharedMidiTypes";
import { nullthrows } from "../../utils/nullthrows";
import { MIDI, MIDIConfiguration, midiOfPartial, PPQN } from "./MIDIConfiguration";
import { MIDINoteRecorder, PianoRollClip } from "./PianoRollClip";

const MODULE_ID = "com.aykev.pianoRoll";

const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope;
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(MODULE_ID);
const WamProcessor = ModuleScope.WamProcessor; //as typeof WamProcessorT;

class PianoRollProcessor extends WamProcessor {
  _generateWamParameterInfo() {
    return {};
  }

  private lastTime: number | null = null;
  private isPlaying: boolean = false;

  private ticks: number = -1;
  private startingTicks: number = 0;

  private transportData?: WamTransportData;
  private count: number = 0;

  private readonly clips: Map<string, PianoRollClip> = new Map();
  readonly playingNotes = new Set<number>();

  // new system //

  // clip.id => clip
  private seqClips: OrderedMap<string, SequencerMidiClip> = new OrderedMap();
  private loop: readonly [number, number] | null = null;

  private pendingClipChange?: { id: string; timestamp: number };
  private currentClipId: string = "default";

  private noteRecorder: MIDINoteRecorder;

  // default config
  private midiConfig: MIDIConfiguration = {
    hostRecordingArmed: false,
    pluginRecordingArmed: false,
    inputMidiChannel: -1,
    outputMidiChannel: 0,
  };

  readonly immediateMessages: WamEventBase<"wam-midi">[] = [];

  midiEvent(bytes: number[], tickMoment?: number): WamEventBase<"wam-midi"> {
    const result: WamEventBase<"wam-midi"> = {
      type: "wam-midi",
      data: { bytes },
    } as const;
    if (tickMoment != null) {
      result.time = tickMoment;
    }
    return result;
  }

  constructor(options: { processorOptions: { moduleId: string; instanceId: string } }) {
    console.log("PIANO ROLL CONSTRUCTOR");
    super(options);

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

  _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
    const { currentTime } = audioWorkletGlobalScope;

    // Flush immediate events, immediately
    let ev;
    while ((ev = this.immediateMessages.pop())) {
      // console.log("ev", ev);
      this.emitEvents(ev);
    }

    if (this.pendingClipChange && this.pendingClipChange.timestamp <= currentTime) {
      this.currentClipId = this.pendingClipChange.id;
      this.pendingClipChange = undefined;
    }

    // let clip = this.clips.get(this.currentClipId);
    // if (!clip) {
    //   return;
    // }

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

    // Run new playback system
    if (
      this.transportData!.playing &&
      this.transportData!.currentBarStarted <= schedulerTime &&
      this.seqClips.length != 0
    ) {
      this.newSystemPlayback(schedulerTime);
    }
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
      notesForTickNew(loopedTicks, [...theClips.values()]).forEach(([ntick, nnumber, nduration, nvelocity]: NoteT) => {
        // console.log("events", tickMoment);
        this.emitEvents(
          this.midiEvent([MIDI.NOTE_ON | this.midiConfig.outputMidiChannel, nnumber, nvelocity], tickMoment),
          this.midiEvent(
            [MIDI.NOTE_OFF | this.midiConfig.outputMidiChannel, nnumber, nvelocity],
            tickMoment + nduration * secondsPerTick - 0.001,
          ),
        );
      });
    }
  }

  /**
   * Messages from main thread appear here.
   * @param {MessageEvent} message
   */
  async _onMessage(message: { data: PianoRollProcessorMessage }): Promise<void> {
    const payload = message.data;
    if (!payload) {
      return;
    }

    console.log("sequencer.general", payload);

    switch (payload.action) {
      case "clip": {
        // todo: delete, old clips message
        console.log("OLD CLIP MESSAGE");
        const clip = new PianoRollClip(payload.id, payload.state);
        this.clips.set(payload.id, clip);
        return;
      }

      case "set_clips": {
        // New clips message
        this.seqClips = new OrderedMap(new Map(payload.seqClips.map((clip) => [clip.id, clip] as const)));
        console.log("sequencer", message);
        return;
      }

      case "prepare_playback": {
        // New clips message
        this.seqClips = new OrderedMap(new Map(payload.seqClips.map((clip) => [clip.id, clip] as const)));
        this.loop = payload.loop;
        console.log("sequencer", message);
        return;
      }

      case "clip_changed": {
        if (this.seqClips.size === 0) {
          // TODO: we set this.seqClips on first playback, so
          // if a clip changes before that do nothing
          return;
        }

        this.seqClips.set(payload.clip.id, payload.clip);
        console.log("sequencer", message);
        return;
      }

      case "immEvent": {
        const midiEv = payload.event;
        switch (midiEv[0]) {
          case "off":
            this.immediateMessages.push(this.midiEvent(midiOfPartial(midiEv, this.midiConfig.outputMidiChannel)));
            break;
          case "on":
            this.immediateMessages.push(this.midiEvent(midiOfPartial(midiEv, this.midiConfig.outputMidiChannel)));
            break;
          case "alloff":
          // this.immediateMessages.push(this.midiEvent(midiOfPartial(midiEv, this.midiConfig.outputMidiChannel)));
        }
        return;
      }

      case "midiConfig": {
        const currentlyRecording = this.midiConfig.hostRecordingArmed && this.midiConfig.pluginRecordingArmed;
        const stillRecording = payload.config.hostRecordingArmed && payload.config.pluginRecordingArmed;

        if (currentlyRecording && !stillRecording) {
          this.noteRecorder.finalizeAllNotes(this.ticks);
        }

        this.midiConfig = payload.config;
        this.noteRecorder.channel = this.midiConfig.inputMidiChannel;
        return;
      }

      case "play": {
        this.pendingClipChange = {
          id: payload.id,
          timestamp: 0,
        };
        break;
      }
      case "add_note":
        // TODO UNIMPLEMENTED
        break;
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
function notesForTickNew(currMidiTick: number, simpleClips: SequencerMidiClip[]): readonly NoteT[] {
  let currentClip = null;
  for (const clip of simpleClips) {
    if (clip.startOffsetPulses <= currMidiTick && clip.endOffsetPulses >= currMidiTick) {
      currentClip = clip;
    }
  }

  if (currentClip == null) {
    return [];
  }

  if (currentClip.muted) {
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
