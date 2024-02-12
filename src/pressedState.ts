import { AudioClip } from "./lib/AudioClip";
import { AudioTrack } from "./lib/AudioTrack";
import { TimelinePoint, STimelinePoint } from "./lib/project/TimelinePoint";
import { SPrimitive } from "structured-state";
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
      originalClipStartOffsetSec: number;
      originalClipEndOffsetSec: number;
      inHistory: boolean;
    }>
  | Readonly<{
      // TODO
      status: "dragging_new_audio";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
    }>
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
      originalClipLength: number;
      originalClipTimelineStartSec: number;
      originalBufferOffset: number;
      originalTimelineStartSec: number;
      clip: AudioClip | MidiClip;
      track: AudioTrack | MidiTrack;
      clientX: number;
      clientY: number;
      inHistory: boolean;
    }>
  | Readonly<{
      status: "resizing_track";
      track: AudioTrack | MidiTrack;
      originalHeight: number;
      clientX: number;
      clientY: number;
    }>
  | Readonly<{
      status: "moving_timeline_points";
      points: Set<{ original: STimelinePoint; point: TimelinePoint }>;
      clientX: number;
      limit: [lower: null | TimelinePoint, upper: null | TimelinePoint] | null;
    }>;

export const pressedState = SPrimitive.of<CursorState | null>(null);
