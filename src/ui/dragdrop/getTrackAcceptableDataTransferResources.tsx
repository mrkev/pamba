import { AudioPackage } from "../../data/AudioPackage";
import { localAudioPackage } from "../../data/urlProtocol";
import { validateFaustEffectId } from "../../dsp/FAUST_EFFECTS";
import { WAMAvailablePlugin, appEnvironment } from "../../lib/AppEnvironment";
import { AudioTrack } from "../../lib/AudioTrack";
import { AudioStorage } from "../../lib/project/AudioStorage";
import { MidiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { LibraryItem } from "../Library";

type PambaDataTransferResourceKind =
  | "application/pamba.audio"
  | "application/pamba.rawaudio"
  | "application/pamba.wam"
  | "application/pamba.project"
  | "application/pamba.fausteffect";

export function hasResouceKind(dataTransfer: DataTransfer, ...kinds: PambaDataTransferResourceKind[]) {
  for (const kind of kinds) {
    if (dataTransfer.types.indexOf(kind) > -1) {
      return true;
    }
  }
  return false;
}

export function trackCanHandleTransfer(track: AudioTrack | MidiTrack, dataTransfer: DataTransfer) {
  if (track instanceof MidiTrack) {
    return hasResouceKind(dataTransfer, "application/pamba.wam", "application/pamba.fausteffect");
  } else if (track instanceof AudioTrack) {
    return hasResouceKind(
      dataTransfer,
      "application/pamba.audio",
      "application/pamba.rawaudio",
      "application/pamba.wam",
      "application/pamba.fausteffect"
    );
  } else {
    exhaustive(track);
  }
}

export function effectRackCanHandleTransfer(dataTransfer: DataTransfer) {
  return hasResouceKind(dataTransfer, "application/pamba.wam", "application/pamba.fausteffect");
}

export async function getRackAcceptableDataTransferResources(
  dataTransfer: DataTransfer
): Promise<Array<WAMAvailablePlugin | FaustEffectLibraryItem>> {
  const resources = await getTrackAcceptableDataTransferResources(dataTransfer, null as any); // TODO: abstract to not send an invalid null here
  return resources.filter((resource) => resource.kind === "WAMAvailablePlugin" || resource.kind === "fausteffect");
}

export type AudioLibraryItem = Extract<LibraryItem, { kind: "audio" }>;
export type FaustEffectLibraryItem = Extract<LibraryItem, { kind: "fausteffect" }>;

export type TransferableResource = AudioPackage | WAMAvailablePlugin | AudioLibraryItem | FaustEffectLibraryItem;

export async function getTrackAcceptableDataTransferResources(
  dataTransfer: DataTransfer,
  audioStorage: AudioStorage
): Promise<TransferableResource[]> {
  const resultingResources: TransferableResource[] = [];
  let handledInternalFormat = false;

  // Internal Audio
  let data = dataTransfer.getData("application/pamba.audio");
  if (data !== "") {
    // for audio, data is the url. we get the package
    const url = data;
    const audioPackage = await localAudioPackage(url);
    if (audioPackage == null) {
      throw new Error("audio package not found, url: " + url);
    }
    resultingResources.push(audioPackage);
    handledInternalFormat = true;
  }

  // Internal Raw Audio URL
  data = dataTransfer.getData("application/pamba.rawaudio");
  if (data !== "") {
    // for raw audio, data is the library item, which includes url and audio. we just return it
    const json = JSON.parse(data) as Extract<LibraryItem, { kind: "audio" }>;
    resultingResources.push(json);
    handledInternalFormat = true;
  }

  // Internal WAM
  data = dataTransfer.getData("application/pamba.wam");
  if (data !== "") {
    // for wams, data is the url used to id in appEnvironment
    const url = data;
    const availablePlugin = appEnvironment.wamPlugins.get(url);
    if (availablePlugin == null) {
      throw new Error("unavailable wam plugin " + url);
    }
    resultingResources.push(availablePlugin);
    handledInternalFormat = true;
  }

  // Internal Faust Effect
  data = dataTransfer.getData("application/pamba.fausteffect");
  if (data != "") {
    // for faust effects, data is the effect id
    const id = data;
    resultingResources.push({ kind: "fausteffect", id: validateFaustEffectId(id) });
    // TODO:
    handledInternalFormat = true;
  }

  // TODO: can't even be dragged right now
  // Internal Project
  data = dataTransfer.getData("application/pamba.project");
  if (data != "") {
    // for projects, data is the project id
    const id = data;
    // TODO: what do we do when a project is dragged onto a track?
    console.warn("unimplemented: loading project, id", id);
    handledInternalFormat = true;
  }

  if (handledInternalFormat) {
    return resultingResources;
  }

  // we didn't handle an internal format, so we handle files
  for (const file of dataTransfer.files) {
    // todo: parallel uploads?
    // todo: what if audio already in library?
    // todo: formats other than audio
    const result = await audioStorage.uploadToLibrary(file);
    if (result instanceof Error) {
      throw result;
    }

    resultingResources.push(result);
  }

  return resultingResources;
}
