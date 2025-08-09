import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { MidiTrack } from "../midi/MidiTrack";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AudioTrack } from "./AudioTrack";

export function removeEffect(track: AudioTrack | MidiTrack, effect: FaustAudioEffect | PambaWamNode) {
  track.dsp.effects.remove(effect);
  effect.destroy();
}

export function bypassEffect(track: AudioTrack | MidiTrack, effect: FaustAudioEffect | PambaWamNode) {
  console.log("todo: bypass", effect);
}
