import { SPrimitive } from "structured-state";
import { STimelineT } from "../data/serializable";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { TimelineT } from "../lib/project/TimelineT";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { PambaDataTransferResourceKind } from "./dragdrop/getTrackAcceptableDataTransferResources";

export type CursorState =
  | Readonly<{
      status: "moving_clip";
      // Original clientX/Y of event
      clientX: number;
      clientY: number;
      clip: AudioClip | MidiClip;
      track: AudioTrack | MidiTrack;
      originalTrack: AudioTrack | MidiTrack;
      originalClipStart: TimelineT;
      clipForRendering: AudioClip | MidiClip;
      inHistory: boolean;
    }>
  | Readonly<{
      status: "dragging_transferable";
      kind: PambaDataTransferResourceKind;
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
      originalClipStart: TimelineT;
      originalClipLength: TimelineT;
      originalBufferOffset: TimelineT;
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
    }>;

export const pressedState = SPrimitive.of<CursorState | null>(null);
