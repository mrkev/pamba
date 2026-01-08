import { useLinkAsState } from "marked-subbable";
import { usePrimitive } from "structured-state";
import { AudioClip } from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { PrimarySelectionState } from "../lib/project/SelectionState";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { exhaustive } from "../utils/exhaustive";
import { AudioClipEditor } from "./AudioClipEditor";
import { MidiClipEditor } from "./midieditor/MidiClipEditor";
import { AudioTrackEditor } from "./AudioTrackEditor";
import { MidiTrackEditor } from "./MidiTrackEditor";

type BottomPanelDisplay =
  | { kind: "AudioClip"; clip: AudioClip; track: AudioTrack }
  | { kind: "MidiClip"; clip: MidiClip; track: MidiTrack }
  | { kind: "AudioTrack"; track: AudioTrack }
  | { kind: "MidiTrack"; track: MidiTrack };

export function BottomPanel({
  project,
  player,
  renderer,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
}) {
  const [activeTrack] = usePrimitive(project.activeTrack);
  const [selected] = useLinkAsState(project.selected);
  const primarySelection = getValidEditorSelection(selected);

  // useMousePressMove(
  //   testref,
  //   useCallback((kind) => {
  //     console.log(kind);
  //   }, []),
  // );

  switch (primarySelection?.kind) {
    case null:
      return (
        <div>
          nothing to show
          {/* <div ref={testref}>TEST</div>
          <UtilityPanel layout={"horizontal"}>nothing to show</UtilityPanel>
          <UtilityPanel layout={"horizontal"}>nothing to show</UtilityPanel> */}
        </div>
      );
    case "AudioClip":
      return (
        <AudioClipEditor
          clip={primarySelection.clip}
          track={primarySelection.track}
          player={player}
          project={project}
        />
      );
    case "MidiClip":
      return (
        <MidiClipEditor clip={primarySelection.clip} track={primarySelection.track} player={player} project={project} />
      );
    case "AudioTrack":
      return <AudioTrackEditor track={primarySelection.track} project={project} renderer={renderer} />;
    case "MidiTrack":
      return <MidiTrackEditor track={primarySelection.track} project={project} renderer={renderer} />;
    default:
    // exhaustive(primarySelection?.[0]);
  }

  // const clip = activeTrack.pianoRoll.sequencer.pianoRoll.clips["default"];
  // return <OldMidiClipEditor clip={clip} player={player} />;
}
function getValidEditorSelection(selected: PrimarySelectionState | null): BottomPanelDisplay | null {
  if (selected == null) {
    return null;
  }

  switch (selected.status) {
    case "clips": {
      if (selected.clips.length != 1) {
        return null;
      }

      const sel = selected.clips[0];
      if (sel.kind === "midi") {
        return { kind: "MidiClip", clip: sel.clip, track: sel.track };
      } else if (sel.kind === "audio") {
        return { kind: "AudioClip", clip: sel.clip, track: sel.track };
      } else {
        exhaustive(sel);
      }
    }
    case "tracks": {
      if (selected.tracks.length != 1) {
        return null;
      }
      const track = selected.tracks[0];
      if (track instanceof AudioTrack) {
        return { kind: "AudioTrack", track: track };
      } else if (track instanceof MidiTrack) {
        return { kind: "MidiTrack", track: track };
      } else {
        exhaustive(track);
      }
    }

    case "effects":
    case "loop_marker":
    case "time":
    case "track_time":
      return null;
    default:
      exhaustive(selected);
  }
}
