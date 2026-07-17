import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { useEffect, useState } from "react";
import { usePrimitive } from "structured-state";
import { useDocumentKeyboardEvents } from "../input/useDocumentKeyboardEvents";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRecorder } from "../lib/io/AudioRecorder";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AppLayout, AudioProject } from "../lib/project/AudioProject";
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
import { UtilityToggle } from "./UtilityToggle";

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
  const [layout, setLayout] = usePrimitive<AppLayout>(project.layout);

  useSingletonKeyboardModifierState(modifierState);
  useDocumentKeyboardEvents(project);
  useStopPlaybackOnUnmount(renderer);
  const [activeSidePanel, setActiveSidePanel] = usePrimitive(appEnvironment.activeSidePanel);
  const [activeBottomPanel, setActiveBottomPanel] = usePrimitive(appEnvironment.activeBottomPanel);
  const [activePanel] = useLinkAsState(project.activePanel);

  const sidePanel = (
    <UtilityTabbedPanel
      key="sidePanel"
      activeTab={activeSidePanel}
      onSelectTab={setActiveSidePanel}
      dividerPosition={"right"}
      onMouseDownCapture={() => project.activePanel.set("sidebar")}
      className={classNames(activePanel === "sidebar" && "bg-panel-active-background")}
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
  );

  const bottomPanel = (
    <UtilityTabbedPanel
      activeTab={activeBottomPanel}
      onSelectTab={setActiveBottomPanel as any}
      dividerPosition={"top"}
      expandedSize={layout === "secondary" ? "70%" : "295px"}
      onMouseDownCapture={() => project.activePanel.set("secondary")}
      className={classNames(activePanel === "secondary" && "bg-panel-active-background")}
      style={{ paddingTop: "4px" }}
      controlsStart={
        <UtilityToggle
          title={"expand layout"}
          toggled={layout === "secondary"}
          className="p-0"
          onToggle={function (toggled: boolean): void {
            console.log("toggled", toggled);
            setLayout(toggled ? "secondary" : "primary");
          }}
        >
          {layout === "secondary" ? <i className="ri-skip-down-line"></i> : <i className="ri-skip-up-line"></i>}
        </UtilityToggle>
      }
      controlsEnd={<TransportControl style={{ marginTop: 2 }} project={project} />}
      panels={{
        editor: {
          icon: <i className="ri-edit-line"></i>,
          title: "Details",
          render: () => <BottomPanel project={project} player={renderer.analizedPlayer} renderer={renderer} />,
        },
        // overview: {
        //   icon: <i className="ri-dashboard-horizontal-fill" style={{ paddingRight: 2 }}></i>,
        //   title: "Overview",
        //   render: () => <OverviewPanel project={project} player={renderer.analizedPlayer} renderer={renderer} />,
        // },
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
  );

  if (layout === "primary") {
    return (
      <>
        <EffectWindows />
        <ToolHeader project={project} renderer={renderer} recorder={recorder} />
        <div className="overflow-hidden flex flex-row items-stretch shrink grow">
          {sidePanel}
          <TimelineView project={project} renderer={renderer} />
        </div>
        {bottomPanel}
      </>
    );
  } else {
    return (
      <>
        <EffectWindows />
        <ToolHeader project={project} renderer={renderer} recorder={recorder} />
        <OverviewPanel project={project} player={renderer.analizedPlayer} renderer={renderer} className="grow-0" />
        {bottomPanel}
      </>
    );
  }
}
