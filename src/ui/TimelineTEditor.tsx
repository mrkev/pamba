import classNames from "classnames";
import { useState } from "react";
import { usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { TimeUnit, TimelineT } from "../lib/project/TimelineT";
import { exhaustive } from "../utils/exhaustive";

const UNITS = ["pulses", "seconds", "bars"] as const;

export function TimelineTEditor({
  project,
  t,
  defaultUnit,
  readonly,
  onChange,
}: {
  t: TimelineT;
  defaultUnit?: TimeUnit;
  project: AudioProject;
  readonly?: boolean;
  onChange: (t: number, unit: TimeUnit) => void; // TODO: for sorting clips
  // TODO: min value, max value
}) {
  const [unit, setUnit] = useState<TimeUnit>(defaultUnit ?? t.u);
  usePrimitive(project.tempo); // to re-render on tempo changes

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
          onChange(parseInt(e.target.value), unit);
        }}
        disabled={readonly}
        readOnly={readonly}
        style={{ flexShrink: 1 }}
      />
      {/* <UtilityNumber value={t.asUnit(unit, project)} style={{ flexGrow: 1 }} /> */}
      <button
        className={classNames("utilityButton")}
        style={{ fontSize: "10px", width: 29 }}
        title={unitTitle(unit)}
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

function unitTitle(unit: TimeUnit) {
  switch (unit) {
    case "pulses":
      return "MIDI Pulses";
    case "seconds":
      return "Seconds";
    case "bars":
      return "Bars";
    default:
      exhaustive(unit);
  }
}
