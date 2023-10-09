import { WamEventMap, WamTransportData } from "@webaudiomodules/api";
import { WebAudioModule, WamNode } from "../../../packages/sdk/dist/index";
// import { h, render } from "preact";

import { PatternDelegate } from "wam-extensions";

// import { PianoRollView } from "./PianoRollView";
// import { getBaseUrl } from "../../shared/getBaseUrl";
import { Clip } from "./PianoRollClip";
// import { PianoRoll } from "./PianoRoll";

// import styles from "./PianoRollView.scss";
// import { insertStyle } from "../../shared/insertStyle";

// import { MIDIConfiguration } from "./MIDIConfiguration";
import PianoRollProcessorUrl from "./PianoRollProcessor?url";
import DescriptorUrl from "./descriptor.json?url";

const logger = console.log;

export class PianoRollNode extends WamNode {
  destroyed = false;

  pianoRoll: PianoRoll;
  // 'wam-automation' | 'wam-transport' | 'wam-midi' | 'wam-sysex' | 'wam-mpe' | 'wam-osc';
  override readonly _supportedEventTypes: Set<keyof WamEventMap> = new Set([
    "wam-automation",
    "wam-midi",
    "wam-transport",
  ]);

  /**
   * @param {WebAudioModule} module
   * @param {AudioWorkletNodeOptions} options
   */
  constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
    super(module, {
      ...options,
      processorOptions: {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      },
    });

    this.pianoRoll = new PianoRoll(module.instanceId);
  }

  override async getState(): Promise<any> {
    return this.pianoRoll.getState();
  }

  override async setState(state: any) {
    ignorePromise(this.pianoRoll.setState(state));
  }
}

/// MAIN THING
export class PianoRollModule extends WebAudioModule<PianoRollNode> {
  _pianoRollProcessorUrl = PianoRollProcessorUrl;
  nonce: string | undefined;
  override _descriptor: any;

  override async _loadDescriptor() {
    const url = DescriptorUrl;
    if (!url) throw new TypeError("Descriptor not found");
    const response = await fetch(url);
    const descriptor = await response.json();
    Object.assign(this._descriptor, descriptor);
    return descriptor;
  }

  sequencer: PianoRollNode = null as any; // todo as any
  // transport?: WamTransportData;

  override async initialize(state: any) {
    await this._loadDescriptor();
    // console.log("INIT FOO");

    return super.initialize(state);
  }

  public prepareForPlayback(seqClips: SimpleMidiClip[]) {
    const message: PianoRollProcessorMessage = { action: "newclip", seqClips };
    this.sequencer.port.postMessage(message);
  }

  public sendMessageToProcessor(seqClips: PianoRollProcessorMessage) {
    this.sequencer.port.postMessage(seqClips);
  }

  override async createAudioNode(initialState: any) {
    await PianoRollNode.addModules(this.audioContext, this.moduleId);
    await this.audioContext.audioWorklet.addModule(this._pianoRollProcessorUrl);

    const node: PianoRollNode = new PianoRollNode(this, {});

    await node._initialize();

    ignorePromise(node.setState(initialState)); // todo: await?

    this.sequencer = node;

    this.sequencer.pianoRoll.updateProcessor = (c: Clip) => {
      this.sequencer.port.postMessage({ action: "clip", id: c.state.id, state: c.getState() });
    };

    this.sequencer.pianoRoll.updateProcessorMIDIConfig = (config: MIDIConfiguration) => {
      this.sequencer.port.postMessage({ action: "midiConfig", config });
    };

    this.sequencer.port.addEventListener("message", (ev) => {
      if (ev.data.event == "transport") {
        console.log("TRANSPORT");
        // this.transport = ev.data.transport;
      } else if (ev.data.event == "addNote") {
        const clip = this.sequencer.pianoRoll.getClip(this.sequencer.pianoRoll.playingClip as any); // todo as any
        const note = ev.data.note;

        // TODO: optionally don't quantize and just use note.tick
        const quantizedTick = Math.round(note.tick / clip.quantize) * clip.quantize;

        clip?.addNote(quantizedTick, note.number, note.duration, note.velocity);
        if (this.sequencer.pianoRoll.renderCallback) {
          this.sequencer.pianoRoll.renderCallback();
        }
      }
    });

    this.updateExtensions();

    return node;
  }

