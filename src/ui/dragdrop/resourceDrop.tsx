import { history } from "structured-state";
import { addAvailableWamToTrack } from "../../lib/addAvailableWamToTrack";
import { AudioClip } from "../../lib/AudioClip";
import { AudioTrack } from "../../lib/AudioTrack";
import { AudioProject } from "../../lib/project/AudioProject";
import { ProjectTrack } from "../../lib/ProjectTrack";
import { MidiClip } from "../../midi/MidiClip";
import { MidiInstrument } from "../../midi/MidiInstrument";
import { MidiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { ignorePromise } from "../../utils/ignorePromise";
import { nullthrows } from "../../utils/nullthrows";
import { ONE_BAR_PULSES } from "../../wam/pianorollme/MIDIConfiguration";
import { TransferableResource } from "./getTrackAcceptableDataTransferResources";

export const addMidiClipsIntoTrack = (project: AudioProject, track: MidiTrack, clips: MidiClip[]): void => {
  try {
    if (!project.canEditTrack(project, track)) {
      return;
    }
    history.record("insert audio clip", () => {
      for (const clip of clips) {
        ProjectTrack.addClip(project, track, clip);
      }
    });
  } catch (e) {
    console.trace(e);
    return;
  }
};

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
    history.record("insert audio clip", () => {
      // load clip
      clip.timelineStart.set(startOffsetSec, "seconds");
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
      project.dspExpandedTracks.add(track);
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
      project.dspExpandedTracks.add(track);
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
      project.dspExpandedTracks.add(track);
      break;
    case "audioclipinstance":
      throw new Error("TODO: unimplemented");
    case "miditransfer":
    case "project":
      throw new Error(`Can't transfer ${resource.kind} onto audio track`);

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
    case "miditransfer": {
      const clips = [];
      let lastEnd = position;
      for (const track of resource.tracks) {
        const lastNote = track.notes.at(-1);
        const length = lastNote == null ? ONE_BAR_PULSES : lastNote[0] + lastNote[2];
        const clip = MidiClip.of(track.name, lastEnd, length, track.notes);
        clips.push(clip);
        lastEnd = lastEnd + length;
      }
      addMidiClipsIntoTrack(project, track, clips);
      break;
    }
    case "audioclipinstance":
    case "project":
      throw new Error(`Can't transfer ${resource.kind} onto MidiTrack`);
    default:
      exhaustive(resource);
  }
}

export async function handleDropOntoTimelineWhitespace(resources: TransferableResource[], project: AudioProject) {
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
      case "miditransfer": {
        for (const track of resource.tracks) {
          const lastNote = track.notes.at(-1);
          const length = lastNote == null ? ONE_BAR_PULSES : lastNote[0] + lastNote[2];
          const newTrack = await MidiTrack.createDefault(track.name, [MidiClip.of(track.name, 0, length, track.notes)]);
          await AudioProject.addMidiTrack(project, "bottom", newTrack);
        }
        break;
      }
      case "effectinstance":
        throw new Error("effectinstance, not implemented");
      case "audioclipinstance":
        throw new Error("TODO: create a new track with clip?");
      case "project":
        throw new Error(`Can't transfer ${resource.kind} onto timeline whitespace`);

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
    case "audioclipinstance":
    case "AudioPackage.local":
    case "audio":
    case "project":
    case "miditransfer":
      throw new Error(`Can't transfer ${resource.kind} onto EffectRack`);
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

      // reorder track //
      // remove track from project
      project.allTracks.splice(resource.trackIndex, 1);
      // insert where appropriate
      project.allTracks.splice(positionToDropInto ?? project.allTracks.length, 0, srcTrack);

      break;
    }
    case "audioclipinstance":
    // todo: could create a new track with clip?
    case "WAMAvailablePlugin":
    case "fausteffect":
    case "effectinstance":
    case "AudioPackage.local":
    case "audio":
    case "project":
    case "miditransfer":
      throw new Error(`Can't transfer ${resource.kind} onto track header`);
    default:
      exhaustive(resource);
  }
}
