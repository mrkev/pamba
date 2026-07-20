import classNames from "classnames";
import { useCallback, useRef, useState } from "react";
import { usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { TimelineT } from "../lib/project/TimelineT";
import { exhaustive } from "../utils/exhaustive";
import { useEventListener } from "./useEventListener";

const UNITS = ["pulses", "seconds", "bars", "frames"] as const;
type DisplayTimeUnit = (typeof UNITS)[number];

export function TimelineTEditor({
  project,
  t,
  defaultUnit,
  readonly,
  onChange,
}: {
  t: TimelineT;
  defaultUnit?: DisplayTimeUnit;
  project: AudioProject;
  readonly?: boolean;
  onChange?: (t: number, unit: DisplayTimeUnit) => void; // TODO: for sorting clips
  // TODO: min value, max value
}) {
  const [unit, setUnit] = useState<DisplayTimeUnit>(defaultUnit ?? t.unit);
  usePrimitive(project.tempo); // to re-render on tempo changes

  const value = t.asUnit(unit, project);
  const editable = !readonly && onChange != null;
  // Typed edits are held locally and only committed on blur/Enter. Committing on every
  // keystroke would fight the user mid-type (an empty field, or "1" on the way to "16",
  // would resize the clip and get formatted back at them). Stepping commits immediately —
  // see the change listener below.
  const [edit, setEdit] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  // Resync the buffer when t changes from elsewhere (dragging the clip on the timeline,
  // switching units, a tempo change).
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setEdit(String(value));
  }

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw);
      // Compared against t's live value rather than the render closure's, because commit
      // runs twice for a single edit — the native change event fires just before blur —
      // and re-reading makes the second run a no-op instead of a duplicate history entry.
      if (editable && !isNaN(parsed) && parsed !== t.asUnit(unit, project)) {
        onChange?.(parsed, unit);
      }
      // onChange mutates t in place, so read back what actually landed: the value may have
      // been clamped or snapped, and if it didn't move at all we still need to drop the
      // rejected text.
      setEdit(String(t.asUnit(unit, project)));
    },
    [editable, onChange, project, t, unit],
  );

  // React's onChange is really the native `input` event, which fires on every step of the
  // spinner buttons and arrow keys. The native `change` event is the one with commit
  // semantics: it fires immediately when stepping, but only on blur/Enter when typing, so
  // steps apply right away without committing half-typed numbers. The value is read off the
  // element because React hasn't re-rendered `edit` yet when this fires.
  useEventListener(
    "change",
    ref,
    useCallback(() => {
      const el = ref.current;
      if (el != null) {
        commit(el.value);
      }
    }, [commit]),
  );

  // TODO: add up/down arrows
  return (
    <div className="flex flex-row">
      <input
        ref={ref}
        className="utilityInput"
        type="number"
        value={editable ? edit : value}
        step={1}
        onChange={(e) => setEdit(e.target.value)}
        // These read the element rather than `edit` so Escape can't commit the text it just
        // discarded: it resets through React, and by the time the blur lands the element
        // holds the restored value. Commit being idempotent covers the overlap with `change`.
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          switch (e.key) {
            case "Enter":
              commit(e.currentTarget.value);
              // otherwise onblur triggers before state change
              setTimeout(() => ref.current?.blur(), 0);
              break;
            case "Escape":
              setEdit(String(value));
              setTimeout(() => ref.current?.blur(), 0);
              break;
          }
        }}
        disabled={!editable}
        readOnly={!editable}
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

function unitAbbr(unit: DisplayTimeUnit) {
  switch (unit) {
    case "pulses":
      return "pls";
    case "seconds":
      return "sec";
    case "bars":
      return "bar";
    case "frames":
      return "frm";
    default:
      exhaustive(unit);
  }
}

function unitTitle(unit: DisplayTimeUnit) {
  switch (unit) {
    case "pulses":
      return "MIDI Pulses";
    case "seconds":
      return "Seconds";
    case "bars":
      return "Bars";
    case "frames":
      return "Frames";
    default:
      exhaustive(unit);
  }
}
