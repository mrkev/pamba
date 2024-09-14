import { liveAudioContext } from "../constants";
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { WAMAvailablePlugin, appEnvironment } from "./AppEnvironment";
import { MidiTrack } from "../midi/MidiTrack";
import { MidiInstrument } from "../midi/MidiInstrument";
import { AudioTrack } from "./AudioTrack";

/**
 * Adds a WAM dsp to a track
 */
export async function addAvailableWamToTrack(track: AudioTrack | MidiTrack, wam: WAMAvailablePlugin) {
  const [hostGroupId] = nullthrows(appEnvironment.wamHostGroup.get());
  switch (wam.pluginKind) {
    case "-a":
    case "-m":
      throw new Error(`Generator of kind ${wam.pluginKind} can't be dynamically added, unsupported`);
    case "a-a": {
      const pluginInstance1 = await wam.import.createInstance(hostGroupId, liveAudioContext());
      const pluginDom1 = await pluginInstance1.createGui();
      const module = new PambaWamNode(pluginInstance1, pluginDom1, wam.url);
      track.dsp.addLoadedWAM(module);
      break;
    }
    case "m-a": {
      if (!(track instanceof MidiTrack)) {
        console.warn("Can't add an instrument to a non-midi track");
        break;
      }
      const instance = await wam.import.createInstance(hostGroupId, liveAudioContext());
      const instrument = new MidiInstrument(instance, wam.url);
      await track.changeInstrument(instrument);
    }
  }
}
