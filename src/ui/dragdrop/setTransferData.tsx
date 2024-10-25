import { pressedState } from "../../pressedState";
import { exhaustive } from "../../utils/exhaustive";
import {
  AudioClipInstanceTransferResource,
  AudioLibraryItem,
  EffectInstanceTransferResource,
  TrackInstanceTransferResource,
  TransferableResource,
} from "./getTrackAcceptableDataTransferResources";

function formatOfResource(resource: TransferableResource) {
  switch (resource.kind) {
    case "AudioPackage.local":
    case "WAMAvailablePlugin":
    case "fausteffect":
      throw new Error("lol unimplemented. these are just strings");
    case "audio":
      return "application/pamba.rawaudio";
    case "effectinstance":
      return "application/pamba.effectinstance";
    case "trackinstance":
      return "application/pamba.trackinstance";
    case "audioclipinstance":
      return "application/pamba.audioclipinstance";
    default:
      exhaustive(resource);
  }
}

export function transferObject(
  dataTransfer: DataTransfer,
  data:
    | EffectInstanceTransferResource
    | TrackInstanceTransferResource
    | AudioClipInstanceTransferResource
    | AudioLibraryItem,
): void {
  const format = formatOfResource(data);
  dataTransfer.setData(format, JSON.stringify(data));
  pressedState.set({
    status: "dragging_transferable",
    kind: format,
  });
}
