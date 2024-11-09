import { AudioPackage } from "../../data/AudioPackage";
import { localAudioPackage } from "../../data/urlProtocol";
import { validateFaustEffectId } from "../../dsp/FAUST_EFFECTS";
import { WAMAvailablePlugin, appEnvironment } from "../../lib/AppEnvironment";
import { AudioStorage } from "../../lib/project/AudioStorage";
import { LibraryItem } from "../Library";

export type PambaDataTransferResourceKind =
  | "application/pamba.project"
  | "application/pamba.audio"
  | "application/pamba.rawaudio"
  | "application/pamba.wam"
  | "application/pamba.fausteffect"
  // instances of constructed objects
  | "application/pamba.effectinstance"
  | "application/pamba.trackinstance"
  | "application/pamba.audioclipinstance";

export type ProjectLibraryItem = Extract<LibraryItem, { kind: "project" }>;
export type AudioLibraryItem = Extract<LibraryItem, { kind: "audio" }>;
export type FaustEffectLibraryItem = Extract<LibraryItem, { kind: "fausteffect" }>;
export type EffectInstanceTransferResource = { kind: "effectinstance"; trackIndex: number; effectIndex: number };
export type TrackInstanceTransferResource = { kind: "trackinstance"; trackIndex: number };
export type AudioClipInstanceTransferResource = { kind: "audioclipinstance"; todo: number };

export type TransferableResource =
  | AudioPackage
  | WAMAvailablePlugin
  | AudioLibraryItem
  | FaustEffectLibraryItem
  | ProjectLibraryItem
  // todo: in some future, change for an effect instance uuid. it's safer and works
  // if the memory state changes while the drag is happening for some reason
  | EffectInstanceTransferResource
  // todo: same as above, in some future change for a uuid
  | TrackInstanceTransferResource
  | AudioClipInstanceTransferResource;

export async function getRackAcceptableDataTransferResources(
  dataTransfer: DataTransfer,
): Promise<Array<WAMAvailablePlugin | FaustEffectLibraryItem | EffectInstanceTransferResource>> {
  const resources = await getTrackAcceptableDataTransferResources(dataTransfer, null as any); // TODO: abstract to not send an invalid null here
  return resources.filter(
    (resource) =>
      resource.kind === "WAMAvailablePlugin" || resource.kind === "fausteffect" || resource.kind === "effectinstance",
  );
}

export async function getTrackHeaderContainerAcceptableDataTransferResources(dataTransfer: DataTransfer) {
  const resultingResources: TransferableResource[] = [];
  // eslint-disable-next-line prefer-const
  let handledInternalFormat = false;

  // Internal Track
  // eslint-disable-next-line prefer-const
  let data = dataTransfer.getData("application/pamba.trackinstance");
  if (data !== "") {
    // for an an existing track instance, data is a json object
    // telling us the track index where the track can currently be found
    const locator = JSON.parse(data) as TrackInstanceTransferResource;
    resultingResources.push(locator);
  }

  if (handledInternalFormat) {
    return resultingResources;
  }

  // we didn't handle an internal format, so we handle files
  for (const file of dataTransfer.files) {
    // // todo: parallel uploads?
    // // todo: what if audio already in library?
    // // todo: formats other than audio
    // const result = await audioStorage.uploadToLibrary(file);
    // if (result instanceof Error) {
    //   throw result;
    // }
    // resultingResources.push(result);
  }

  return resultingResources;
}

export async function getTrackAcceptableDataTransferResources(
  dataTransfer: DataTransfer,
  audioStorage: AudioStorage,
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
    const json = JSON.parse(data) as AudioLibraryItem;
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
    resultingResources.push(availablePlugin.plugin);
    handledInternalFormat = true;
  }

  // Internal Faust Effect
  data = dataTransfer.getData("application/pamba.fausteffect");
  if (data != "") {
    // for faust effects, data is the a library fausteffect object
    const fausteffect = JSON.parse(data) as FaustEffectLibraryItem;
    validateFaustEffectId(fausteffect.id);
    resultingResources.push(fausteffect);
    // TODO:
    handledInternalFormat = true;
  }

  // Internal Effect Instance
  data = dataTransfer.getData("application/pamba.effectinstance");
  if (data != "") {
    // this is an already-initialized faust or wam effect, data is a json object
    // telling us the track index and the effect index where the effect currently can be found
    const locator = JSON.parse(data) as EffectInstanceTransferResource;
    resultingResources.push(locator);
    // TODO:
    handledInternalFormat = true;
  }

  // TODO: can't even be dragged right now
  // Internal Project
  data = dataTransfer.getData("application/pamba.project");
  if (data != "") {
    // for projects, data is a library project id object
    const libproj = JSON.parse(data) as ProjectLibraryItem;
    // TODO: what do we do when a project is dragged onto a track?
    console.warn("unimplemented: loading project, id", libproj.id);
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
