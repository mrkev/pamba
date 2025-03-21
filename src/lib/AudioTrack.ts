import {
  arrayOf,
  boolean,
  InitFunctions,
  JSONOfAuto,
  number,
  ReplaceFunctions,
  SArray,
  SNumber,
  SSchemaArray,
  SString,
  string,
  Structured,
} from "structured-state";
import { CLIP_HEIGHT } from "../constants";
import { DSP } from "../dsp/DSP";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { MidiTrack } from "../midi/MidiTrack";
import { mixDown } from "../mixDown";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AudioClip } from "./AudioClip";
import { AudioContextInfo } from "./initAudioContext";
import { PBGainNode } from "./offlineNodes";
import { AudioProject } from "./project/AudioProject";
import { ProjectTrack, StandardTrack } from "./ProjectTrack";
import { ProjectTrackDSP } from "./ProjectTrackDSP";
// import { TrackThread } from "./TrackThread";

type AutoAudioTrack = {
  kind: string;
  clips: SSchemaArray<AudioClip>;
  height: SNumber;
  name: SString;
};

export class AudioTrack extends Structured<AutoAudioTrack, typeof AudioTrack> implements StandardTrack<AudioClip> {
  // public readonly dsp: ProjectTrackDSP;

  // For background processing
  // private thread_UNUSED = new TrackThread();

  // if audo is playing, this is the soruce with the playing buffer
  private playingSource: TrackedAudioNode<AudioBufferSourceNode> | null;

  // if audio is being recorded, this is the clip it's being recorded into
  public readonly recordingClip: AudioClip | null = null;

  constructor(
    readonly name: SString,
    readonly clips: SSchemaArray<AudioClip>,
    readonly height: SNumber,
    readonly dsp: ProjectTrackDSP,
  ) {
    super();
    this.playingSource = null;
  }

  static of(name: string, clips: AudioClip[], height: number, projectTrackDSP: ProjectTrackDSP) {
    return Structured.create(AudioTrack, string(name), arrayOf([AudioClip], clips), number(height), projectTrackDSP);
  }

  override autoSimplify(): AutoAudioTrack {
    return {
      kind: "AudioTrack",
      clips: this.clips,
      // TODO: async serialize
      // effects: await Promise.all(obj.dsp.effects._getRaw().map((effect) => serializable(effect))),
      // effects: [],
      height: this.height,
      name: this.name,
    };
  }

  override replace(auto: JSONOfAuto<AutoAudioTrack>, replace: ReplaceFunctions): void {
    replace.number(auto.height, this.height);
    replace.string(auto.name, this.name);
    replace.schemaArray(auto.clips, this.clips);
    console.log("REPLACED AudioTrack");
  }

  static construct(auto: JSONOfAuto<AutoAudioTrack>, init: InitFunctions): AudioTrack {
    const projectTrackDSP = new ProjectTrackDSP(
      string("AudioTrackDSP"),
      PBGainNode.defaultLive(),
      SArray.create(
        // todo effects
        [],
      ),
      boolean(false),
    );

    return Structured.create(
      AudioTrack,
      init.string(auto.name),
      init.schemaArray(auto.clips, [AudioClip]),
      init.number(auto.height),
      projectTrackDSP,
    );
  }

  static empty() {
    const effects = SArray.create([]);
    return Structured.create(
      AudioTrack,
      string("Audio"),
      arrayOf([AudioClip], []),
      number(CLIP_HEIGHT),
      new ProjectTrackDSP(string("AudioTrackDSP"), PBGainNode.defaultLive(), effects, boolean(false)),
    );
  }

  //////////// Playback ////////////

  // Topology of DSP:
  // [ Source Node ]
  //        V
  // [ Gain Node ]
  //        V
  // [ ... Effects]
  //        V
  // [ _Hidden Gain Node (for soloing)]
  //        V
  // [ Out Node ]
  prepareForPlayback(project: AudioProject, context: AudioContext, startingAt: number): void {
    // We need to keep a reference to our source node for play/pause
    this.playingSource = TrackedAudioNode.of(this.getSourceNode(context));
    this.dsp.connectToDSPForPlayback(this.playingSource);

    if (AudioProject.playbackWillLoop(project, startingAt)) {
      this.playingSource.get().loop = true;
      this.playingSource.get().loopStart = project.loopStart.secs(project);
      this.playingSource.get().loopEnd = project.loopEnd.secs(project);
      console.log(`looping`, this.playingSource.get().loopStart, this.playingSource.get().loopEnd);
    } else {
      this.playingSource.get().loop = false;
    }
  }

  // NOTE: needs to be called right after .prepareForPlayback
  startPlayback(tempo: number, context: BaseAudioContext, offset?: number) {
    if (!this.playingSource) {
      throw new Error("Track is not ready for playback!");
    }
    this.playingSource.get().start(0, offset); // Play the sound now
  }

  async prepareForBounce(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo,
  ): Promise<TrackedAudioNode> {
    this.playingSource = TrackedAudioNode.of(this.getSourceNode(context));

    const effectNodes = await Promise.all(
      this.dsp.effects._getRaw().map(async (effect) => {
        const nextEffect = await effect.cloneToOfflineContext(context, offlineContextInfo);
        if (nextEffect == null) {
          throw new Error(`Failed to prepare ${effect.effectId} for bounce!`);
        }
        return nextEffect;
      }),
    );

    const _hiddenGainNode = await this.dsp._hiddenGainNode.cloneToOfflineContext(context);

    DSP.connectSerialNodes([
      ///
      this.playingSource,
      await this.dsp.gainNode.cloneToOfflineContext(context),
      ...effectNodes,
      _hiddenGainNode,
    ]);

    return _hiddenGainNode.outputNode();
  }

  stopPlayback(): void {
    if (!this.playingSource) {
      console.warn("Stopping but no playingSource on track", this);
      return;
    }

    this.playingSource.get().stop(0);
    this.dsp.disconnectDSPAfterPlayback(this.playingSource);
  }

  // TODO: I think I can keep 'trackBuffer' between plays
  private getSourceNode(context: BaseAudioContext): AudioBufferSourceNode {
    const trackBuffer = mixDown(this.clips._getRaw(), 2);
    const sourceNode = context.createBufferSource();
    sourceNode.buffer = trackBuffer;
    return sourceNode;
  }

  //////////// UTILITY ////////////

  // New track with a single clip
  static fromClip(project: AudioProject, clip: AudioClip) {
    const track = AudioTrack.empty();
    ProjectTrack.addClip(project, track, clip);
    return track;
  }

  ///////////// statics

  static removeEffect(track: AudioTrack | MidiTrack, effect: FaustAudioEffect | PambaWamNode) {
    track.dsp.effects.remove(effect);
    effect.destroy();
  }

  static bypassEffect(track: AudioTrack | MidiTrack, effect: FaustAudioEffect | PambaWamNode) {
    console.log("todo: bypass", effect);
  }
}
