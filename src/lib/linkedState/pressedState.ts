import AudioClip from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { LinkedState } from "../state/LinkedState";

export type CursorState =
  | Readonly<{
      status: "moving_clip";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      clip: AudioClip;
      track: AudioTrack;
      originalTrack: AudioTrack;
      originalClipOffsetSec: number;
    }>
  | Readonly<{
      status: "selecting";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      // time at original click
      startTime: number;
    }>
  | Readonly<{
      status: "resizing_clip";
      from: "start" | "end";
      originalClipEndPosSec: number;
      originalClipStartPosSec: number;
      originalClipOffsetSec: number;
      clip: AudioClip;
      clientX: number;
      clientY: number;
    }>
  | Readonly<{
      status: "resizing_track";
      track: AudioTrack;
      originalHeight: number;
      clientX: number;
      clientY: number;
    }>;

export const pressedState = LinkedState.of<CursorState | null>(null);
