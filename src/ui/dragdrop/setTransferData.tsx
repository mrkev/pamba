import { pressedState } from "../../pressedState";
import {
  EffectInstanceTransferResource,
  TrackInstanceTransferResource,
} from "./getTrackAcceptableDataTransferResources";

export function transferEffectInstance(dataTransfer: DataTransfer, data: EffectInstanceTransferResource): void {
  dataTransfer.setData("application/pamba.effectinstance", JSON.stringify(data));
  pressedState.set({
    status: "dragging_transferable",
    kind: "application/pamba.effectinstance",
  });
}

export function transferTrackInstance(dataTransfer: DataTransfer, data: TrackInstanceTransferResource): void {
  dataTransfer.setData("application/pamba.trackinstance", JSON.stringify(data));
  pressedState.set({
    status: "dragging_transferable",
    kind: "application/pamba.trackinstance",
  });
}
