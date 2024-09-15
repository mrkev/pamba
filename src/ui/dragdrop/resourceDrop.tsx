import { history } from "structured-state";
import { secs } from "../../lib/AbstractClip";
import { addAvailableWamToTrack } from "../../lib/addAvailableWamToTrack";
import { AudioClip } from "../../lib/AudioClip";
import { AudioTrack } from "../../lib/AudioTrack";
import { AudioProject } from "../../lib/project/AudioProject";
import { ProjectTrack } from "../../lib/ProjectTrack";
import { MidiInstrument } from "../../midi/MidiInstrument";
import { MidiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { ignorePromise } from "../../utils/ignorePromise";
import { TransferableResource } from "./getTrackAcceptableDataTransferResources";

export const loadAudioClipIntoTrack = async (
  project: AudioProject,
  url: string,
  track: AudioTrack,
  startOffsetSec: number,
  name: string
): Promise<void> => {
  try {
    if (!project.canEditTrack(project, track)) {
      return;
    }
    const clip = await AudioClip.fromURL(url, name);
    history.record(() => {
      // load clip
      clip.timelineStartSec = secs(startOffsetSec);
      ProjectTrack.addClip(project, track, clip);
    });
  } catch (e) {
    console.trace(e);
    return;
  }
};

export async function handleDropOntoAudioTrack(
  track: AudioTrack,
  resource: TransferableResource,
  position: number,
  project: AudioProject
) {
  switch (resource.kind) {
    case "WAMAvailablePlugin":
      ignorePromise(addAvailableWamToTrack(track, resource));
      break;
    case "AudioPackage.local":
      console.warn("NOT IMEPLEMENTED");
      break;
    case "audio":
      const startOffsetSec = project.viewport.pxToSecs(position);
      ignorePromise(loadAudioClipIntoTrack(project, resource.url, track, startOffsetSec, resource.name));
      break;
    case "fausteffect":
      ignorePromise(track.dsp.addEffect(resource.id));
      break;
    default:
      exhaustive(resource);
  }
}

export async function handleDropOntoMidiTrack(
  track: MidiTrack,
  resource: TransferableResource,
  position: number,
  project: AudioProject
) {
  switch (resource.kind) {
    case "WAMAvailablePlugin":
      ignorePromise(addAvailableWamToTrack(track, resource));
      break;
    case "AudioPackage.local":
      throw new Error("Can't transfer AudioPackage.local onto MidiTrack");
    case "audio":
      throw new Error("Can't transfer audio onto MidiTrack");
    case "fausteffect":
      ignorePromise(track.dsp.addEffect(resource.id));
      break;
    default:
      exhaustive(resource);
  }
}

export async function handleDropIntoTimeline(resources: TransferableResource[], project: AudioProject) {
  for (const resource of resources) {
    switch (resource.kind) {
      case "AudioPackage.local":
        break;
      case "fausteffect": {
        const track = AudioProject.addAudioTrack(project, "bottom");
        await track.dsp.addEffect(resource.id);
        break;
      }
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
