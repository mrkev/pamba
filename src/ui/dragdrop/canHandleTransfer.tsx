import { AudioTrack } from "../../lib/AudioTrack";
import { MidiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { PambaDataTransferResourceKind } from "./getTrackAcceptableDataTransferResources";

/** types one can drag onto tracks */
export function trackCanHandleTransfer(track: AudioTrack | MidiTrack, dataTransfer: DataTransfer) {
  if (track instanceof MidiTrack) {
    return hasResouceKind(
      dataTransfer,
      "application/pamba.wam",
      "application/pamba.fausteffect",
      "application/pamba.effectinstance",
    );
  } else if (track instanceof AudioTrack) {
    return hasResouceKind(
      dataTransfer,
      "application/pamba.audio",
      "application/pamba.rawaudio",
      "application/pamba.wam",
      "application/pamba.fausteffect",
      "application/pamba.effectinstance",
    );
  } else {
    exhaustive(track);
  }
}

/** types one can drag onto the effect rack */
export function effectRackCanHandleTransfer(dataTransfer: DataTransfer) {
  return hasResouceKind(
    dataTransfer,
    "application/pamba.wam",
    "application/pamba.fausteffect",
    "application/pamba.effectinstance",
  );
}

/** types one can drag onto the track header container */
export function trackHeaderContainerCanHandleTransfer(dataTransfer: DataTransfer) {
  return hasResouceKind(dataTransfer, "application/pamba.trackinstance");
}

///////////

export function hasResouceKind(dataTransfer: DataTransfer, ...kinds: PambaDataTransferResourceKind[]) {
  // console.log(dataTransfer.types);
  for (const kind of kinds) {
    if (dataTransfer.types.indexOf(kind) > -1) {
      return true;
    }
  }
  return false;
}