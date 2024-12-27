import classNames from "classnames";
import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { usePrimitive } from "structured-state";
import { useDocumentKeyboardEvents } from "../input/useDocumentKeyboardEvents";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRecorder } from "../lib/io/AudioRecorder";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { AboutPanel } from "./AboutPanel";
import { BottomPanel } from "./BottomPanel";
import { DebugContent } from "./DebugData";
import { ToolHeader } from "./header/ToolHeader";
import { TransportControl } from "./header/TransportControl";
import { HelpPanel } from "./HelpPanel";
import { HistoryPanel, Settings } from "./HistoryPanel";
import { Library } from "./Library";
import { modifierState, useSingletonKeyboardModifierState } from "./ModifierState";
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
  const [activePanel] = useLinkedState(project.activePanel);

  return (
    <>
      <ToolHeader project={project} player={renderer.analizedPlayer} renderer={renderer} recorder={recorder} />
      <div
        style={{
          flex: "100 1 0px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          flexShrink: 1,
        }}
      >
        <UtilityTabbedPanel
          activeTab={activeSidePanel}
          onSelectTab={setActiveSidePanel}
          dividerPosition={"right"}
          onMouseDownCapture={() => project.activePanel.set("sidebar")}
          className={classNames(
            styles.sidebarPanel,
            activePanel === "sidebar" ? styles.sidebarPanelActive : styles.sidebarPanelInactive,
          )}
          panels={{
            library: {
              icon: <i className="ri-folder-3-line" style={{ paddingRight: 2 }}></i>,
              title: "Library",
              render: () => <Library project={project} renderer={renderer} player={renderer.analizedPlayer} />,
            },
            project: {
              icon: <i className="ri-file-music-line" />,
              title: "Project",
              render: () => <ProjectEditor project={project} />,
            },
            history: {
              icon: <i className="ri-history-line" style={{ paddingRight: 2 }}></i>,
              title: "History",
              render: () => <HistoryPanel project={project} />,
            },
            settings: {
              icon: <i className="ri-settings-3-line" style={{ paddingRight: 2 }}></i>,
              title: "Settings",
              render: () => <Settings project={project} />,
            },
            help: {
              icon: <i className="ri-questionnaire-line"></i>,
              title: "Help",
              render: () => <HelpPanel project={project} />,
            },
          }}
        />
        <TimelineView project={project} player={renderer.analizedPlayer} renderer={renderer} />
      </div>
      <UtilityTabbedPanel
        activeTab={activeBottomPanel}
        onSelectTab={setActiveBottomPanel as any}
        dividerPosition={"top"}
        expandedSize={295}
        onMouseDownCapture={() => project.activePanel.set("secondary")}
        className={classNames(
          styles.secondaryPanel,
          activePanel === "secondary" ? styles.secondaryPanelActive : styles.secondaryPanelInactive,
        )}
        extraControls={<TransportControl style={{ marginTop: 2 }} project={project} />}
        panels={{
          editor: {
            icon: <i className="ri-edit-line"></i>,
            title: "Details",
            render: () => <BottomPanel project={project} player={renderer.analizedPlayer} renderer={renderer} />,
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
    margin: "4px 4px 4px 4px",
    paddingTop: "4px",
    borderRadius: "3px",
  },
  secondaryPanelInactive: {},
  secondaryPanelActive: {
    background: "#343434",
    paddingTop: "4px",
  },

  sidebarPanel: {
    // margin: "4px 4px 4px 4px",
    paddingTop: "4px",
    // borderRadius: "3px",
  },
  sidebarPanelInactive: {},
  sidebarPanelActive: {
    background: "#343434",
  },
});
