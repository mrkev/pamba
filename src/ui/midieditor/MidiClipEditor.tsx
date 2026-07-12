import { useLinkAsState } from "marked-subbable";
import { useCallback } from "react";
import { usePrimitive } from "structured-state";
import { DEFAULT_NOTE_DURATION, MIDI_CLIP_EDITOR_MAX_H_SCALE } from "../../constants";
import { keyChord } from "../../input/KeyChord";
import { AnalizedPlayer } from "../../lib/io/AnalizedPlayer";
import { AudioProject } from "../../lib/project/AudioProject";
import { midiClip, MidiClip } from "../../midi/MidiClip";
import { midiTrack, MidiTrack } from "../../midi/MidiTrack";
import { ClipPropsEditor, EditorSection } from "../ClipPropsEditor";
import { UtilitySToggle, UtilityToggle } from "../UtilityToggle";
import { MidiClipEditorPianoRoll } from "./MidiClipEditorPianoRoll";
import { useConditionalKeydown } from "./useConditionalKeyboardEvents";

export function MidiClipEditor({
  clip,
  track,
  player,
  project,
}: {
  clip: MidiClip;
  track: MidiTrack;
  player: AnalizedPlayer;
  project: AudioProject;
}) {
  // const containerRef = useRef<HTMLDivElement>(null);
  const [noteHeight, setNoteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [pxPerPulse, setPxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [secondarySel] = useLinkAsState(project.secondarySelection);
  const [panelTool] = usePrimitive(project.panelTool);
  const [activePanel] = useLinkAsState(project.activePanel);
  const [muted] = usePrimitive(clip.muted);

  useConditionalKeydown(
    activePanel === "secondary",
    useCallback((e: KeyboardEvent) => {
      switch (keyChord.ofEvent(e)) {
        case keyChord.ofKeys("KeyA", "meta"):
          // TODO: select all
          break;
      }
    }, []),
  );

  useConditionalKeydown(
    activePanel === "secondary" && secondarySel?.status === "notes",
    useCallback(
      (e: KeyboardEvent) => {
        if (secondarySel?.status !== "notes") {
          throw new Error("impossible");
        }

        // nudge selected notes: left/right by a grid step (16th note), up/down a semitone
        switch (keyChord.ofEvent(e)) {
          case keyChord.ofKeys("ArrowRight"):
            e.preventDefault();
            midiClip.moveSelectedNotes(track, clip, DEFAULT_NOTE_DURATION, 0);
            break;
          case keyChord.ofKeys("ArrowLeft"):
            e.preventDefault();
            midiClip.moveSelectedNotes(track, clip, -DEFAULT_NOTE_DURATION, 0);
            break;
          case keyChord.ofKeys("ArrowUp"):
            e.preventDefault();
            midiClip.moveSelectedNotes(track, clip, 0, 1);
            break;
          case keyChord.ofKeys("ArrowDown"):
            e.preventDefault();
            midiClip.moveSelectedNotes(track, clip, 0, -1);
            break;
        }
      },
      [clip, track, secondarySel?.status],
    ),
  );

  return (
    <>
      <div className="flex flex-col items-stretch" style={{ gap: 4 }}>
        <ClipPropsEditor clip={clip} project={project} track={track} />
        <EditorSection title={"Midi Clip"}>
          <UtilityToggle
            title={"muted"}
            onToggle={(muted) => {
              if (muted) {
                midiTrack.muteClip(track, clip);
              } else {
                midiTrack.unmuteClip(track, clip);
              }
            }}
            // do this given there is a BUG on usePrimitive, muted, and clip.muted.get() are different
            toggled={muted && clip.muted.get()}
          >
            <i className="ri-volume-mute-fill"></i>
          </UtilityToggle>
        </EditorSection>
      </div>

      <div className="grid grow" style={{ gridTemplateRows: "1fr auto", gridTemplateColumns: "auto 1fr", gap: 4 }}>
        <div className="flex flex-col">
          <UtilityToggle
            title={"selection tool"}
            toggled={panelTool === "move"}
            onToggle={function (): void {
              project.panelTool.set("move");
            }}
          >
            <i className="ri-cursor-fill"></i>
          </UtilityToggle>
          <UtilityToggle
            title={"draw notes"}
            toggled={panelTool === "draw"}
            onToggle={function (): void {
              project.panelTool.set("draw");
              // unselect notes on changing to draw tool
              if (secondarySel?.status === "notes") {
                project.secondarySelection.set(null);
              }
            }}
          >
            <i className="ri-edit-fill"></i>
          </UtilityToggle>

          <input
            // onKeyDown={(e) => e.preventDefault()}
            // onKeyPress={(e) => e.preventDefault()}
            type="range"
            min={3}
            max={20}
            step={1}
            value={noteHeight}
            title="vertical zoom"
            className="grow"
            style={{
              marginTop: 4,
              writingMode: "vertical-lr",
              direction: "rtl",
            }}
            onChange={(e) => {
              const newVal = parseFloat(e.target.value);
              setNoteHeight(newVal);
            }}
          />
        </div>

        {/*  piano roll notes are PPQN / 4 wide */}
        <MidiClipEditorPianoRoll clip={clip} track={track} project={project} player={player} />
        <div />

        <div className="flex flex-row">
          <UtilitySToggle title={"hear notes"} sbool={project.hearNotes}>
            <i className="ri-headphone-fill"></i>
          </UtilitySToggle>
          <div className="grow"></div>
          <input
            type="range"
            min={1}
            max={MIDI_CLIP_EDITOR_MAX_H_SCALE}
            step={0.1}
            value={pxPerPulse}
            title="Horizontal Zoom level"
            onChange={(e) => {
              const newVal = parseFloat(e.target.value);
              setPxPerPulse(newVal);
            }}
          />
        </div>
      </div>
    </>
  );
}
