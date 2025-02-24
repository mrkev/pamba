import { liveAudioContext } from "../constants";
import { MidiInstrument } from "../midi/MidiInstrument";
import { MidiTrack } from "../midi/MidiTrack";
import { assert, nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { WAMAvailablePlugin, appEnvironment } from "./AppEnvironment";
import { AudioTrack } from "./AudioTrack";

/**
 * Adds a WAM dsp to a track
 */
export async function addAvailableWamToTrack(
  track: AudioTrack | MidiTrack,
  wam: WAMAvailablePlugin,
  index: number | "first" | "last",
) {
  const [hostGroupId] = nullthrows(appEnvironment.wamHostGroup.get());
  switch (wam.pluginKind) {
    case "-a":
    case "-m":
      throw new Error(`Generator of kind ${wam.pluginKind} can't be dynamically added, unsupported`);
    case "a-a": {
      const module = await PambaWamNode.fromImportAtURL(wam.import, wam.url, hostGroupId, liveAudioContext(), null);
      track.dsp.addEffect(module, index);
      break;
    }
    case "m-a": {
      if (!(track instanceof MidiTrack)) {
        console.warn("Can't add an instrument to a non-midi track");
        break;
      }

      assert(wam.pluginKind === "m-a", "plugin is not an instrument");
      const instrument = await MidiInstrument.createFromPlugin(wam as any);

      const open = appEnvironment.openEffects.has(track.instrument.get());
      await track.changeInstrument(instrument);
      if (open) {
        appEnvironment.openEffects.add(instrument);
      }
    }
  }
}
