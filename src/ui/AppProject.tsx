import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { modifierState, useSingletonKeyboardModifierState } from "../ModifierState";
import { useDocumentKeyboardEvents } from "../input/useDocumentKeyboardEvents";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioClip } from "../lib/AudioClip";
import { AudioRecorder } from "../lib/AudioRecorder";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { PrimarySelectionState } from "../lib/project/SelectionState";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { exhaustive } from "../utils/exhaustive";
import { AudioClipEditor } from "./AudioClipEditor";
import { Library } from "./Library";
import { ProjectSettings } from "./ProjectSettings";
import { MidiClipEditor } from "./MidiClipEditor";
import { OldMidiClipEditor } from "./OldMidiClipEditor";
import { TabbedPanel } from "./TabbedPanel";
import { TimelineView } from "./TimelineView";
import { UtilityPanel } from "./UtilityPanel";
import { ToolHeader } from "./header/ToolHeader";
import { useMousePressMove } from "./useEventListener";

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
  const [recorder] = useState(() => new AudioRecorder(project, renderer));

  useSingletonKeyboardModifierState(modifierState);
  useDocumentKeyboardEvents(project, renderer.analizedPlayer, renderer);
  useStopPlaybackOnUnmount(renderer);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  return (
    <>
      <ToolHeader project={project} player={renderer.analizedPlayer} renderer={renderer} recorder={recorder} />
      <PanelGroup direction={"vertical"} autoSaveId="foobar2">
        <Panel style={{ display: "flex", flexDirection: "row", alignItems: "stretch" }}>
          {/* <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch" }}> */}
          <TabbedPanel
            activeTab={activePanel}
            onSelectTab={setActivePanel}
            panels={{
              library: {
                icon: <i className="ri-folder-3-line" style={{ paddingRight: 2 }}></i>,
                title: "Library",
                render: () => <Library project={project} renderer={renderer} player={renderer.analizedPlayer} />,
              },
              project: {
                icon: <i className="ri-file-music-line" />,
                title: "Project",
                render: () => <ProjectSettings project={project} />,
              },
              settings: {
                icon: <i className="ri-settings-3-line" style={{ paddingRight: 2 }}></i>,
                title: "Settings",
                render: () => <div></div>,
              },
            }}
          />
          <TimelineView project={project} player={renderer.analizedPlayer} renderer={renderer} />
          {/* </div> */}
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
        <div ref={testref}>TEST</div>
        <UtilityPanel layout={"horizontal"}>nothing to show</UtilityPanel>
        <UtilityPanel layout={"horizontal"}>nothing to show</UtilityPanel>
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
