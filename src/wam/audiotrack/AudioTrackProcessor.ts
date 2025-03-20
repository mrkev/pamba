import type {
  AudioWorkletGlobalScope,
  WamEvent,
  WamEventBase,
  WamMidiData,
  WamProcessor as WamProcessorT,
  WamTransportData,
} from "@webaudiomodules/api";
import { OrderedMap } from "../../lib/data/OrderedMap";
import type { Note, PianoRollProcessorMessage, SimpleMidiClip } from "../../midi/SharedMidiTypes";
import { nullthrows } from "../../utils/nullthrows";
import { AudioTrackProcessorMessage, SimpleAudioClip } from "./SharedAudioTrackTypes";

const MODULE_ID = "com.aykev.audiotrack";
const audioWorkletGlobalScope: AudioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope;
const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(MODULE_ID);
const WamProcessor = ModuleScope.WamProcessor; // as  WamProcessorT;

class SharedAudioClip {
  // todo
}

class PianoRollProcessor extends WamProcessor {
  _generateWamParameterInfo() {
    return {};
  }

  private lastTime: number | null = null;
  private isPlaying: boolean = false;

  private ticks: number = -1;
  private startingTicks: number = 0;

  private transportData?: WamTransportData;

  readonly playingNotes = new Set<number>();
  // new system
  private seqClips: OrderedMap<string, SimpleAudioClip> = new OrderedMap();
  private loop: readonly [number, number] | null = null;

  private pendingClipChange?: { id: string; timestamp: number };
  private currentClipId: string = "default";

  constructor(options: { processorOptions: { moduleId: string; instanceId: string } }) {
    console.log("AUDIO TRACK WAM CONSTRUCTOR");
    // console.log("PRE");
    super(options);

    super.port.start();
  }

  /**
   * Messages from main thread appear here.
   * @param {MessageEvent} message
   */
  async _onMessage(message: { data: AudioTrackProcessorMessage }): Promise<void> {
    const payload = message.data;
    if (!payload) {
      return;
    }

    switch (payload.action) {
      case "set_clips": {
        // New clips message
        this.seqClips = new OrderedMap(new Map(payload.seqClips.map((clip) => [clip.id, clip] as const)));
        console.log(message);
        return;
      }

      default:
        super._onMessage(message);
        break;
    }
  }

  _onTransport(transportData: WamTransportData) {
    this.transportData = transportData;
    this.isPlaying = false;

    super.port.postMessage({
      event: "transport",
      transport: transportData,
    });
  }

  _process(startSample: number, endSample: number, inputs: Float32Array[][], outputs: Float32Array[][]) {
    const { currentTime } = audioWorkletGlobalScope;
    const { transportData } = this;
    if (transportData == null) {
      return;
    }

    // lookahead
    const schedulerTime = currentTime + 0.05;

    // kevin: this is called all the time, as soon as we initialize apparently. I think that's just how
    // I run the audio context? In any case, the "wam-transport" event just sets isPlaying = true
    // did we just start playing? set ticks to the beginning of 'currentBar'
    if (!this.isPlaying && transportData.playing && transportData.currentBarStarted <= currentTime) {
      this.isPlaying = true;

      // current position in ticks = (current bar * beats per bar) * (ticks per beat) % (clip length in ticks)
      this.startingTicks = transportData.currentBar * transportData.timeSigNumerator; //* PPQN;

      // rewind one tick so that on our first loop we process notes for the first tick
      this.ticks = Math.floor(this.startingTicks - 1);
    }

    if (!transportData.playing && this.isPlaying) {
      this.isPlaying = false;
    }

    // console.log(this.transportData!.playing, this.transportData!.currentBarStarted <= schedulerTime);

    // Run new playback system
    if (
      this.transportData!.playing &&
      this.transportData!.currentBarStarted <= schedulerTime &&
      this.seqClips.length != 0
    ) {
      // this.newSystemPlayback(schedulerTime);

      // FOR NOW WE JUST OUTPUT WHITE NOISE
      const output = outputs[0];
      output.forEach((channel) => {
        for (let i = 0; i < channel.length; i++) {
          channel[i] = Math.random() * 2 - 1;
        }
      });
    }
  }

  // // schedulerTime:
  // // - ever increasing timer, in seconds. Total time web audio has been playing? I keep it playing even when timeline is paused.
  // // - looks into the future. not current playback, but up to where we want to schedule
  // private newSystemPlayback(schedulerTime: number) {
  //   const clipLength = 96; // todo, clip length in PPQN units // clip.state.length
  //   const theClips = this.seqClips;
  //   const transportData = nullthrows(this.transportData, "no transport data");
  //   const startingTicks = this.startingTicks; // where we started playback in the timeline

  //   // seconds since playback started, without accounting for loop
  //   const timeElapsed = schedulerTime - transportData.currentBarStarted;
  //   const beatPosition =
  //     transportData.currentBar * transportData.timeSigNumerator + (transportData.tempo / 60.0) * timeElapsed;

  //   // absolute tick (pulse) position in track, without accounting for looping
  //   const absoluteTickPosition = Math.floor(beatPosition * PPQN);

  //   const clipPosition = absoluteTickPosition % clipLength; // remove `% clipLength`. But unimportant for now, only used when recordingArmed
  //   const currMidiPulse = this.ticks; // % clipLength; // todo, remove `% clipLength`, add offset

  //   if (this.recordingArmed && currMidiPulse > clipPosition) {
  //     // we just circled back, so finalize any notes in the buffer
  //     // this.noteRecorder.finalizeAllNotes(clipLength - 1);
  //   }

  //   const secondsPerTick = 1.0 / ((transportData.tempo / 60.0) * PPQN);

  //   // console.log(currMidiPulse, "->", absoluteTickPosition);
  //   const loopStart = this.loop == null ? null : this.loop[0];
  //   const loopEnd = this.loop == null ? null : this.loop[1];

  //   // console.log("startingTikcs", this.startingTicks);
  //   while (this.ticks < absoluteTickPosition) {
  //     // update ticks
  //     this.ticks = this.ticks + 1;

  //     const loopedTicks =
  //       loopEnd != null &&
  //       loopStart != null &&
  //       //  in the loop
  //       this.ticks - loopStart > 0
  //         ? ((this.ticks - loopStart) % (loopEnd - loopStart)) + loopStart
  //         : this.ticks;
  //     // const loopTime = (currentTimeInBuffer - loopStart) % (loopEnd - loopStart);

  //     // console.log("ticks", this.ticks, "loopedTicks", loopedTicks);
  //     // note: schedule based on real ticks, not looped ticks
  //     const tickMoment = transportData.currentBarStarted + (this.ticks - startingTicks) * secondsPerTick;

  //     // console.log(loopedTicks, tickMoment);
  //     notesForTickNew(loopedTicks, [...theClips.values()]).forEach(([ntick, nnumber, nduration, nvelocity]: Note) => {
  //       // console.log("events", tickMoment);
  //       this.emitEvents(
  //         this.midiEvent([MIDI.NOTE_ON | this.midiConfig.outputMidiChannel, nnumber, nvelocity], tickMoment),
  //         this.midiEvent(
  //           [MIDI.NOTE_OFF | this.midiConfig.outputMidiChannel, nnumber, nvelocity],
  //           tickMoment + nduration * secondsPerTick - 0.001,
  //         ),
  //       );
  //     });
  //   }
  // }
}

try {
  audioWorkletGlobalScope.registerProcessor(MODULE_ID, PianoRollProcessor as typeof WamProcessor);
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn(error);
}
