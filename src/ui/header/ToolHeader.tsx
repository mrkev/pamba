import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { createUseStyles } from "react-jss";
import { getGlobalState, useContainer, usePrimitive, useSubscribeToSubbableMutationHashable } from "structured-state";
import { CANVAS_HEIGHT, CANVAS_WIDTH, MAX_TIMELINE_SCALE, MIN_TIMELINE_SCALE } from "../../constants";
import { documentCommands } from "../../input/documentCommands";
import { appEnvironment } from "../../lib/AppEnvironment";
import { AudioRecorder } from "../../lib/io/AudioRecorder";
import { AudioRenderer } from "../../lib/io/AudioRenderer";
import { AudioProject } from "../../lib/project/AudioProject";
import { cn } from "../../utils/cn";
import { RenamableLabel } from "../RenamableLabel";
import { UtilityNumber } from "../UtilityNumber";
import { UtilityToggle } from "../UtilityToggle";
import { utility } from "../utility";
import { BounceButton } from "./BounceButton";
import { CommandButton } from "./CommandButton";
import { CommandMenu } from "./CommandMenu";
import { PlaybeatTime } from "./PlaybeatTime";
import { ToolSelector } from "./ToolSelector";
import { PlaybackControl } from "./TransportControl";
import { useCallback } from "react";

