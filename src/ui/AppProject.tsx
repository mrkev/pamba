import { useCallback, useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { modifierState, useSingletonKeyboardModifierState } from "../ModifierState";
import { useDocumentKeyboardEvents } from "../input/useDocumentKeyboardEvents";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { Library } from "./Library";
import { TimelineView } from "./TimelineView";
import { ToolHeader } from "./header/ToolHeader";
import { AudioRecorder } from "../lib/AudioRecorder";
import AudioClip from "../lib/AudioClip";
import { AudioTrack } from "../lib/AudioTrack";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiTrack } from "../midi/MidiTrack";
import { OldMidiClipEditor } from "./OldMidiClipEditor";
import { SelectionState } from "../lib/project/SelectionState";
import { MidiClip } from "../midi/MidiClip";
import { MidiClipEditor } from "./MidiClipEditor";

function useStopPlaybackOnUnmount(renderer: AudioRenderer) {
  useEffect(() => {
    return () => {
      if (renderer.analizedPlayer.isAudioPlaying) {
        renderer.analizedPlayer.stopSound();
      }
    };
  }, [renderer.analizedPlayer]);
}

export function AppProject({ project }: { project: AudioProject }) {
  // IDEA: Maybe merge player and renderer?
  const [renderer] = useState(() => new AudioRenderer(new AnalizedPlayer()));
  const loadClip = useCallback(
    async function loadClip(url: string, name?: string) {
      try {
        console.log("LOAD CLIP", project.cursorPos.get());
        // load clip
        const clip = await AudioClip.fromURL(url, name);
        clip.startOffsetSec = project.cursorPos.get();

        const armedTrack = project.armedTrack.get();
        if (armedTrack == null) {
          const newTrack = AudioTrack.fromClip(clip);
          AudioProject.addAudioTrack(project, renderer.analizedPlayer, newTrack);
        } else if (armedTrack instanceof AudioTrack) {
          armedTrack.addClip(clip);
        }
      } catch (e) {
        console.trace(e);
        return;
      }
    },
    [project, renderer.analizedPlayer],
  );

  const [recorder] = useState(() => new AudioRecorder(loadClip));

  useSingletonKeyboardModifierState(modifierState);
  useDocumentKeyboardEvents(project, renderer.analizedPlayer, renderer);
  useStopPlaybackOnUnmount(renderer);

  return (
    <>
      <ToolHeader project={project} player={renderer.analizedPlayer} renderer={renderer} recorder={recorder} />
      <PanelGroup direction={"vertical"} autoSaveId="foobar2">
        <Panel>
          <PanelGroup direction="horizontal" autoSaveId="foobar">
            <Panel
              collapsible={true}
              defaultSize={15}
              onCollapse={console.log}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "0px 0px 4px 4px",
                paddingBottom: "128px",
              }}
            >
              <Library project={project} renderer={renderer} player={renderer.analizedPlayer} />
            </Panel>
            <PanelResizeHandle
              style={{
                width: 5,
              }}
            />
            <Panel>
              <TimelineView project={project} player={renderer.analizedPlayer} renderer={renderer} />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle
          style={{
            height: 5,
          }}
        />
        <Panel
          collapsible={true}
          defaultSize={0}
          onCollapse={console.log}
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 4,
            padding: "0px 4px 5px 4px",
          }}
        >
          <BottomPanel project={project} player={renderer.analizedPlayer} />
        </Panel>
      </PanelGroup>
    </>
  );
}

function BottomPanel({ project, player }: { project: AudioProject; player: AnalizedPlayer }) {
  const [activeTrack] = useLinkedState(project.activeTrack);
  const [selected] = useLinkedState(project.selected);
  const midiClipMaybe = getOnlyOneSelectedMidiClip(selected);

  console.log(selected);

  if (midiClipMaybe != null) {
    return <MidiClipEditor clip={midiClipMaybe} player={player} />;
  }

  if (!(activeTrack instanceof MidiTrack)) {
    return "nothing to show";
  }

  const clip = activeTrack.pianoRoll.sequencer.pianoRoll.clips["default"];
  return <OldMidiClipEditor clip={clip} player={player} />;
}

function getOnlyOneSelectedMidiClip(selected: SelectionState | null) {
  if (selected == null) {
    return null;
  }

  if (!(selected.status === "clips" && selected.clips.length === 1)) {
    return null;
  }

  const clip = selected.clips[0];

  if (clip.clip instanceof MidiClip) {
    return clip.clip;
  } else {
    return null;
  }
}
