import { useEffect, useState } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";
import { modifierState, useSingletonKeyboardModifierState } from "../ModifierState";
import { useDocumentKeyboardEvents } from "../input/useDocumentKeyboardEvents";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRecorder } from "../lib/AudioRecorder";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { BottomPanel } from "./BottomPanel";
import { DebugContent } from "./DebugData";
import { Help, History, Settings } from "./History";
import { Library } from "./Library";
import { ProjectSettings } from "./ProjectSettings";
import { TimelineView } from "./TimelineView";
import { UtilityTabbedPanel } from "./UtilityTabbedPanel";
import { ToolHeader } from "./header/ToolHeader";
import { useLocalStorage } from "./useLocalStorage";
import { TransportControl } from "./header/TransportControl";
import { usePrimitive } from "structured-state";

function useStopPlaybackOnUnmount(renderer: AudioRenderer) {
  useEffect(() => {
    return () => {
      if (renderer.analizedPlayer.isAudioPlaying) {
        renderer.analizedPlayer.stopSound();
      }
    };
  }, [renderer.analizedPlayer]);
}

// TODO: useLocalStorage out here

export function AppProject({ project }: { project: AudioProject }) {
  const renderer = appEnvironment.renderer;
  const [recorder] = useState(() => new AudioRecorder(project, renderer));

  useSingletonKeyboardModifierState(modifierState);
  useDocumentKeyboardEvents(project, renderer.analizedPlayer, renderer);
  useStopPlaybackOnUnmount(renderer);
  const [activeSidePanel, setActiveSidePanel] = usePrimitive(appEnvironment.activeSidePanel);
  const [activeBottomPanel, setActiveBottomPanel] = usePrimitive(appEnvironment.activeBottomPanel);

  return (
    <>
      <ToolHeader project={project} player={renderer.analizedPlayer} renderer={renderer} recorder={recorder} />
      <PanelGroup direction={"vertical"} autoSaveId="foobar2">
        <Panel style={{ display: "flex", flexDirection: "row", alignItems: "stretch" }}>
          <UtilityTabbedPanel
            activeTab={activeSidePanel}
            onSelectTab={setActiveSidePanel}
            dividerPosition={"right"}
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
              history: {
                icon: <i className="ri-history-line" style={{ paddingRight: 2 }}></i>,
                title: "History",
                render: () => <History project={project} />,
              },
              // shortcuts: {
              //   icon: <i className="ri-keyboard-box-line" style={{ paddingRight: 2 }}></i>,
              //   title: "Shortcuts",
              //   render: () => <Shortcuts project={project} />,
              // },
              settings: {
                icon: <i className="ri-settings-3-line" style={{ paddingRight: 2 }}></i>,
                title: "Settings",
                render: () => <Settings project={project} />,
              },
              help: {
                icon: <i className="ri-questionnaire-line"></i>,
                title: "Help",
                render: () => <Help project={project} />,
              },
            }}
          />
          <TimelineView project={project} player={renderer.analizedPlayer} renderer={renderer} />
        </Panel>

        <UtilityTabbedPanel
          activeTab={activeBottomPanel}
          onSelectTab={setActiveBottomPanel}
          dividerPosition={"top"}
          expandedSize={295}
          extraControls={
            <TransportControl style={{ marginTop: 2 }} project={project} renderer={renderer} recorder={recorder} />
          }
          panels={{
            editor: {
              icon: <i className="ri-edit-line"></i>,
              title: "Details",
              render: () => <BottomPanel project={project} player={renderer.analizedPlayer} />,
            },
            debug: {
              icon: <i className="ri-bug-fill"></i>,
              title: "Debug",
              render: () => <DebugContent project={project} />,
            },
            about: {
              icon: <i className="ri-information-line" style={{ paddingRight: 2 }}></i>,
              title: "About",
              render: () => (
                <div>
                  <pre>
                    WebDAW v0.1.0
                    <br />
                    ---
                    <br />
                    Kevin Chavez
                    <br />
                    <a href="http://aykev.dev" style={{ color: "white" }}>
                      http://aykev.dev
                    </a>
                    <br />
                    <a href="https://twitter.com/aykev" style={{ color: "white" }}>
                      @aykev
                    </a>
                    <br />
                    ---
                    <br />
                    OBXD: Jari Kleimola
                    <br />
                    - <A href="https://github.com/jariseon/webOBXD" />
                    <br />
                    StonePhaserStereo, BigMuff: Michel Buffa
                    <br />
                    - <A href="http://users.polytech.unice.fr/~buffa/" />
                    <br />
                    Dattorro Reverb: Jakob Zerbian
                    <br />
                    - <A href="https://github.com/grame-cncm/faustlibraries/blob/master/reverbs.lib" />
                    <br />
                    {/* todo: where did I get the sample music and how do I credit? */}
                  </pre>
                </div>
              ),
            },
          }}
        />
      </PanelGroup>
    </>
  );
}

function A({ href }: { href: string }) {
  return (
    <a href={href} style={{ color: "white" }}>
      {href}
    </a>
  );
}