  override async createGui() {
    const div = document.createElement("div");
    // hack because h() is getting stripped for non-use despite it being what the JSX compiles to
    // h("div", {});
    div.setAttribute(
      "style",
      "display: flex; flex-direction: column; height: 100px; width: 100px; max-height: 100%; max-width: 100%;",
    );

    div.setAttribute("width", "1024");
    div.setAttribute("height", "680");

    var shadow = div.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    container.setAttribute(
      "style",
      "display: flex; flex-direction: column; height: 100px; width: 100px; max-height: 100%; max-width: 100%;",
    );

    shadow.appendChild(container);

    // insertStyle(shadow, styles.toString());

    // render(<PianoRollView plugin={this} pianoRoll={this.sequencer.pianoRoll} clipId={clipId}></PianoRollView>, shadow);

    const content = document.createElement("div");
    container.appendChild(document.createTextNode("hello world"));
    const canvasRenderer = new NoteCanvasRenderer(document);

    let clip = this.sequencer.pianoRoll.getClip("default");
    let rendererState: NoteCanvasRenderState = {
      width: 300,
      height: 300,
      position: 0,
      horizontalZoom: 1,
      clip: clip,
      visibleNotes: this.sequencer.pianoRoll.noteList ?? [],
      layingNewNote: undefined as any,
      transportData: {
        currentBar: 0,
        currentBarStarted: 0,
        tempo: 120,
        timeSigNumerator: 4,
        timeSigDenominator: 4,
        playing: false,
      },
    };

    const result = canvasRenderer.render(rendererState);

    div.appendChild(content);
    // div.appendChild(result);
    container.appendChild(result);

    // render(<PianoRollView plugin={this} pianoRoll={this.sequencer.pianoRoll} clipId={clipId}></PianoRollView>, shadow);

    return div;
  }

  // clip(): Clip {
  // 	return this.sequencer.pianoRoll.clip()
  // }

  override destroyGui(el: Element) {
    // render(null, el);
    el.parentElement?.removeChild(el);
  }

  updateExtensions() {
    if (window.WAMExtensions && window.WAMExtensions.recording) {
      window.WAMExtensions.recording.register(this.instanceId, {
        armRecording: (armed: boolean) => {
          this.sequencer.pianoRoll.armHostRecording(armed);
        },
      });
    } else {
      this.sequencer.pianoRoll.armHostRecording(true);
    }

    if (!(window.WAMExtensions && window.WAMExtensions.patterns)) {
      return;
    }

    let patternDelegate: PatternDelegate = {
      getPatternList: () => {
        return Object.keys(this.sequencer.pianoRoll.clips).map((id) => {
          return { id: id, name: "pattern" };
        });
      },
      createPattern: (id: string) => {
        logger("createPattern(%s)", id);
        this.sequencer.pianoRoll.addClip(id);
      },
      deletePattern: (id: string) => {
        logger("deletePattern(%s)", id);
        delete this.sequencer.pianoRoll.clips[id];
      },
      playPattern: (id: string | undefined) => {
        logger("playPattern(%s)", id);

        let clip = this.sequencer.pianoRoll.getClip(id as any); // todo as any
        if (!clip && id != undefined) {
          console.log("PianoRoll index: adding clip ", id);
          this.sequencer.pianoRoll.addClip(id);
        }
        this.sequencer.pianoRoll.playingClip = id;

        this.sequencer.port.postMessage({ action: "play", id });
      },
      getPatternState: (id: string) => {
        logger("getPatternState(%s)", id);

        let clip = this.sequencer.pianoRoll.getClip(id);
        if (clip) {
          return clip.getState(true);
        } else {
          return undefined;
        }
      },
      setPatternState: (id: string, state: any) => {
        logger("setPatternState(%s, %o)", id, state);
        let clip = this.sequencer.pianoRoll.getClip(id);
        if (clip) {
          ignorePromise(clip.setState(state, id));
        } else {
          let clip = new Clip(id, state);
          this.sequencer.pianoRoll.clips[id] = clip;
        }
        if (this.sequencer.pianoRoll.renderCallback) {
          this.sequencer.pianoRoll.renderCallback();
        }
      },
    };

    window.WAMExtensions.patterns.setPatternDelegate(this.instanceId, patternDelegate);
  }
}
import { ClipState } from "./PianoRollClip";
import { NoteDefinition } from "wam-extensions";
import { MIDIConfiguration } from "./MIDIConfiguration";
import { ignorePromise } from "../../utils/ignorePromise";
import { NoteCanvasRenderState, NoteCanvasRenderer } from "./NoteCanvasRenderer";
import { PianoRollProcessorMessage, SimpleMidiClip } from "../../midi/SharedMidiTypes";

export type MIDIEvent = Uint8Array;
export type ScheduledMIDIEvent = {
  event: MIDIEvent;
  time: number;
};

