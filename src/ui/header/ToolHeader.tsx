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
import { UtilityMenu } from "../UtilityMenu";
import { UtilityNumber } from "../UtilityNumber";
import { UtilityToggle } from "../UtilityToggle";
import { utility } from "../utility";
import { BounceButton } from "./BounceButton";
import { CommandButton } from "./CommandButton";
import { PlaybeatTime } from "./PlaybeatTime";
import { ToolSelector } from "./ToolSelector";
import { PlaybackControl } from "./TransportControl";

function ScaleFactorSlider({ project }: { project: AudioProject }) {
  const [scaleFactor] = usePrimitive(project.viewport.scaleFactor);

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
        const cursorPosPx = project.viewport.secsToPx(cursorPosSecs) - project.viewport.viewportStartPx.get();
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

  return (
    <div className={cn("name-headerContainer", "flex flex-row w-full items-center")}>
      <img src="/logo.svg" alt="mini daw" height="24" width="auto" style={{ margin: "0px 8px" }} />
      <div className={classNames(classes.tools, "flex flex-col")}>
        <div className={classNames(classes.row, "flex flex-row self-stretch items-center")}>
          <CommandButton command={documentCommands.getById("newProject")} project={project}>
            new project
          </CommandButton>

          <CommandButton
            command={documentCommands.getById("save")}
            project={project}
            onFlash={() => console.log("onflash")}
          >
            save
          </CommandButton>

          <div style={{ width: 12 }}></div>

          <UtilityMenu
            label={"create"}
            items={{
              "audio track": () => documentCommands.execById("createAudioTrack", project),
              "midi track": () => documentCommands.execById("createMidiTrack", project),
            }}
          />

          <span className={classes.buttonGroup}>
            <CommandButton disabled={history.length < 1} command={documentCommands.getById("undo")} project={project}>
              <i className="ri-arrow-go-back-line"></i>
            </CommandButton>

            <CommandButton disabled={redoStack.length < 1} command={documentCommands.getById("redo")} project={project}>
              <i className="ri-arrow-go-forward-line"></i>
            </CommandButton>
          </span>

          <div style={{ width: 12 }}></div>

          {/* <select
            style={{ width: 100, fontSize: 12 }}
            value={selectedDevice ?? undefined}
            onChange={(e) => recorder.selectInputDevice(e.target.value)}
          >
            {inputDevices.map((device) => (
              <option value={device.deviceId} key={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select> */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <UtilityNumber
              value={tempo}
              onChange={(v) => {
                project.tempo.set(v);
              }}
            ></UtilityNumber>
            <button className="utilityButton">4 / 4</button>
            <PlaybeatTime project={project} player={renderer.analizedPlayer} />
          </div>

          <div className="grow"></div>
          <UtilityToggle
            disabled={isAudioPlaying || isRecording}
            title={loopPlayback ? "deactivate loop brace" : "activate loop brace"}
            style={{ fontSize: 18 }}
            toggled={loopPlayback}
            toggleStyle={{ background: "orange" }}
            onToggle={function (toggled: boolean): void {
              project.loopOnPlayback.set(toggled);
            }}
          >
            &#x21BB;
          </UtilityToggle>

          <PlaybackControl
            project={project}
            player={renderer.analizedPlayer}
            renderer={renderer}
            style={{ alignSelf: "center" }}
            recorder={recorder}
          />
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
          <UtilityToggle
            title="snap to grid"
            toggled={snapToGrid}
            onToggle={function (toggled: boolean): void {
              project.snapToGrid.set(toggled);
            }}
          >
            <i className="ri-focus-3-line"></i>
            {/* snap to grid */}
          </UtilityToggle>
          {/* <span
            style={{
              fontSize: 12,
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
          <div style={{ minWidth: "185px", flexShrink: 0 }}></div>
          {/* <TransportControl project={project} renderer={renderer} recorder={recorder} /> */}
          <div className="grow"></div>
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
    marginBottom: 6,
    gap: 2,
  },
  row: {
    gap: "6px",
  },
});
