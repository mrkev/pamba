import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { LinkedState } from "../LinkedState";

export type CursorState =
  | {
      status: "moving_clip";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      clip: AudioClip;
      track: AudioTrack;
      originalTrack: AudioTrack;
      originalClipOffsetSec: number;
    }
  | {
      status: "selecting";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      // time at original click
      startTime: number;
    }
  | {
      status: "resizing_clip";
      from: "start" | "end";
      originalClipEndPosSec: number;
      originalClipStartPosSec: number;
      originalClipOffsetSec: number;
      clip: AudioClip;
      clientX: number;
      clientY: number;
    };

export const pressedState: LinkedState<CursorState | null> =
  LinkedState.of<CursorState | null>(null);
