import { EffectInstanceTransferResource } from "./getTrackAcceptableDataTransferResources";

export function transferEffectInstance(dataTransfer: DataTransfer, data: EffectInstanceTransferResource): void {
  dataTransfer.setData("application/pamba.effectinstance", JSON.stringify(data));
}
