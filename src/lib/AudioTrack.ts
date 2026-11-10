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
import { TRACK_HEIGHT } from "../constants";
import { DSP } from "../dsp/DSP";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { mixDown } from "../mixDown";
import { nullthrows } from "../utils/nullthrows";
import { AudioTrackModule } from "../wam/audiotrack/AudioTrackModule";
import { AudioTrackNode } from "../wam/audiotrack/AudioTrackNode";
import { appEnvironment } from "./AppEnvironment";
import { audioClip, AudioClip } from "./AudioClip";
import { AudioContextInfo } from "./initAudioContext";
import { AudioProject } from "./project/AudioProject";
import { defaultTrackUtility, ProjectTrackDSP } from "./ProjectTrackDSP";
import { standardTrack, StandardTrack } from "./StandardTrack";
// import { TrackThread } from "./TrackThread";

type AutoAudioTrack = {
  kind: string;
  clips: SSchemaArray<AudioClip>;
  height: SNumber;
  name: SString;
};

export class AudioTrack extends Structured<AutoAudioTrack, typeof AudioTrack> implements StandardTrack<AudioClip> {
  // For background processing
  // private thread_UNUSED = new TrackThread();

  // Live playback source: the track's AudioTrackProcessor, which plays clips from
  // their shared buffers. Persistent, so clip edits reach it during playback.
  private readonly liveSource: TrackedAudioNode<AudioTrackNode>;
  // Loop to use for the next startPlayback, decided in prepareForPlayback
  private preparedLoop: readonly [startSec: number, endSec: number] | null = null;
  private flushScheduled = false;

  // Bounce source, set by prepareForBounce and started by startPlayback on the offline context
  private bounceSource: TrackedAudioNode<AudioBufferSourceNode> | null = null;

  // if audio is being recorded, this is the clip it's being recorded into
  public readonly recordingClip: AudioClip | null = null;

  constructor(
    readonly name: SString,
    readonly clips: SSchemaArray<AudioClip>,
    readonly height: SNumber,
    readonly dsp: ProjectTrackDSP,
    readonly wamModule: AudioTrackModule,
  ) {
    super();
    this.liveSource = TrackedAudioNode.of(wamModule.wamNode);
    // Keep the processor's clips in sync with ours. Changes anywhere in the clip
    // list (adding, moving, trimming clips, undo/redo...) propagate up to it.
    // (structured-state doesn't export `subscribe`; this is what it does.)
    this.clips._subscriptors.add(() => this.scheduleClipFlush());
    this.scheduleClipFlush();
  }

  static async of(name: string, clips: AudioClip[], height: number, projectTrackDSP: ProjectTrackDSP) {
    const trackWAM = nullthrows(appEnvironment.audioTrackWAMBank.pop()); // todo replace

    return Structured.create(
      AudioTrack,
      string(name),
      arrayOf([AudioClip], clips),
      number(height),
      projectTrackDSP,
      trackWAM,
    );
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
    throw new Error("Need async construct to construct MidiTrack");

    // const projectTrackDSP = new ProjectTrackDSP(
    //   string("AudioTrackDSP"),
    //   PBGainNode.defaultLive(),
    //   SArray.create(
    //     // todo effects
    //     [],
    //   ),
    //   boolean(false),
    // );

    // const trackWAM = nullthrows(appEnvironment.audioTrackWAMBank.pop()); // todo replace

    // return Structured.create(
    //   AudioTrack,
    //   init.string(auto.name),
    //   init.schemaArray(auto.clips, [AudioClip]),
    //   init.number(auto.height),
    //   projectTrackDSP,
    //   trackWAM,
    // );
  }

  static async empty() {
    const effects = SArray.create([]);
    const trackWAM = nullthrows(appEnvironment.audioTrackWAMBank.pop()); // todo replace
    const trackUtility = await defaultTrackUtility();

    return Structured.create(
      AudioTrack,
      string("Audio"),
      arrayOf([AudioClip], []),
      number(TRACK_HEIGHT),
      new ProjectTrackDSP(string("AudioTrackDSP"), effects, boolean(false), trackUtility),
      trackWAM,
    );
  }

