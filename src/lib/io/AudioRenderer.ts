import bufferToWav from "audiobuffer-to-wav";
import { SPrimitive } from "structured-state";
import { liveAudioContext } from "../../constants";
import { TrackedAudioNode } from "../../dsp/TrackedAudioNode";
import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { downloadURL } from "../../utils/downloadURL";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { initAudioContext } from "../initAudioContext";
import { AudioProject } from "../project/AudioProject";
import { pulsesToSec } from "../project/TimelineT";
import { AnalizedPlayer } from "./AnalizedPlayer";

function getOfflineAudioContext(lenSec: number) {
  return new OfflineAudioContext({
    numberOfChannels: 2,
    length: liveAudioContext().sampleRate * lenSec,
    sampleRate: liveAudioContext().sampleRate,
  });
}

export class AudioRenderer {
  /** Is the audio currently playing? */
  readonly isAudioPlaying = SPrimitive.of(false);

  constructor(
    /** */
    readonly analizedPlayer: AnalizedPlayer,
  ) {}

  /**
   * Bounces the current time slecteion. If no time is selected, bunces the whole track.
   * Bounced audio will be availabe at AudioRenderer.bounceURL for download.
   */
  static async bounceSelection(project: AudioProject) {
    const selectionWidth = project.selectionWidth.get();
    const tracks = project.allTracks._getRaw();
    const cursorPos = project.cursorPos.get();
    const bounceAll = selectionWidth == null || selectionWidth === 0;

    const result = await (bounceAll
      ? AudioRenderer.bounceTracks(tracks, project.tempo.get())
      : AudioRenderer.bounceTracks(tracks, project.tempo.get(), cursorPos, cursorPos + selectionWidth));
    const wav = bufferToWav(result);
    const blob = new Blob([new DataView(wav)], {
      type: "audio/wav",
    });
    const exportUrl = window.URL.createObjectURL(blob);
    downloadURL(exportUrl, "bounce.wav");
  }

  static async bounceTracks(
    tracks: ReadonlyArray<AudioTrack | MidiTrack>,
    tempo: number,
    startSec: number = 0,
    endSec?: number,
  ): Promise<AudioBuffer> {
    let end = endSec;
    // If no end is provided, bounce to the full duration of the track. We go
    // through each clip and find when the last one ends.
    if (endSec == null) {
      for (const track of tracks) {
        for (const clip of track.clips._getRaw()) {
          if (clip instanceof AudioClip) {
            end = end == null || clip.getTimelineEndSec() > end ? clip.getTimelineEndSec() : end;
            console.log("endOffsetSec", clip.getTimelineEndSec(), end);
          } else if (clip instanceof MidiClip) {
            const endOffsetSec = pulsesToSec(clip._timelineEndU, tempo);
            end = end == null || endOffsetSec > end ? endOffsetSec : end;
            console.log("endOffsetSec", endOffsetSec, end);
          } else {
            throw new Error("Unknown clip type");
          }
        }
      }
    }

    // If we have no clips or no tracks, end will still be null. For now, we'll
    // just throw. I could also return an empty AudioBuffer though.
    if (end == null) {
      throw new Error("Bouncing an empty track!");
    }

    if (end <= startSec) {
      throw new Error("Attempted to render negative or null length");
    }

    const offlineAudioContext = getOfflineAudioContext(end - startSec);
    const offlineContextInfo = await initAudioContext(offlineAudioContext);
    const offlineMixDownNode = TrackedAudioNode.of(new AudioWorkletNode(offlineAudioContext, "mix-down-processor"));
    offlineMixDownNode.get().connect(offlineAudioContext.destination); // todo: get().connect vs connect(x.get())?

    const trackDests = await Promise.all(
      tracks.map((track) => {
        return track.prepareForBounce(offlineAudioContext, offlineContextInfo);
      }),
    );

    for (const trackDest of trackDests) {
      trackDest.connect(offlineMixDownNode);
    }

    for (const track of tracks) {
      track.startPlayback(tempo, offlineAudioContext, startSec);
    }

    const result = await offlineAudioContext.startRendering();
    return result;
  }

  /**
   * Start/stops playback starting at the current cursor position.
   */
  static togglePlayback(renderer: AudioRenderer, project: AudioProject, player: AnalizedPlayer) {
    if (renderer.isAudioPlaying.get()) {
      player.stopSound();
      renderer.isAudioPlaying.set(false);
    } else {
      player.playTracks(project, project.allTracks._getRaw(), project.cursorPos.get(), project.tempo.get());
      renderer.isAudioPlaying.set(true);
    }
  }

  static ensurePlaybackGoing(renderer: AudioRenderer, project: AudioProject, player: AnalizedPlayer) {
    if (renderer.isAudioPlaying.get()) {
      return;
    } else {
      player.playTracks(project, project.allTracks._getRaw(), project.cursorPos.get(), project.tempo.get());
      renderer.isAudioPlaying.set(true);
    }
  }

  static ensurePlaybackStopped(renderer: AudioRenderer, project: AudioProject, player: AnalizedPlayer) {
    if (renderer.isAudioPlaying.get()) {
      player.stopSound();
      renderer.isAudioPlaying.set(false);
    } else {
      return;
    }
  }
}
