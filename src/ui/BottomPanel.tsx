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

export function BottomPanel({ project, player }: { project: AudioProject; player: AnalizedPlayer }) {
  const [activeTrack] = useLinkedState(project.activeTrack);
  const [selected] = useLinkedState(project.selected);
  const clipMaybe = getOnlyOneSelectedClip(selected);

  const testref = useRef<HTMLDivElement>(null);
  useMousePressMove(
    testref,
    useCallback((kind) => {
      console.log(kind);
    }, []),
  );

  if (clipMaybe instanceof AudioClip) {
    return <AudioClipEditor clip={clipMaybe} player={player} project={project} />;
  }

  if (clipMaybe instanceof MidiClip) {
    return (
      <>
        <MidiClipEditor clip={clipMaybe} player={player} project={project} />
      </>
    );
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
function getOnlyOneSelectedClip(selected: PrimarySelectionState | null) {
  if (selected == null) {
    return null;
  }

  if (!(selected.status === "clips" && selected.clips.length === 1)) {
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
