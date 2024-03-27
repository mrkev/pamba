import { useCallback, useRef } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { PrimarySelectionState } from "../lib/project/SelectionState";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { exhaustive } from "../utils/exhaustive";
import { AudioClipEditor } from "./AudioClipEditor";
import { MidiClipEditor } from "./MidiClipEditor";
import { OldMidiClipEditor } from "./OldMidiClipEditor";
import { useMousePressMove } from "./useEventListener";
import { AudioTrack } from "../lib/AudioTrack";
import { TrackEditor } from "./TrackEditor";
import { AudioRenderer } from "../lib/AudioRenderer";

export function BottomPanel({
  project,
  player,
  renderer,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
}) {
  const [activeTrack] = useLinkedState(project.activeTrack);
  const [selected] = useLinkedState(project.selected);
  const primarySelection = getValidEditorSelection(selected);

  const testref = useRef<HTMLDivElement>(null);
  useMousePressMove(
    testref,
    useCallback((kind) => {
      console.log(kind);
    }, []),
  );

  if (primarySelection instanceof AudioClip) {
    return <AudioClipEditor clip={primarySelection} player={player} project={project} />;
  }

  if (primarySelection instanceof MidiClip) {
    return <MidiClipEditor clip={primarySelection} player={player} project={project} />;
  }

  if (primarySelection instanceof MidiTrack || primarySelection instanceof AudioTrack) {
    return <TrackEditor track={primarySelection} project={project} renderer={renderer} />;
  }

  if (!(activeTrack instanceof MidiTrack)) {
    return (
      <div>
        nothing to show
        {/* <div ref={testref}>TEST</div>
        <UtilityPanel layout={"horizontal"}>nothing to show</UtilityPanel>
        <UtilityPanel layout={"horizontal"}>nothing to show</UtilityPanel> */}
      </div>
    );
  }

  const clip = activeTrack.pianoRoll.sequencer.pianoRoll.clips["default"];
  return <OldMidiClipEditor clip={clip} player={player} />;
}
function getValidEditorSelection(selected: PrimarySelectionState | null) {
  if (selected == null) {
    return null;
  }

  switch (selected.status) {
    case "clips": {
      if (selected.clips.length != 1) {
        return null;
      }

      const clip = selected.clips[0];
      if (clip.clip instanceof MidiClip) {
        return clip.clip;
      } else if (clip.clip instanceof AudioClip) {
        return clip.clip;
      } else {
        exhaustive(clip.clip);
      }
    }
    case "tracks": {
      if (selected.tracks.length != 1) {
        return null;
      }
      const track = selected.tracks[0];
      if (track instanceof AudioTrack) {
        return track;
      } else if (track instanceof MidiTrack) {
        return track;
      } else {
        exhaustive(track);
      }
    }

    case "effects":
    case "loop_marker":
    case "time":
    case "track_time":
    case "tracks":
      return null;
    default:
      exhaustive(selected);
  }
}
