import React, { useCallback } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../constants";
import { AnalizedPlayer } from "../../lib/AnalizedPlayer";
import AudioClip from "../../lib/AudioClip";
import { AudioRenderer } from "../../lib/AudioRenderer";
import { AudioTrack } from "../../lib/AudioTrack";
import { ProjectPersistance } from "../../lib/ProjectPersistance";
import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedState } from "../../lib/state/LinkedState";
import { appProjectStatus } from "../App";
import { UserAuthControl } from "./UserAuthControl";
import { utility } from "../utility";
import { BounceButton } from "./BounceButton";
import { ToolSelector } from "./ToolSelector";
import { TransportControl } from "./TransportControl";
import { createUseStyles } from "react-jss";
import { UtilityNumber } from "../UtilityNumber";

function NewProjectButton() {
  return (
    <button
      className={utility.button}
      onClick={() => {
        // eslint-disable-next-line no-restricted-globals
        if (confirm("TODO: only one project is supported, so this deletes all data. Continue?")) {
          appProjectStatus.set({
            status: "loaded",
            project: ProjectPersistance.defaultProject(),
          });
        }
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
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
}) {
  const classes = useStyles();
  const [scaleFactor] = useLinkedState(project.scaleFactor);
  const [tempo] = useLinkedState(project.tempo);

  const loadClip = useCallback(
    async function loadClip(url: string, name?: string) {
      try {
        console.log("LOAD CLIP");
        // load clip
        const clip = await AudioClip.fromURL(url, name);
        const newTrack = AudioTrack.fromClip(clip);
        AudioProject.addTrack(project, player, newTrack);
        console.log("loaded");
      } catch (e) {
        console.trace(e);
        return;
      }
    },
    [player, project]
  );

  return (
    <div className={classes.headerContainer}>
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          marginRight: 12,
        }}
      >
        <div className={classes.topRow}>
          <NewProjectButton />
          <UtilityNumber
            value={tempo}
            onChange={(v) => {
              project.tempo.set(v);
            }}
          ></UtilityNumber>
          <BounceButton project={project} renderer={renderer} />
          <ToolSelector project={project} />

          <div style={{ flexGrow: 1 }}></div>
          <TransportControl
            project={project}
            loadClip={loadClip}
            player={player}
            renderer={renderer}
            style={{ alignSelf: "center" }}
          />
        </div>
        <div className={classes.bottomRow}>
          <UserAuthControl />
          {/* <input
            value={""}
            type="file"
            accept="audio/*"
            onChange={function (e) {
              const files = e.target.files || [];
              const url = URL.createObjectURL(files[0]);
              loadClip(url, files[0].name);
            }}
          /> */}
          <div style={{ flexGrow: 1 }}></div>
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
  topRow: {
    display: "flex",
    flexDirection: "row",
    gap: "6px",
    alignSelf: "stretch",
    alignItems: "baseline",
  },
  bottomRow: {
    display: "flex",
    flexDirection: "row",
    gap: "6px",
    alignSelf: "stretch",
    alignItems: "baseline",
  },
});
