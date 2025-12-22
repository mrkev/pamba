import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { time } from "../lib/project/TimelineT";
import { set } from "../utils/set";
import { PPQN } from "../wam/miditrackwam/MIDIConfiguration";
import { pressedState } from "./pressedState";

export function LoopMarkers({ project }: { project: AudioProject }) {
  const styles = useStyles();
  // for observing
  usePrimitive(project.viewport.viewportStartPx);
  const loopStart = useContainer(project.loopStart);
  const loopEnd = useContainer(project.loopEnd);
  const [selected] = useLinkAsState(project.selected);
  const [loopPlayback] = usePrimitive(project.loopOnPlayback);

  // just to listen to it
  // todo: a way to subscribe to any viewport change?
  usePrimitive(project.viewport.scaleFactor);
  const startX = loopStart.px(project);
  const endX = loopEnd.px(project);

  const selection = selected?.status === "loop_marker" ? selected.kind : null;
  const shapeFill = selection === "box" ? "var(--axis-timeline-separator)" : "var(--timeline-bg)";
  return (
    <>
      <div
        className={classNames(styles.loopRect, loopPlayback && styles.loopRectActive)}
        style={{
          backgroundColor: shapeFill,
          borderTop: loopPlayback
            ? "1px solid var(--axis-timeline-separator)"
            : "1px solid var(--axis-timeline-separator)",
          cursor: "pointer",
          left: startX,
          width: endX - startX,
        }}
        onMouseDown={(e) => {
          project.selected.set({ status: "loop_marker", kind: "box" });
          pressedState.set({
            status: "moving_timeline_points",
            clientX: e.clientX,
            points: set(
              { original: loopStart.serialize(), point: loopStart },
              { original: loopEnd.serialize(), point: loopEnd },
            ),
            limit: null,
          });
          e.stopPropagation();
          console.log("rect");
        }}
      >
        <svg
          viewBox="0 0 10 10"
          width="10"
          height="10"
          style={{ position: "absolute", cursor: "col-resize", left: 0, top: 0 }}
          onMouseDown={(e) => {
            project.selected.set({ status: "loop_marker", kind: "start" });
            pressedState.set({
              status: "moving_timeline_points",
              clientX: e.clientX,
              points: set({ original: loopStart.serialize(), point: loopStart }),
              limit: [
                null,
                time(1 * PPQN, "pulses")
                  .subtract(loopEnd, project)
                  .operate(Math.abs),
              ],
            });
            e.stopPropagation();
          }}
        >
          <polygon
            fill={selection === "start" ? "var(--axis-timeline-separator)" : shapeFill}
            stroke={selection === "box" ? "var(--control-bg-color)" : "var(--axis-timeline-separator)"}
            strokeWidth={1}
            // .5s bc of the stroke
            points="0.5,0 8,5 0.5,10"
            strokeLinejoin="bevel"
          />
        </svg>

        <svg
          viewBox="0 0 10 10"
          width="10"
          height="10"
          style={{ position: "absolute", cursor: "col-resize", right: 0, top: 0 }}
          onMouseDown={(e) => {
            project.selected.set({ status: "loop_marker", kind: "end" });
            pressedState.set({
              status: "moving_timeline_points",
              clientX: e.clientX,
              points: set({ original: loopEnd.serialize(), point: loopEnd }),
              limit: [time(1 * PPQN, "pulses").add(loopStart, project), null],
            });
            e.stopPropagation();
            console.log("end");
          }}
        >
          <polygon
            stroke={selection === "box" ? "var(--control-bg-color)" : "var(--axis-timeline-separator)"}
            fill={selection === "end" ? "var(--axis-timeline-separator)" : shapeFill}
            strokeWidth={1}
            // .5s bc of the stroke
            points="9.5,0 9.5,10 2,5"
            strokeLinejoin="bevel"
          />
        </svg>
      </div>
    </>
  );
}

const ORANGE_TRANSPARENT = `rgb(255,165,0, 0.6)`;

const useStyles = createUseStyles({
  loopRect: {
    height: "11px",
    position: "absolute",
    boxSizing: "border-box",
    bottom: 0,
  },
  loopRectActive: {
    backgroundSize: "4px 4px",
    backgroundImage: `repeating-linear-gradient(45deg, ${ORANGE_TRANSPARENT} 0, ${ORANGE_TRANSPARENT} 1.2px, rgba(0, 0, 0, 0) 0, rgba(0, 0, 0, 0) 50%)`,
  },
});