export type PianoRollState = {
  clips: Record<string, ClipState>;
};

export class PianoRoll {
  instanceId: string;
  futureEvents: ScheduledMIDIEvent[];
  dirty: boolean;

  clips: Record<string, Clip>;

  playingClip: string | undefined;

  midiConfig: MIDIConfiguration;

  renderCallback?: () => void;
  updateProcessor?: (c: Clip) => void;
  updateProcessorMIDIConfig?: (config: MIDIConfiguration) => void;

  noteList?: NoteDefinition[];

  constructor(instanceId: string) {
    this.instanceId = instanceId;
    this.futureEvents = [];
    this.dirty = false;
    this.clips = { default: new Clip("default") };
    this.playingClip = "default";

    this.midiConfig = {
      pluginRecordingArmed: false,
      hostRecordingArmed: false,
      inputMidiChannel: -1,
      outputMidiChannel: 0,
    };

    this.registerNoteListHandler();
    Object.keys(this.clips).forEach(
      (id) =>
        (this.clips[id].updateProcessor = (c) => {
          if (this.updateProcessor) this.updateProcessor(c);
        }),
    );
  }

  getClip(id: string) {
    return this.clips[id];
  }

  addClip(id: string) {
    let clip = this.getClip(id);
    if (!clip) {
      let clip = new Clip(id);
      clip.updateProcessor = (c) => {
        if (this.updateProcessor) this.updateProcessor(c);
      };
      this.clips[id] = clip;
    }
  }

  registerNoteListHandler() {
    if (window.WAMExtensions && window.WAMExtensions.notes) {
      window.WAMExtensions.notes.addListener(this.instanceId, (notes) => {
        this.noteList = notes;
        if (this.renderCallback) {
          this.renderCallback();
        }
      });
    }
  }

  deregisterNoteListHandler() {
    if (window.WAMExtensions && window.WAMExtensions.notes) {
      window.WAMExtensions.notes.addListener(this.instanceId, undefined);
    }
  }

  getState(): PianoRollState {
    var state: PianoRollState = {
      clips: {},
    };

    for (let id of Object.keys(this.clips)) {
      state.clips[id] = this.clips[id].getState();
    }

    return state;
  }

  async setState(state: PianoRollState) {
    if (!state) {
      return;
    }

    const oldClips = this.clips;
    this.clips = {};

    if (!state.clips) {
      state.clips = {};
    }

    for (let id of Object.keys(state.clips)) {
      this.clips[id] = new Clip(id, state.clips[id]);
      if (oldClips[id]) {
        this.clips[id].quantize = oldClips[id].quantize;
      }
    }

    console.log("PianoRoll setState: loading clips ", state.clips);

    for (let id of Object.keys(this.clips)) {
      this.clips[id].updateProcessor = (c) => {
        if (this.updateProcessor) this.updateProcessor(c);
      };

      if (this.updateProcessor) this.updateProcessor(this.clips[id]);
    }

    this.dirty = true;
    if (this.renderCallback != undefined) {
      this.renderCallback();
    }
  }

  // clip(): Clip | undefined {
  // 	if (this.selectedClip > this.clips.length || this.selectedClip < 0) {
  // 		return this.clips[0]
  // 	}
  // 	return this.clips[this.selectedClip]
  // }

  clearRenderFlag() {
    this.dirty = false;
  }

  needsRender() {
    return this.dirty;
  }

  armHostRecording(armed: boolean) {
    this.midiConfig.hostRecordingArmed = armed;
    if (this.updateProcessorMIDIConfig) {
      this.updateProcessorMIDIConfig(this.midiConfig);
    }
  }

  armPluginRecording(armed: boolean) {
    this.midiConfig.pluginRecordingArmed = armed;
    if (this.updateProcessorMIDIConfig) {
      this.updateProcessorMIDIConfig(this.midiConfig);
    }
  }

  inputMidiChanged(v: number) {
    if (v < -1 || v > 15) {
      throw `Invalid input midi value: ${v}`;
    }
    this.midiConfig.inputMidiChannel = v;
    if (this.updateProcessorMIDIConfig) {
      this.updateProcessorMIDIConfig(this.midiConfig);
    }
  }

  outputMidiChanged(v: number) {
    if (v < 0 || v > 15) {
      throw `Invalid output midi value: ${v}`;
    }
    this.midiConfig.outputMidiChannel = v;
    if (this.updateProcessorMIDIConfig) {
      this.updateProcessorMIDIConfig(this.midiConfig);
    }
  }
}
