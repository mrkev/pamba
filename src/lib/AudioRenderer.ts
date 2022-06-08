import { LinkedState } from "./state/LinkedState";
import { AnalizedPlayer } from "./AnalizedPlayer";
import bufferToWav from "audiobuffer-to-wav";
import { AudioProject } from "./AudioProject";

export class AudioRenderer {
  /**
   * URL of last bounced audio clip, for download
   */
  readonly bounceURL = LinkedState.of<string | null>(null);

  /**
   * Is the audio currently playing?
   */
  readonly isAudioPlaying = LinkedState.of(false);

  //
  readonly analizedPlayer: AnalizedPlayer;
  constructor(analizedPlayer: AnalizedPlayer) {
    this.analizedPlayer = analizedPlayer;
  }

  ///

  /**
   * Bounces the current time slecteion. If no time is selected, bunces the whole track.
   * Bounced audio will be availabe at AudioRenderer.bounceURL for download.
   */
  static async bounceSelection(renderer: AudioRenderer, project: AudioProject) {
    const selectionWidth = project.selectionWidth.get();
    const tracks = project.allTracks._getRaw();
    const cursorPos = project.cursorPos.get();
    const currentBounceURL = renderer.bounceURL.get();
    const bounceAll = !selectionWidth || selectionWidth === 0;

    const result = await (bounceAll
      ? AnalizedPlayer.bounceTracks(tracks)
      : AnalizedPlayer.bounceTracks(tracks, cursorPos, cursorPos + selectionWidth));
    const wav = bufferToWav(result);
    const blob = new Blob([new DataView(wav)], {
      type: "audio/wav",
    });
    const exportUrl = window.URL.createObjectURL(blob);

    if (currentBounceURL != null) {
      window.URL.revokeObjectURL(currentBounceURL);
    }

    renderer.bounceURL.set(exportUrl);
  }

  /**
   * Start/stops playback starting at the current cursor position.
   */
  static togglePlayback(renderer: AudioRenderer, project: AudioProject, player: AnalizedPlayer) {
    if (renderer.isAudioPlaying.get()) {
      player.stopSound();
      renderer.isAudioPlaying.set(false);
    } else {
      player.playTracks(project.allTracks._getRaw(), project.cursorPos.get());
      renderer.isAudioPlaying.set(true);
    }
  }
}
