import React, { useEffect, useRef } from "react";
import { createUseStyles } from "react-jss";
import { getGlobalState, useContainer } from "structured-state";
import { Command } from "../input/Command";
import { documentCommands } from "../input/documentCommands";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { LinkedArray } from "../lib/state/LinkedArray";
import { UtilityDataList } from "./UtilityList";

export type HistoryItem = {
  clip: AudioClip;
};

export const history = LinkedArray.create([]);

export function History({ project }: { project: AudioProject }) {
  const history = useContainer(getGlobalState().history);

  return (
    <>
      <UtilityDataList
        items={history.map((entry) => {
          return {
            title: entry.id,
            secondary: entry.objects.size,
            data: entry,
          };
        })}
        onItemSelect={(item) => {
          console.log(item.data);
        }}
      />
    </>
  );
}

export function Shortcuts({ project }: { project: AudioProject }) {
  return (
    <>
      {documentCommands.getAllCommands().map((c, i) => {
        const keys = [...c.shortcut].reverse();
        return (
          c.label != null && (
            <div key={i} style={{ borderBottom: "1px solid var(--border-against-bg)" }}>
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <b>{c.label}:</b>
                <span>
                  {keys.map((x, i) => (
                    <kbd title={x} key={i}>
                      {x === "meta"
                        ? "\u2318"
                        : x === "alt"
                        ? "\u2325"
                        : x === "ctrl"
                        ? "\u2303"
                        : x === "shift"
                        ? "\u21EA"
                        : x.replace(/^Key/, "")}
                    </kbd>
                  ))}
                </span>
              </span>
              <br />
              {c.description}
            </div>
          )
        );
      })}
    </>
  );
}

export function Settings({ project }: { project: AudioProject }) {
  return <>Settings</>;
}

export function Help({ project }: { project: AudioProject }) {
  return (
    <>
      <b style={{ fontSize: "12px" }}>Keyboard Shortcuts:</b>
      {/* <hr style={{ width: "100%" }} /> */}
      <div
        className="scrollbar-track"
        style={{ display: "flex", flexDirection: "column", overflowY: "scroll", padding: "2px 2px 2px 0px", gap: 4 }}
      >
        {[...documentCommands.getCommandsBySection().entries()].map(([s, cs], i) => {
          const slabel = s == null ? "Other" : s;
          return (
            <React.Fragment key={slabel}>
              <span style={{ margin: "6px 0px 2px 0px", fontWeight: "bold" }}>{s == null ? "Other" : s}</span>

              {cs.map((c, i) => c.label != null && <KeyboardCommandHelp key={i} command={c} />)}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

function KeyboardCommandHelp({ command }: { command: Command }) {
  const keys = [...command.shortcut].reverse();
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    command.addTriggerListener(() => {
      const div = divRef?.current;
      if (div) {
        div.style.background = "red";
        // div.style.transition = "background .2s";
        setTimeout(() => {
          div.style.background = "#4e4e4e";
        }, 280);
      }
    });
  }, [command]);
  return (
    <div
      ref={divRef}
      style={{
        // borderBottom: "1px solid var(--border-against-bg)",
        background: "#4e4e4e",
        padding: "2px 4px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <b>
          {command.label}
          {command.description && ":"}
        </b>
        <span>
          {keys.map((x, i) => (
            <kbd title={x} key={i}>
              {x === "meta"
                ? "\u2318"
                : x === "alt"
                ? "\u2325"
                : x === "ctrl"
                ? "\u2303"
                : x === "shift"
                ? "\u21EA"
                : x === "Period"
                ? "."
                : x.replace(/^Key/, "")}
            </kbd>
          ))}
        </span>
      </span>
      {command.description && <span style={{ fontSize: 11 }}>{command.description}</span>}
    </div>
  );
}

const useStyles = createUseStyles({
  flashing: {
    background: "red",
  },
});