function ScaleFactorSlider({ project }: { project: AudioProject }) {
  const [scaleFactor] = usePrimitive(project.viewport.pxPerSecond);

  return (
    <input
      type="range"
      min={Math.log(MIN_TIMELINE_SCALE)}
      max={Math.log(MAX_TIMELINE_SCALE)}
      step={0.01}
      value={Math.log(scaleFactor)}
      title="Zoom level"
      onChange={(e) => {
        const cursorPosSecs = project.cursorPos.get();
        const cursorPosPx = project.viewport.secsToPx(cursorPosSecs) - project.viewport.scrollLeftPx.get();
        const projectDivWidth = project.viewport.projectDivWidth.get();
        const expectedNewScale = Math.exp(parseFloat(e.target.value));

        if (cursorPosPx < projectDivWidth && cursorPosPx > 0) {
          // if cursor is within view, resize around cursor
          project.viewport.setScale(expectedNewScale, cursorPosPx);
        } else {
          // if cursor is outside the view, resize from the center
          project.viewport.setScale(expectedNewScale, Math.floor(projectDivWidth / 2));
        }

        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
}

export function ToolHeader({
  project,
  renderer,
  recorder,
}: {
  project: AudioProject;
  renderer: AudioRenderer;
  recorder: AudioRecorder;
}) {
  const classes = useStyles();
  const [tempo] = usePrimitive(project.tempo);
  const [snapToGrid] = usePrimitive(project.snapToGrid);
  const [loopPlayback] = usePrimitive(project.loopOnPlayback);
  // const [inputDevices] = useLinkedMap(recorder.audioInputDevices);
  // const [selectedDevice] = useLinkedState(recorder.currentInput);
  const [projectName] = usePrimitive(project.projectName);
  const [isAudioPlaying] = usePrimitive(renderer.isAudioPlaying);
  const [recorderStatus] = useLinkAsState(recorder.status);
  const isRecording = recorderStatus === "recording";

  const dirty = appEnvironment.projectDirtyObserver.dirtyState() !== "clean";
  useSubscribeToSubbableMutationHashable(appEnvironment.projectDirtyObserver.flag, undefined, false);
  useContainer(project.allTracks, true);
  const history = useContainer(getGlobalState().history);
  const redoStack = useContainer(getGlobalState().redoStack);

  const setTempo = useCallback(
    (v: number) => {
      project.tempo.set(v);
    },
    [project.tempo],
  );

  return (
    <div className={cn("name-headerContainer", "flex flex-row w-full items-center")}>
      <img src="/logo.svg" alt="mini daw" height="24" width="auto" style={{ margin: "0px 8px" }} />
      <div className={classNames(classes.tools, "flex flex-col")}>
        <div className={classNames(classes.row, "flex flex-row self-stretch items-center")}>
          <div className="flex flex-row">
            <CommandMenu
              label="file"
              style={{ borderRight: "1px solid var(--control-subtle-highlight)" }}
              items={[
                ["new project", documentCommands.getById("newProject")],
                ["save", documentCommands.getById("save")],
                // ["bounce selection", documentCommands.getById("newProject")],
                // ["bounce all", documentCommands.getById("save")],
              ]}
              project={project}
            />

            <CommandMenu
              label={"edit"}
              style={{ borderRight: "1px solid var(--control-subtle-highlight)" }}
              items={[
                ["copy", documentCommands.getById("copySelection")],
                ["paste", documentCommands.getById("pasteClipboard")],
              ]}
              project={project}
            />

            <CommandMenu
              label={"create"}
              items={[
                ["audio track", documentCommands.getById("createAudioTrack")],
                ["midi track", documentCommands.getById("createMidiTrack")],
              ]}
              project={project}
            />
          </div>

          {/* <select
            style={{ width: 100 }}
            value={selectedDevice ?? undefined}
            onChange={(e) => recorder.selectInputDevice(e.target.value)}
          >
            {inputDevices.map((device) => (
              <option value={device.deviceId} key={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select> */}
          <div className="flex flex-row items-center">
            <UtilityNumber value={tempo} onChange={setTempo}></UtilityNumber>
            <button className="utilityButton">4 / 4</button>
            <PlaybeatTime project={project} player={renderer.analizedPlayer} />
          </div>

          <div className="grow"></div>
          <span className={classes.buttonGroup}>
            <CommandButton disabled={history.length < 1} command={documentCommands.getById("undo")} project={project}>
              <i className="ri-arrow-go-back-line"></i>
            </CommandButton>

            <CommandButton disabled={redoStack.length < 1} command={documentCommands.getById("redo")} project={project}>
              <i className="ri-arrow-go-forward-line"></i>
            </CommandButton>
          </span>

          <div style={{ width: 12 }}></div>

          <UtilityToggle
            title="snap to grid"
            toggled={snapToGrid}
            onToggle={function (toggled: boolean): void {
              project.snapToGrid.set(toggled);
            }}
          >
            <i className="ri-focus-3-line"></i>
          </UtilityToggle>

          <UtilityToggle
            disabled={isAudioPlaying || isRecording}
            title={loopPlayback ? "deactivate loop brace" : "activate loop brace"}
            toggled={loopPlayback}
            onToggle={function (toggled: boolean): void {
              project.loopOnPlayback.set(toggled);
            }}
          >
            <i className="ri-loop-left-line"></i>
          </UtilityToggle>

          <PlaybackControl project={project} renderer={renderer} className="self-center" recorder={recorder} />
          <ToolSelector project={project} />
          <div className="grow"></div>

          <BounceButton project={project} renderer={renderer} />

          <button
            className={utility.button}
            onClick={async () => {
              window.open("https://github.com/mrkev/web-daw-issues/issues/new", "_blank");
            }}
            title="report bug"
          >
            <i className="ri-bug-fill"></i>
          </button>
        </div>
        <div className={classNames(classes.row, "flex flex-row self-stretch items-center")}>
          {/* <span
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              color: "var(--text-on-background)",
              marginLeft: 0,
            }}
          >
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={() => {
                project.snapToGrid.setDyn((prev) => !prev);
              }}
            ></input>
            snap to grid
          </span> */}
          {/* Space to center project title */}
          {/* <div className="shrink-0" style={{ minWidth: "185px" }}></div> */}
          {/* <TransportControl project={project} renderer={renderer} recorder={recorder} /> */}
          {/* <div className="grow"></div> */}
          <span title="current open project">
            {dirty ? "*" : ""}
            <i className="ri-file-music-line" />
            <RenamableLabel
              style={{ padding: "0px 2px" }}
              value={projectName}
              setValue={(v) => project.projectName.set(v)}
              highlightFocus
              showEditButton
            />
          </span>
          <div className="grow"></div>

          <ScaleFactorSlider project={project} />
        </div>
      </div>
      <canvas
        className="bg-black"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
        width={2 * CANVAS_WIDTH + "px"}
        height={2 * CANVAS_HEIGHT + "px"}
        ref={(canvas) => {
          const ctx = canvas?.getContext("2d") ?? null;
          renderer.analizedPlayer.setCanvas(ctx);
        }}
      ></canvas>
    </div>
  );
}

const useStyles = createUseStyles({
  buttonGroup: {
    display: "flex",
    flexDirection: "row",
  },
  tools: {
    flexGrow: 1,
    marginRight: 12,
    marginLeft: 4,
    marginBottom: 4,
    gap: 4,
  },
  row: {
    gap: "6px",
  },
});
