import { WamEventMap } from "@webaudiomodules/api";
import { WamNode, WebAudioModule } from "@webaudiomodules/sdk";
import { PianoRollProcessorMessage } from "../../midi/SharedMidiTypes";
import { ignorePromise } from "../../utils/ignorePromise";
import { EmptyObj } from "../../utils/types";
import PianoRollProcessorUrl from "./PianoRollProcessor?worker&url";
import DescriptorUrl from "./descriptor.json?url";
import { set } from "structured-state";

/// MAIN THING
export class PianoRollModule extends WebAudioModule<PianoRollNode> {
  override _descriptor: any;
  wamNode: PianoRollNode = null as any; // todo as any
  readonly playingNotes = set<number>();

  // transport?: WamTransportData;

  // public sendClipsForPlayback(seqClips: SimpleMidiClip[]) {
  //   const message: PianoRollProcessorMessage = { action: "newclip", seqClips };
  //   this.sequencer.port.postMessage(message);
  // }

  public sendMessageToProcessor(seqClips: PianoRollProcessorMessage) {
    this.wamNode.port.postMessage(seqClips);
  }

  // OVERRIDES

  override async _loadDescriptor() {
    const url = DescriptorUrl;
    if (!url) throw new TypeError("Descriptor not found");
    const response = await fetch(url);
    const descriptor = await response.json();
    Object.assign(this._descriptor, descriptor);
    return descriptor;
  }

  override async initialize(state: any) {
    await this._loadDescriptor();
    const result = await super.initialize(state);
    return result;
  }

  override async createAudioNode(initialState: EmptyObj): Promise<WamNode> {
    await PianoRollNode.addModules(this.audioContext, this.moduleId);
    await this.audioContext.audioWorklet.addModule(PianoRollProcessorUrl);

    this.wamNode = new PianoRollNode(this, {});
    ignorePromise(this.wamNode._initialize());
    ignorePromise(this.wamNode.setState(initialState)); // todo: await?

    // this.sequencer.pianoRoll.updateProcessor = (c: PianoRollClip) => {
    //   this.sequencer.port.postMessage({ action: "clip", id: c.state.id, state: c.getState() });
    // };

    this.wamNode.port.addEventListener("message", (ev) => {
      if (ev.data.event == "transport") {
        console.log("TRANSPORT");
        // this.transport = ev.data.transport;
      } else if (ev.data.event == "addNote") {
        // apparently called when note recorder records a note
        // const clip = this.sequencer.pianoRoll.getClip(this.sequencer.pianoRoll.playingClip as any); // todo as any
        // const note = ev.data.note;
        // // TODO: optionally don't quantize and just use note.tick
        // const quantizedTick = Math.round(note.tick / clip.quantize) * clip.quantize;
        // clip?.addNote(quantizedTick, note.number, note.duration, note.velocity);
        // if (this.sequencer.pianoRoll.renderCallback) {
        //   this.sequencer.pianoRoll.renderCallback();
        // }
      }
    });

    return this.wamNode;
  }
}

export class PianoRollNode extends WamNode {
  override readonly _supportedEventTypes: Set<keyof WamEventMap> = new Set([
    "wam-automation",
    "wam-midi",
    "wam-transport",
  ]);

  constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
    super(module, {
      ...options,
      processorOptions: {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      },
    });
  }

  // get issues if I don't set state to something
  override async getState(): Promise<EmptyObj> {
    return {};
    // return this.pianoRoll.getState();
  }

  override async setState(state: EmptyObj) {
    // ignorePromise(this.pianoRoll.setState(state));
  }
}
