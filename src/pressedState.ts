import AudioClip from "./lib/AudioClip";
import { AudioTrack } from "./lib/AudioTrack";
import { SPrimitive } from "./lib/state/LinkedState";

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

export const pressedState = SPrimitive.of<CursorState | null>(null);