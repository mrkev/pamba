import * as s from "structured-state";
import { SPrimitive, SSchemaArray, Structured } from "structured-state";
import { CLIP_HEIGHT } from "../constants";
import { SAudioTrack } from "../data/serializable";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { MidiTrack } from "../midi/MidiTrack";
import { mixDown } from "../mixDown";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AudioClip } from "./AudioClip";
import { ProjectTrack, StandardTrack } from "./ProjectTrack";
import { ProjectTrackDSP } from "./ProjectTrackDSP";
import { connectSerialNodes } from "./connectSerialNodes";
import { AudioContextInfo } from "./initAudioContext";
import { AudioProject } from "./project/AudioProject";

export class AudioTrack extends Structured<SAudioTrack, typeof AudioTrack> implements StandardTrack<AudioClip> {
  public readonly name: SPrimitive<string>;
  public readonly dsp: ProjectTrackDSP<AudioClip>;
  public readonly clips: SSchemaArray<AudioClip>;
  public readonly height: SPrimitive<number>;

  // For background processing
  // private thread_UNUSED = new TrackThread();

  // if audo is playing, this is the soruce with the playing buffer
  private playingSource: TrackedAudioNode<AudioBufferSourceNode> | null;

  override serialize(): SAudioTrack {
    return {
      kind: "AudioTrack",
      clips: this.clips._getRaw().map((clip) => clip.serialize()),
      // TODO: async serialize
      // effects: await Promise.all(obj.dsp.effects._getRaw().map((effect) => serializable(effect))),
      effects: [],
      height: this.height.get(),
      name: this.name.get(),
    };
  }
  override replace(json: SAudioTrack): void {
    throw new Error("Method not implemented.");
  }

  static construct(json: SAudioTrack): AudioTrack {
    const { name, clips: sClips, effects: sEffects, height } = json;
    const clips = sClips.map((clip) => AudioClip.construct(clip));
    // TODO: effects
    // const effects = await Promise.all(sEffects.map((effect) => construct(effect)));
    return AudioTrack.of({ name, clips, effects: [], height });
  }

  constructor(name: string, clips: AudioClip[], effects: (FaustAudioEffect | PambaWamNode)[], height: number) {
    super();
    this.clips = s.arrayOf([AudioClip as any], clips);
    this.playingSource = null;
    this.dsp = new ProjectTrackDSP(this, effects);
    this.name = SPrimitive.of(name);
    this.height = SPrimitive.of<number>(height);
  }

  static of(props?: {
    name?: string;
    clips?: AudioClip[];
    effects?: (FaustAudioEffect | PambaWamNode)[];
    height?: number;
  }) {
    return Structured.create(
      AudioTrack,
      props?.name ?? "Audio",
      props?.clips ?? [],
      props?.effects ?? [],
      props?.height ?? CLIP_HEIGHT,
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

    connectSerialNodes([
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
    const track = AudioTrack.of();
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