  //////////// Playback ////////////

  // Topology of DSP:
  // [ AudioTrackProcessor (liveSource) ]
  //        V
  // [ ... Effects]
  //        V
  // [ Track utility (gain, pan, mute) ]
  //        V
  // [ _Hidden Gain Node (for soloing)]
  //
  // The processor is persistent and always has the track's current clips (see
  // scheduleClipFlush), so the chain is only wired while playing.
  prepareForPlayback(project: AudioProject, _context: AudioContext, startingAt: number): void {
    this.flushClipsToProcessor();
    this.dsp.connectChain(this.liveSource);
    this.preparedLoop = AudioProject.playbackWillLoop(project, startingAt)
      ? [project.loopStart.secs(project), project.loopEnd.secs(project)]
      : null;
  }

  /**
   * NOTE: needs to be called right after .prepareForPlayback (or .prepareForBounce)
   * @param offset timeline position to start playing from, in seconds
   * @param startCtxTime audio-context time at which the timeline is at `offset`. Defaults
   * to now. Pass the original start time to join a playback that's already going.
   */
  startPlayback(_tempo: number, context: BaseAudioContext, offset: number = 0, startCtxTime?: number) {
    if (this.bounceSource != null && this.bounceSource.get().context === context) {
      this.bounceSource.get().start(0, offset);
      this.bounceSource = null;
      return;
    }

    this.wamModule.sendMessageToProcessor({
      action: "play",
      startCtxTime: startCtxTime ?? context.currentTime,
      startSec: offset,
      loop: this.preparedLoop,
    });
  }

  async prepareForBounce(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo,
  ): Promise<TrackedAudioNode> {
    // TODO: bounce through an AudioTrackProcessor in the offline context too, and drop mixDown
    const bounceSource = TrackedAudioNode.of(this.getBounceSourceNode(context));
    this.bounceSource = bounceSource;

    const effectNodes = await Promise.all(
      this.dsp.effectNodes._getRaw().map(async (effect) => {
        const nextEffect = await effect.cloneToOfflineContext(context, offlineContextInfo);
        if (nextEffect == null) {
          throw new Error(`Failed to prepare ${effect.effectId} for bounce!`);
        }
        return nextEffect;
      }),
    );

    const _hiddenGainNode = await this.dsp._hiddenGainNode.cloneToOfflineContext(context);
    const trackUtility = nullthrows(
      await this.dsp.utility.cloneToOfflineContext(context),
      "error cloning to offline context",
    );

    DSP.connectSerialNodes([
      ///
      bounceSource,
      ...effectNodes,
      trackUtility,
      _hiddenGainNode,
    ]);

    return _hiddenGainNode.outputNode();
  }

  stopPlayback(): void {
    this.wamModule.sendMessageToProcessor({ action: "stop" });
    this.dsp.disconnectChain(this.liveSource);
  }

  private getBounceSourceNode(context: BaseAudioContext): AudioBufferSourceNode {
    const trackBuffer = mixDown(this.clips._getRaw(), 2);
    const sourceNode = context.createBufferSource();
    sourceNode.buffer = trackBuffer;
    return sourceNode;
  }

  /** Coalesces bursts of clip changes (eg, a drag) into one flush per task */
  private scheduleClipFlush() {
    if (this.flushScheduled) {
      return;
    }
    this.flushScheduled = true;
    queueMicrotask(() => {
      this.flushScheduled = false;
      this.flushClipsToProcessor();
    });
  }

  /** Sends the current clips to the processor. Cheap: sample data is shared, not copied. */
  private flushClipsToProcessor() {
    this.wamModule.sendMessageToProcessor({
      action: "set_clips",
      seqClips: this.clips._getRaw().map((clip) => audioClip.toSimple(clip)),
    });
  }

  //////////// UTILITY ////////////

  // New track with a single clip
  static async fromClip(project: AudioProject, clip: AudioClip) {
    const track = await AudioTrack.empty();
    standardTrack.addClip(project, track, clip);
    return track;
  }
}

export const audioTrack = {};
