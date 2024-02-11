import { createUseStyles } from "react-jss";
import { useContainer } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { pressedState } from "../pressedState";
import { set } from "../utils/set";
import { time } from "../lib/project/TimelinePoint";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";

export function LoopMarkers({ project }: { project: AudioProject }) {
  const styles = useStyles();
  // for observing
  useLinkedState(project.viewportStartPx);
  const loopStart = useContainer(project.loopStart);
  const loopEnd = useContainer(project.loopEnd);
  const [selected] = useLinkedState(project.selected);
  const [loopPlayback] = useLinkedState(project.loopOnPlayback);

  // just to listen to it
  // todo: a way to subscribe to any viewport change?
  useLinkedState(project.scaleFactor);
  const startX = loopStart.px(project);
  const endX = loopEnd.px(project);

  const selection = selected?.status === "loop_marker" ? selected.kind : null;

  return (
    <>
      <div
        className={styles.loopRect}
        style={{
          backgroundColor: selection === "box" ? "var(--axis-timeline-separator)" : "var(--timeline-bg)",
          borderTop: loopPlayback ? "1px solid orange" : "1px solid var(--axis-timeline-separator)",
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
            console.log("START");
          }}
        >
          <polygon
            fill={selection === "start" ? "var(--axis-timeline-separator)" : "none"}
            stroke={selection === "box" ? "var(--control-bg-color)" : "var(--axis-timeline-separator)"}
            points="0,0 8,5 0,10"
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
            fill={selection === "end" ? "var(--axis-timeline-separator)" : "none"}
            points="10,0 10,10 2,5"
            strokeLinejoin="bevel"
          />
        </svg>
      </div>
    </>
  );
}

const useStyles = createUseStyles({
  loopRect: {
    height: "11px",
    position: "absolute",
    boxSizing: "border-box",
    bottom: 0,
  },
});
