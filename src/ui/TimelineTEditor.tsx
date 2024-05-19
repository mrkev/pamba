import classNames from "classnames";
import { useState } from "react";
import { AudioProject } from "../lib/project/AudioProject";
import { TimeUnit, TimelineT } from "../lib/project/TimelineT";
import { useLinkedState } from "../lib/state/LinkedState";
import { exhaustive } from "../utils/exhaustive";

const UNITS = ["pulses", "seconds", "bars"] as const;

export function TimelineTEditor({
  project,
  t,
  defaultUnit,
}: {
  t: TimelineT;
  defaultUnit?: TimeUnit;
  project: AudioProject;
}) {
  const [unit, setUnit] = useState<TimeUnit>(defaultUnit ?? t.u);
  useLinkedState(project.tempo); // to re-render on tempo changes

  // console.log(t);
  // TODO: add up/down arrows
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <input
        className="utilityInput"
        type="number"
        value={t.asUnit(unit, project)}
        step={1}
        onChange={(e) => {
          t.set(parseInt(e.target.value), unit);
        }}
      />
      {/* <UtilityNumber value={t.asUnit(unit, project)} style={{ flexGrow: 1 }} /> */}
      <button
        className={classNames("utilityButton")}
        style={{ fontSize: "10px" }}
        title={unit}
        onClick={() => {
          setUnit(UNITS[(UNITS.indexOf(unit) + 1) % UNITS.length]);
        }}
      >
        {unitAbbr(unit)}
      </button>
    </div>
  );
}

function unitAbbr(unit: TimeUnit) {
  switch (unit) {
    case "pulses":
      return "pls";
    case "seconds":
      return "sec";
    case "bars":
      return "bar";
    default:
      exhaustive(unit);
  }
}
