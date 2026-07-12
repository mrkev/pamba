import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { MidiTrack } from "../midi/MidiTrack";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AudioTrack } from "./AudioTrack";

export function removeEffect(track: AudioTrack | MidiTrack, effect: FaustAudioEffect | PambaWamNode) {
  track.dsp.removeEffect(effect);
  effect.destroy();
}

export function bypassEffect(track: AudioTrack | MidiTrack, effect: FaustAudioEffect | PambaWamNode) {
  track.dsp.setEffectBypassed(effect, !effect.bypass.get());
}
