import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { usePrimitive } from "structured-state";
import { useDocumentKeyboardEvents } from "../input/useDocumentKeyboardEvents";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRecorder } from "../lib/io/AudioRecorder";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { AboutPanel } from "./AboutPanel";
import { BottomPanel } from "./BottomPanel";
import { DebugContent } from "./DebugData";
import { EffectWindows } from "./EffectWindows";
import { ToolHeader } from "./header/ToolHeader";
import { TransportControl } from "./header/TransportControl";
import { HelpPanel } from "./HelpPanel";
import { HistoryPanel } from "./HistoryPanel";
import { Library } from "./Library";
import { MIDIPanel } from "./MIDIPanel";
import { modifierState, useSingletonKeyboardModifierState } from "./ModifierState";
import { OverviewPanel } from "./OverviewPanel";
import { ProjectEditor } from "./ProjectEditor";
import { TimelineView } from "./TimelineView";
import { UtilityTabbedPanel } from "./UtilityTabbedPanel";

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
  const styles = useStyles();
  const renderer = appEnvironment.renderer;
  const [recorder] = useState(() => new AudioRecorder(project, renderer));

  useSingletonKeyboardModifierState(modifierState);
  useDocumentKeyboardEvents(project);
  useStopPlaybackOnUnmount(renderer);
  const [activeSidePanel, setActiveSidePanel] = usePrimitive(appEnvironment.activeSidePanel);
  const [activeBottomPanel, setActiveBottomPanel] = usePrimitive(appEnvironment.activeBottomPanel);
  const [activePanel] = useLinkAsState(project.activePanel);

  return (
    <>
      <EffectWindows />
      <ToolHeader project={project} renderer={renderer} recorder={recorder} />
      <div className="overflow-hidden flex flex-row items-stretch shrink" style={{ flex: "100 1 0px" }}>
        <UtilityTabbedPanel
          activeTab={activeSidePanel}
          onSelectTab={setActiveSidePanel}
          dividerPosition={"right"}
          onMouseDownCapture={() => project.activePanel.set("sidebar")}
          className={classNames(styles.sidebarPanel, activePanel === "sidebar" && "bg-panel-active-background")}
          panels={{
            library: {
              icon: <i className="ri-folder-3-line" style={{ paddingRight: 2 }}></i>,
              title: "Library",
              render: () => <Library project={project} renderer={renderer} player={renderer.analizedPlayer} />,
            },
            midi: {
              icon: <i className="ri-link" style={{ paddingRight: 2 }}></i>,
              title: "MIDI",
              render: () => <MIDIPanel project={project} />,
            },
            history: {
              icon: <i className="ri-history-line" style={{ paddingRight: 2 }}></i>,
              title: "History",
              render: () => <HistoryPanel project={project} />,
            },
            project: {
              icon: <i className="ri-file-music-line" />,
              title: "Project",
              render: () => <ProjectEditor project={project} />,
            },
            help: {
              icon: <i className="ri-questionnaire-line"></i>,
              title: "Help",
              render: () => <HelpPanel project={project} />,
            },
          }}
        />
        <TimelineView project={project} renderer={renderer} />
      </div>
      <UtilityTabbedPanel
        activeTab={activeBottomPanel}
        onSelectTab={setActiveBottomPanel as any}
        dividerPosition={"top"}
        expandedSize={295}
        onMouseDownCapture={() => project.activePanel.set("secondary")}
        className={classNames(styles.secondaryPanel, activePanel === "secondary" && "bg-panel-active-background")}
        extraControls={<TransportControl style={{ marginTop: 2 }} project={project} />}
        panels={{
          editor: {
            icon: <i className="ri-edit-line"></i>,
            title: "Details",
            render: () => <BottomPanel project={project} player={renderer.analizedPlayer} renderer={renderer} />,
          },
          overview: {
            icon: <i className="ri-dashboard-horizontal-fill" style={{ paddingRight: 2 }}></i>,
            title: "Overview",
            render: () => <OverviewPanel project={project} player={renderer.analizedPlayer} renderer={renderer} />,
          },
          debug: {
            icon: <i className="ri-bug-fill"></i>,
            title: "Debug",
            render: () => <DebugContent project={project} />,
          },
          about: {
            icon: <i className="ri-information-line" style={{ paddingRight: 2 }}></i>,
            title: "About",
            render: () => <AboutPanel />,
          },
        }}
      />
    </>
  );
}

const useStyles = createUseStyles({
  secondaryPanel: {
    paddingTop: "4px",
  },
  sidebarPanel: {
    paddingTop: "4px",
  },
});
