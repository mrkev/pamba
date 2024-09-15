import { AudioPackage } from "../../data/AudioPackage";
import { addAvailableWamToTrack } from "../../lib/addAvailableWamToTrack";
import { WAMAvailablePlugin } from "../../lib/AppEnvironment";
import { AudioTrack } from "../../lib/AudioTrack";
import { AudioProject } from "../../lib/project/AudioProject";
import { MidiInstrument } from "../../midi/MidiInstrument";
import { MidiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { ignorePromise } from "../../utils/ignorePromise";
import { AudioLibraryItem } from "./getTrackAcceptableDataTransferResources";
import { loadAudioClipIntoTrack } from "../TrackA";

export async function handleDropOntoAudioTrack(
  track: AudioTrack,
  resource: AudioPackage | WAMAvailablePlugin | AudioLibraryItem,
  position: number,
  project: AudioProject
) {
  switch (resource.kind) {
    case "WAMAvailablePlugin":
      await addAvailableWamToTrack(track, resource);
      break;
    case "AudioPackage.local":
      console.warn("NOT IMEPLEMENTED");
      break;
    case "audio":
      const startOffsetSec = project.viewport.pxToSecs(position);
      ignorePromise(loadAudioClipIntoTrack(project, resource.url, track, startOffsetSec, resource.name));
      break;
    default:
      exhaustive(resource);
  }
}

export async function handleDropIntoTimeline(
  resources: Array<AudioPackage | WAMAvailablePlugin | AudioLibraryItem>,
  project: AudioProject
) {
  for (const resource of resources) {
    switch (resource.kind) {
      case "AudioPackage.local":
        break;
      case "WAMAvailablePlugin": {
        switch (resource.pluginKind) {
          case "a-a": {
            // todo: if multiple of these just create one track with many effects?
            const track = AudioProject.addAudioTrack(project, "bottom");
            await addAvailableWamToTrack(track, resource);
            break;
          }
          case "-a":
          case "-m":
            console.warn("UNIMPLEMENTED", resource.pluginKind);
            break;
          case "m-a": {
            const instrument = await MidiInstrument.createFromPlugin(resource as any); //refined in the switch above
            const newTrack = await MidiTrack.createWithInstrument(instrument, "midi track"); // todo: instrument name
            await AudioProject.addMidiTrack(project, "bottom", newTrack);
            break;
          }

          default:
            exhaustive(resource.pluginKind);
        }

        break;
      }
      case "audio":
        const track = AudioProject.addAudioTrack(project, "bottom");
        // todo: if multiple of these just create one track with many clips
        await loadAudioClipIntoTrack(project, resource.url, track, 0, resource.name);

        break;
      default:
        exhaustive(resource);
    }
  }
}
