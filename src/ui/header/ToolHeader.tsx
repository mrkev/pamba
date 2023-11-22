import { useCallback, useRef } from "react";
import { createUseStyles } from "react-jss";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../constants";
import { documentCommands } from "../../input/useDocumentKeyboardEvents";
import { AnalizedPlayer } from "../../lib/AnalizedPlayer";
import { appEnvironment } from "../../lib/AppEnvironment";
import { AudioRecorder } from "../../lib/AudioRecorder";
import { AudioRenderer } from "../../lib/AudioRenderer";
import { ProjectPersistance } from "../../lib/ProjectPersistance";
import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedMap } from "../../lib/state/LinkedMap";
import { useLinkedState } from "../../lib/state/LinkedState";
import { doConfirm } from "../ConfirmDialog";
import { UtilityNumber } from "../UtilityNumber";
import { utility } from "../utility";
import { BounceButton } from "./BounceButton";
import { ToolSelector } from "./ToolSelector";
import { PlaybackControl, TransportControl } from "./TransportControl";

export async function closeProject(project: AudioProject) {
  const selection = await doConfirm(`Save changes to "${project.projectName.get()}"?`, "yes", "no", "cancel");

  if (selection === "cancel") {
    return false;
  }

  if (selection === "yes") {
    const savePromise = documentCommands.execById("save", project);
    if (!(savePromise instanceof Promise)) {
      throw new Error("didn't get a save promise");
    }
    await savePromise;
  }
  return true;
}

function NewProjectButton({ project }: { project: AudioProject }) {
  return (
    <button
      className={utility.button}
      onClick={async () => {
        const didClose = await closeProject(project);
        if (!didClose) {
          return;
        }

        appEnvironment.projectStatus.set({
          status: "loaded",
          project: ProjectPersistance.defaultProject(),
        });
      }}
    >
      new project
    </button>
  );
}

export function ToolHeader({
  project,
  player,
  renderer,
  recorder,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
  recorder: AudioRecorder;
}) {
  const classes = useStyles();
  const [scaleFactor] = useLinkedState(project.scaleFactor);
  const [tempo] = useLinkedState(project.tempo);
  const playbeatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snapToGrid] = useLinkedState(project.snapToGrid);
  const [inputDevices] = useLinkedMap(recorder.audioInputDevices);
  const [selectedDevice] = useLinkedState(recorder.currentInput);

  const drawPlaybeatTime = useCallback(
    (time: number) => {
      const ctx = playbeatCanvasRef.current?.getContext("2d") ?? null;
      if (ctx === null || playbeatCanvasRef.current == null) {
        return;
      }
      const [num, denom] = project.timeSignature.get();
      const tempo = project.tempo.get();

      const oneBeatLenSec = 60 / tempo;
      // note: 0 -> 1 index
      const bar = String(Math.floor(time / oneBeatLenSec / num) + 1).padStart(3, " ");
      const beat = String((Math.floor(time / oneBeatLenSec) % num) + 1).padStart(2, " ");
      // TODO: what is sub acutally
      const high = beat === " 1" ? " *" : beat === " 3" ? " _" : "  ";

      ctx.font = "24px monospace";
      ctx.textAlign = "start";
      ctx.fillStyle = "#ffffff";
      ctx.clearRect(0, 0, playbeatCanvasRef.current.width, 100);
      ctx.fillText(String(`${bar}.${beat}.${high}`), 6, 26);
    },
    [project.tempo, project.timeSignature],
  );

  return (
    <div className={classes.headerContainer}>
      <div className={classes.tools}>
        <div className={classes.topRow}>
          <NewProjectButton project={project} />
          <select
            style={{ width: 100, fontSize: 12 }}
            value={selectedDevice ?? undefined}
            onChange={(e) => recorder.selectInputDevice(e.target.value)}
          >
            {inputDevices.map((device) => (
              <option value={device.deviceId} key={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <UtilityNumber
              value={tempo}
              onChange={(v) => {
                project.tempo.set(v);
              }}
            ></UtilityNumber>
            <button className="utilityButton">4 / 4</button>
            <canvas
              style={{
                background: "black",
                width: 72,
                height: 18,
                alignSelf: "center",
              }}
              width={2 * 72 + "px"}
              height={2 * 18 + "px"}
              ref={(ref) => {
                playbeatCanvasRef.current = ref;
                player.drawPlaybeatTime = drawPlaybeatTime;
              }}
            />
          </div>

          <div style={{ flexGrow: 1 }}></div>
          <PlaybackControl
            project={project}
            player={player}
            renderer={renderer}
            style={{ alignSelf: "center" }}
            recorder={recorder}
          />
          <ToolSelector project={project} />
          <div style={{ flexGrow: 1 }}></div>
          <BounceButton project={project} renderer={renderer} />
        </div>
        <div className={classes.bottomRow}>
          <TransportControl project={project} renderer={renderer} recorder={recorder} />
          <div style={{ flexGrow: 1 }}></div>
          <span
            style={{
              fontSize: 12,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              color: "var(--text-on-background)",
            }}
          >
            snap to grid
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={() => {
                project.snapToGrid.setDyn((prev) => !prev);
              }}
            ></input>
          </span>

          <input
            type="range"
            min={Math.log(0.64)}
            max={Math.log(1000)}
            step={0.01}
            value={Math.log(scaleFactor)}
            title="Zoom level"
            onChange={(e) => {
              const projectDivWidth = project.viewport.projectDivWidth.get();
              if (projectDivWidth === 0) {
                return;
              }
              const newFactor = Math.exp(parseFloat(e.target.value));
              project.viewport.setScale(newFactor);

              // const renderedTime = project.viewport.pxToSecs(projectDivWidth);
              // const newRenderedWidth = project.viewport.secsToPx(renderedTime, newFactor);

              // console.log("new", newRenderedWidth, "old", projectDivWidth);
              // const pxDelta = newRenderedWidth - projectDivWidth;
              // console.log("PXDELTA", pxDelta);

              // // console.log(currentFactor, newFactor, currentFactor - newFactor);
              // // const totalPixels = projectDiv.clientWidth * (currentFactor - newFactor);
              // // console.log(projectDiv.clientWidth, "totalPixels", totalPixels);
              // // const viewportEndPx = viewportStartPx + projectDiv.clientWidth;
              // // const middlePx = (viewportStartPx + viewportEndPx) / 2;

              // project.scaleFactor.set(newFactor);
              // project.viewportStartPx.setDyn((prev) => prev + pxDelta / 2);
            }}
          />
        </div>
      </div>
      <canvas
        style={{
          background: "black",
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
        width={2 * CANVAS_WIDTH + "px"}
        height={2 * CANVAS_HEIGHT + "px"}
        ref={(canvas) => {
          const ctx = canvas?.getContext("2d") ?? null;
          player.setCanvas(ctx);
        }}
      ></canvas>
    </div>
  );
}

const useStyles = createUseStyles({
  headerContainer: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
  },
  tools: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    marginRight: 12,
  },
  topRow: {
    display: "flex",
    flexDirection: "row",
    gap: "6px",
    alignSelf: "stretch",
    alignItems: "center",
  },
  bottomRow: {
    display: "flex",
    flexDirection: "row",
    gap: "6px",
    alignSelf: "stretch",
    alignItems: "center",
  },
});
