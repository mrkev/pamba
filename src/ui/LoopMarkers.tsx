import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { createUseStyles } from "react-jss";
import { useContainer, usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { time } from "../lib/project/TimelineT";
import { set } from "../utils/set";
import { PPQN } from "../wam/miditrackwam/MIDIConfiguration";
import { pressedState } from "./pressedState";
import { START_PADDING_PX } from "../lib/viewport/ProjectViewport";

const LOOP_RECT_HEIGHT = 12;

export function LoopMarkers({ project }: { project: AudioProject }) {
  const styles = useStyles();
  // for observing
  usePrimitive(project.viewport.scrollLeftPx);
  const loopStart = useContainer(project.loopStart);
  const loopEnd = useContainer(project.loopEnd);
  const [selected] = useLinkAsState(project.selected);
  const [loopPlayback] = usePrimitive(project.loopOnPlayback);

  // just to listen to it
  // todo: a way to subscribe to any viewport change?
  usePrimitive(project.viewport.pxPerSecond);
  const startX = project.viewport.timeToViewportPx(loopStart, START_PADDING_PX);
  const endX = project.viewport.timeToViewportPx(loopEnd, START_PADDING_PX);

  const selection = selected?.status === "loop_marker" ? selected.kind : null;
  const boxSelected = selection === "box";

  const tscolor =
    selection == null
      ? "var(--timeline-tick)"
      : selection === "start" || selection === "box"
        ? "var(--control-bg-color)"
        : "var(--timeline-tick)";

  const tecolor =
    selection == null
      ? "var(--timeline-tick)"
      : selection === "end" || selection === "box"
        ? "var(--control-bg-color)"
        : "var(--timeline-tick)";

  return (
    <>
      <div
        className={classNames(
          "name-loop-rect",
          "absolute bottom-0",
          "box-border cursor-pointer border-t border-timeline-tick",

          !loopPlayback && "bg-panel-active-background",
          loopPlayback && styles.orangePattern,
          boxSelected && "bg-timeline-bg",
          loopPlayback && !boxSelected && "bg-axis-timeline-separator",
        )}
        style={{
          height: LOOP_RECT_HEIGHT,
          left: startX,
          width: Math.floor(endX - startX) + 1,
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
          // just shenaningans to have it render looking good
          viewBox={`0 -1 10 10`}
          width="10"
          height={LOOP_RECT_HEIGHT + 1}
          style={{ top: -2 }}
          //
          className="absolute cursor-col-resize left-0"
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
            fill={tscolor}
            stroke={tscolor}
            strokeWidth={1}
            // .5s bc of the stroke
            points="0.5,0 8,5 0.5,10"
            strokeLinejoin="bevel"
          />
        </svg>

        <svg
          // just shenaningans to have it render looking good
          viewBox={`0 -1 10 10`}
          width="10"
          height={LOOP_RECT_HEIGHT + 1}
          style={{ top: -2 }}
          //
          className="absolute right-0 cursor-col-resize"
          onMouseDown={(e) => {
            project.selected.set({ status: "loop_marker", kind: "end" });
            pressedState.set({
              status: "moving_timeline_points",
              clientX: e.clientX,
              points: set({ original: loopEnd.serialize(), point: loopEnd }),
              limit: [time(1 * PPQN, "pulses").add(loopStart, project), null],
            });
            e.stopPropagation();
          }}
        >
          <polygon
            stroke={tecolor}
            fill={tecolor}
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
  orangePattern: {
    backgroundSize: "4px 4px",
    backgroundImage: `repeating-linear-gradient(45deg, ${ORANGE_TRANSPARENT} 0, ${ORANGE_TRANSPARENT} 1.2px, rgba(0, 0, 0, 0) 0, rgba(0, 0, 0, 0) 50%)`,
  },
});
