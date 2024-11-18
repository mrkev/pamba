import { pressedState } from "../pressedState";
import { exhaustive } from "../../utils/exhaustive";
import {
  AudioClipInstanceTransferResource,
  AudioLibraryItem,
  EffectInstanceTransferResource,
  FaustEffectLibraryItem,
  ProjectLibraryItem,
  TrackInstanceTransferResource,
  TransferableResource,
} from "./getTrackAcceptableDataTransferResources";

function formatOfResource(resource: TransferableResource) {
  switch (resource.kind) {
    case "AudioPackage.local":
    case "WAMAvailablePlugin":
      throw new Error("lol unimplemented. these are just strings");
    case "miditransfer":
      throw new Error("rn just used for midi files, no internal type??");
    case "fausteffect":
      return "application/pamba.fausteffect";
    case "project":
      return "application/pamba.project";
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
    | AudioLibraryItem
    | FaustEffectLibraryItem
    | ProjectLibraryItem,
): void {
  const format = formatOfResource(data);
  dataTransfer.setData(format, JSON.stringify(data));
  pressedState.set({
    status: "dragging_transferable",
    kind: format,
  });
}
