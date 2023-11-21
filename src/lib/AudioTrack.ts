import { SSchemaArray } from "structured-state";
import * as s from "structured-state";
import { CLIP_HEIGHT } from "../constants";
import { DSPNode } from "../dsp/DSPNode";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { MidiTrack } from "../midi/MidiTrack";
import { mixDown } from "../mixDown";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AudioClip } from "./AudioClip";
import { ProjectTrack } from "./ProjectTrack";
import { TrackThread } from "./TrackThread";
import { connectSerialNodes } from "./connectSerialNodes";
import { AudioContextInfo } from "./initAudioContext";

export class AudioTrack extends ProjectTrack<AudioClip> {
  public override clips: SSchemaArray<AudioClip>;
  override effectId: string = "Builtin:AudioTrack";

  // For background processing
  private thread_UNUSED = new TrackThread();

  // if audo is playing, this is the soruce with the playing buffer
  private playingSource: AudioBufferSourceNode | null;

  override cloneToOfflineContext(_context: OfflineAudioContext): Promise<DSPNode<AudioNode> | null> {
    throw new Error("AudioTrack: DSPNode: can't cloneToOfflineContext.");
  }

  private constructor(name: string, clips: AudioClip[], effects: (FaustAudioEffect | PambaWamNode)[], height: number) {
    super(name, effects, height);
    this.clips = s.arrayOf([AudioClip as any], clips);
    this.playingSource = null;
  }

  static create(props?: {
    name?: string;
    clips?: AudioClip[];
    effects?: (FaustAudioEffect | PambaWamNode)[];
    height?: number;
  }) {
    return new this(props?.name ?? "Audio", props?.clips ?? [], props?.effects ?? [], props?.height ?? CLIP_HEIGHT);
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
  override prepareForPlayback(context: AudioContext): void {
    // We need to keep a reference to our source node for play/pause
    this.playingSource = this.getSourceNode(context);
    this.connectToDSPForPlayback(this.playingSource);
  }

  // NOTE: needs to be called right after .prepareForPlayback
  override startPlayback(tempo: number, context: BaseAudioContext, offset?: number) {
    if (!this.playingSource) {
      throw new Error("Track is not ready for playback!");
    }
    this.playingSource.start(0, offset); // Play the sound now
  }

  async prepareForBounce(context: OfflineAudioContext, offlineContextInfo: AudioContextInfo): Promise<AudioNode> {
    this.playingSource = this.getSourceNode(context);

    const effectNodes = await Promise.all(
      this.effects._getRaw().map(async (effect) => {
        const nextEffect = await effect.cloneToOfflineContext(context, offlineContextInfo);
        if (nextEffect == null) {
          throw new Error(`Failed to prepare ${effect.effectId} for bounce!`);
        }
        return nextEffect;
      }),
    );

    const _hiddenGainNode = await this._hiddenGainNode.cloneToOfflineContext(context);

    connectSerialNodes([
      ///
      this.playingSource,
      await this.gainNode.cloneToOfflineContext(context),
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

    this.playingSource.stop(0);
    this.disconnectDSPAfterPlayback(this.playingSource);
  }

  // TODO: I think I can keep 'trackBuffer' between plays
  private getSourceNode(context: BaseAudioContext): AudioBufferSourceNode {
    const trackBuffer = mixDown(this.clips._getRaw(), 2);
    const sourceNode = context.createBufferSource();
    sourceNode.buffer = trackBuffer;
    sourceNode.loop = false;
    return sourceNode;
  }

  //////////// UTILITY ////////////

  // New track with a single clip
  static fromClip(clip: AudioClip) {
    const track = AudioTrack.create();
    track.addClip(clip);
    return track;
  }

  ///////////// statics

  static removeEffect(track: AudioTrack | MidiTrack, effect: FaustAudioEffect | PambaWamNode) {
    track.effects.remove(effect);
    effect.destroy();
  }

  static bypassEffect(track: AudioTrack | MidiTrack, effect: FaustAudioEffect | PambaWamNode) {
    console.log("todo: bypass", effect);
  }
}
