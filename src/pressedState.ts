import { AudioClip } from "./lib/AudioClip";
import { AudioTrack } from "./lib/AudioTrack";
import { SPrimitive } from "./lib/state/LinkedState";
import { MidiClip } from "./midi/MidiClip";
import { MidiTrack } from "./midi/MidiTrack";

export type CursorState =
  | Readonly<{
      status: "moving_clip";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      clip: AudioClip | MidiClip;
      track: AudioTrack | MidiTrack;
      originalTrack: AudioTrack | MidiTrack;
      originalClipOffsetSec: number;
    }>
  | Readonly<{
      status: "dragging_new_audio";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
    }>
  // TODO: selectring_track_time
  // TODO: selecting_global_time (time header)
  | Readonly<{
      status: "selecting_global_time";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      // time at original click
      startTime: number;
    }>
  | Readonly<{
      status: "selecting_track_time";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      // time at original click
      startTime: number;
      track: AudioTrack | MidiTrack;
    }>
  | Readonly<{
      status: "resizing_clip";
      from: "start" | "end";
      originalClipEndPosSec: number;
      originalClipStartPosSec: number;
      originalClipOffsetSec: number;
      clip: AudioClip | MidiClip;
      clientX: number;
      clientY: number;
    }>
  | Readonly<{
      status: "resizing_track";
      track: AudioTrack | MidiTrack;
      originalHeight: number;
      clientX: number;
      clientY: number;
    }>;

export const pressedState = SPrimitive.of<CursorState | null>(null);
