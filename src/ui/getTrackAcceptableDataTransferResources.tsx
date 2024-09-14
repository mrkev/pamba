import { AudioPackage } from "../data/AudioPackage";
import { localAudioPackage } from "../data/urlProtocol";
import { WAMAvailablePlugin, appEnvironment } from "../lib/AppEnvironment";
import { AudioStorage } from "../lib/project/AudioStorage";
import { LibraryItem } from "./Library";

type AudioLibraryItem = Extract<LibraryItem, { kind: "audio" }>;
export async function getTrackAcceptableDataTransferResources(
  dataTransfer: DataTransfer,
  audioStorage: AudioStorage
): Promise<Array<AudioPackage | WAMAvailablePlugin | AudioLibraryItem>> {
  const resultingResources: Array<AudioPackage | WAMAvailablePlugin | AudioLibraryItem> = [];
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

  // TODO: can't even be dragged right now
  // Internal Project
  data = dataTransfer.getData("application/pamba.project");
  if (data != "") {
    // for projects, data is the project id
    const id = data;
    // TODO: what do we do when a project is tragged into a track?
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
