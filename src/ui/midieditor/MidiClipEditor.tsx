import { useLinkAsState } from "marked-subbable";
import { usePrimitive } from "structured-state";
import { MIDI_CLIP_EDITOR_MAX_H_SCALE } from "../../constants";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { AnalizedPlayer } from "../../lib/io/AnalizedPlayer";
import { AudioProject } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { midiTrack, MidiTrack } from "../../midi/MidiTrack";
import { ClipPropsEditor, EditorSection } from "../ClipPropsEditor";
import { UtilitySToggle, UtilityToggle } from "../UtilityToggle";
import { MidiClipEditorPianoRoll } from "./MidiClipEditorPianoRoll";

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
  const [noteHeight, setNoteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [pxPerPulse, setPxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [secondarySel] = useLinkAsState(project.secondarySelection);
  const [panelTool] = usePrimitive(project.panelTool);
  const [muted] = usePrimitive(clip.muted);
  const [snap] = usePrimitive(project.midi.snap);
  const [snapDivision] = usePrimitive(project.midi.snapDivision);

  // Keyboard shortcuts (nudge, select-all, delete) live in documentCommands as `when`-gated
  // commands scoped to the focused MIDI editor — no editor-local key handling here.

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

        <div className="flex flex-row" style={{ gap: 4, alignItems: "center" }}>
          <UtilitySToggle title={"hear notes"} sbool={project.hearNotes}>
            <i className="ri-headphone-fill"></i>
          </UtilitySToggle>
          <UtilityToggle
            title={"snap to grid (hold ⌘ to invert)"}
            toggled={snap}
            onToggle={(toggled) => project.midi.snap.set(toggled)}
          >
            <i className="ri-magnet-line"></i>
          </UtilityToggle>
          <select
            title={"grid resolution"}
            value={snapDivision}
            onChange={(e) => project.midi.snapDivision.set(parseInt(e.target.value, 10))}
          >
            <option value={PPQN}>1/4</option>
            <option value={PPQN / 2}>1/8</option>
            <option value={PPQN / 4}>1/16</option>
            <option value={PPQN / 8}>1/32</option>
            <option value={PPQN / 3}>1/8T</option>
            <option value={PPQN / 6}>1/16T</option>
          </select>
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
