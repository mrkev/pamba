import { WamNode } from "@webaudiomodules/api";
import WebAudioModule from "../../../packages/sdk/src/WebAudioModule";
import { ignorePromise } from "../../utils/ignorePromise";
import { EmptyObj } from "../../utils/types";
import { AudioTrackNode } from "./AudioTrackNode";

import AUDIO_TRACK_PROCESSOR_URL from "./AudioTrackProcessor?worker&url";
import DESCRIPTOR_URL from "./descriptor.json?url";
import { AudioTrackProcessorMessage } from "./SharedAudioTrackTypes";

export class AudioTrackModule extends WebAudioModule<AudioTrackNode> {
  override _descriptor: any;
  public wamNode: AudioTrackNode = null as any; // todo as any

  // public sendClipsForPlayback(seqClips: SimpleMidiClip[]) {
  //   const message: PianoRollProcessorMessage = { action: "newclip", seqClips };
  //   this.sequencer.port.postMessage(message);
  // }

  public sendMessageToProcessor(seqClips: AudioTrackProcessorMessage) {
    this.wamNode.port.postMessage(seqClips);
  }

  // OVERRIDES

  override async _loadDescriptor() {
    const url = DESCRIPTOR_URL;
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
    await AudioTrackNode.addModules(this.audioContext, this.moduleId);
    await this.audioContext.audioWorklet.addModule(AUDIO_TRACK_PROCESSOR_URL);

    this.wamNode = new AudioTrackNode(this, {});
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
