import { LinkedState } from "./LinkedState";
import { AnalizedPlayer } from "./AnalizedPlayer";
import bufferToWav from "audiobuffer-to-wav";
import { AudioProject } from "./AudioProject";

export class AudioRenderer {
  bounceURL = LinkedState.of<string | null>(null);
  isAudioPlaying = LinkedState.of(false);

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
