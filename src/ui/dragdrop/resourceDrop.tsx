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
import { nullthrows } from "../../utils/nullthrows";

export const loadAudioClipIntoTrack = async (
  project: AudioProject,
  url: string,
  track: AudioTrack,
  startOffsetSec: number,
  name: string,
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
  project: AudioProject,
) {
  switch (resource.kind) {
    case "trackinstance":
      console.warn("can't drop a trackinstance onto an audio track");
      break;
    case "WAMAvailablePlugin":
      await addAvailableWamToTrack(track, resource, "last");
      break;
    case "AudioPackage.local":
      console.warn("NOT IMEPLEMENTED");
      break;
    case "audio":
      const startOffsetSec = project.viewport.pxToSecs(position);
      await loadAudioClipIntoTrack(project, resource.url, track, startOffsetSec, resource.name);
      break;
    case "fausteffect":
      await track.dsp.addFaustEffect(resource.id, "last");
      break;
    case "effectinstance":
      const srcTrack = nullthrows(
        project.allTracks.at(resource.trackIndex),
        `no track at index ${resource.trackIndex}`,
      );
      const effectInstance = nullthrows(
        srcTrack.dsp.effects.at(resource.effectIndex),
        `track ${resource.trackIndex} has no effect at index ${resource.effectIndex}`,
      );

      // remove effect from source track
      srcTrack.dsp.effects.splice(resource.effectIndex, 1);
      // insert where appropriate
      track.dsp.addEffect(effectInstance, "last");
      break;
    default:
      exhaustive(resource);
  }
}

export async function handleDropOntoMidiTrack(
  track: MidiTrack,
  resource: TransferableResource,
  position: number,
  project: AudioProject,
) {
  switch (resource.kind) {
    case "trackinstance":
      throw new Error("Can't transfer trackinstance onto MidiTrack");
    case "WAMAvailablePlugin":
      ignorePromise(addAvailableWamToTrack(track, resource, "last"));
      break;
    case "AudioPackage.local":
      throw new Error("Can't transfer AudioPackage.local onto MidiTrack");
    case "audio":
      throw new Error("Can't transfer audio onto MidiTrack");
    case "fausteffect":
      ignorePromise(track.dsp.addFaustEffect(resource.id, "last"));
      break;
    case "effectinstance":
      const srcTrack = nullthrows(
        project.allTracks.at(resource.trackIndex),
        `no track at index ${resource.trackIndex}`,
      );
      const effectInstance = nullthrows(
        srcTrack.dsp.effects.at(resource.effectIndex),
        `track ${resource.trackIndex} has no effect at index ${resource.effectIndex}`,
      );

      // remove effect from source track
      srcTrack.dsp.effects.splice(resource.effectIndex, 1);
      // insert where appropriate
      track.dsp.addEffect(effectInstance, "last");
      break;
    default:
      exhaustive(resource);
  }
}

export async function handleDropOntoTimeline(resources: TransferableResource[], project: AudioProject) {
  for (const resource of resources) {
    switch (resource.kind) {
      case "trackinstance":
        throw new Error("Can't transfer trackinstance onto timeline");
      case "AudioPackage.local":
        break;
      case "fausteffect": {
        const track = AudioProject.addAudioTrack(project, "bottom");
        await track.dsp.addFaustEffect(resource.id, "last");
        break;
      }
      case "WAMAvailablePlugin": {
        switch (resource.pluginKind) {
          case "a-a": {
            // todo: if multiple of these just create one track with many effects?
            const track = AudioProject.addAudioTrack(project, "bottom");
            await addAvailableWamToTrack(track, resource, "last");
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
      case "effectinstance":
        throw new Error("effectinstance, not implemented");
      default:
        exhaustive(resource);
    }
  }
}

export async function handleDropOntoEffectRack(
  resource: TransferableResource,
  chainPosition: number | null,
  track: AudioTrack | MidiTrack,
  project: AudioProject,
) {
  switch (resource.kind) {
    case "trackinstance":
      throw new Error("Can't transfer trackinstance onto effect rack");
    case "WAMAvailablePlugin":
      await addAvailableWamToTrack(track, resource, chainPosition ?? "last");
      break;
    case "fausteffect":
      await track.dsp.addFaustEffect(resource.id, chainPosition ?? "last");
      break;
    case "effectinstance": {
      const srcTrack = nullthrows(
        project.allTracks.at(resource.trackIndex),
        `no track at index ${resource.trackIndex}`,
      );
      const effectInstance = nullthrows(
        srcTrack.dsp.effects.at(resource.effectIndex),
        `track ${resource.trackIndex} has no effect at index ${resource.effectIndex}`,
      );

      // remove effect from source track
      srcTrack.dsp.effects.splice(resource.effectIndex, 1);
      // insert where appropriate
      track.dsp.addEffect(effectInstance, chainPosition ?? "last");
      break;
    }

    // Shouldn't happen, cause resources are those returned by getRackAcceptableDataTransferResources
    case "AudioPackage.local":
      throw new Error("Can't transfer AudioPackage.local onto EffectRack");
    case "audio":
      throw new Error("Can't transfer audio onto EffectRack");
    default:
      exhaustive(resource);
  }
}

export async function handleDropOntoTrackHeaderContainer(
  resource: TransferableResource,
  positionToDropInto: number | null,
  project: AudioProject,
) {
  switch (resource.kind) {
    case "trackinstance": {
      const srcTrack = nullthrows(
        project.allTracks.at(resource.trackIndex),
        `no track at index ${resource.trackIndex}`,
      );

      // remove track from project
      project.allTracks.splice(resource.trackIndex, 1);
      // insert where appropriate
      project.allTracks.splice(positionToDropInto ?? project.allTracks.length, 0, srcTrack);

      break;
    }

    case "WAMAvailablePlugin":
    case "fausteffect":
    case "effectinstance":
    case "AudioPackage.local":
    case "audio":
      throw new Error(`Can't transfer ${resource.kind} onto track header`);
    default:
      exhaustive(resource);
  }
}
