import { useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { modifierState, useSingletonKeyboardModifierState } from "../ModifierState";
import { useDocumentKeyboardEvents } from "../input/useDocumentKeyboardEvents";
import { AudioRecorder } from "../lib/AudioRecorder";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { Library } from "./Library";
import { ProjectSettings } from "./ProjectSettings";
import { UtilityTabbedPanel } from "./UtilityTabbedPanel";
import { TimelineView } from "./TimelineView";
import { ToolHeader } from "./header/ToolHeader";
import { History } from "./history";
import { useLocalStorage } from "./useLocalStorage";
import { appEnvironment } from "../lib/AppEnvironment";
import { BottomPanel } from "./BottomPanel";

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
  const renderer = appEnvironment.renderer;
  const [recorder] = useState(() => new AudioRecorder(project, renderer));

  useSingletonKeyboardModifierState(modifierState);
  useDocumentKeyboardEvents(project, renderer.analizedPlayer, renderer);
  useStopPlaybackOnUnmount(renderer);
  const [activePanel, setActivePanel] = useLocalStorage<string | null>("side-panel-active", null);

  return (
    <>
      <ToolHeader project={project} player={renderer.analizedPlayer} renderer={renderer} recorder={recorder} />
      <PanelGroup direction={"vertical"} autoSaveId="foobar2">
        <Panel style={{ display: "flex", flexDirection: "row", alignItems: "stretch" }}>
          {/* <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch" }}> */}
          <UtilityTabbedPanel
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
              tools: {
                icon: <i className="ri-settings-3-line" style={{ paddingRight: 2 }}></i>,
                title: "Tools",
                render: () => <History project={project} />,
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
