import { SPrimitive } from "structured-state";
import { AudioClip } from "./lib/AudioClip";
import { AudioTrack } from "./lib/AudioTrack";
import { STimelineT, TimelineT } from "./lib/project/TimelineT";
import { MidiClip } from "./midi/MidiClip";
import { MidiTrack } from "./midi/MidiTrack";
import { Note } from "./midi/SharedMidiTypes";
import { LibraryItem } from "./ui/Library";

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
      status: "dragging_library_item";
      libraryItem: LibraryItem;
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
      points: Set<{ original: STimelineT; point: TimelineT }>;
      clientX: number;
      limit: [lower: null | TimelineT, upper: null | TimelineT] | null;
    }>
  | Readonly<{
      status: "moving_notes";
      notes: Set<Note>;
      clientX: number;
      clientY: number;
    }>;

export const pressedState = SPrimitive.of<CursorState | null>(null);
