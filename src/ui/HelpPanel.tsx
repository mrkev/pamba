import React, { useEffect, useRef } from "react";
import { Command } from "../input/Command";
import { documentCommands } from "../input/documentCommands";
import { AudioProject } from "../lib/project/AudioProject";

export function HelpPanel({ project }: { project: AudioProject }) {
  return (
    <>
      <b style={{ fontSize: "12px" }}>Help:</b>
      <div>
        For help, feedback, etc. get in touch:
        <br />-{" "}
        <a href="https://twitter.com/aykev" style={{ color: "white", display: "inline" }}>
          @aykev
        </a>
        <br />-{" "}
        <a href="https://github.com/mrkev/web-daw-issues/issues" style={{ color: "white", display: "inline" }}>
          mrkev/web-daw-issues
        </a>
      </div>
      <br />
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
        <span>
          Hold <Key str={"meta"} /> when selecting, cutting or clicking to toggle "snap to grid"
        </span>
      </div>
    </>
  );
}

function KeyboardCommandHelp({ command }: { command: Command }) {
  const keys = [...command.shortcut].reverse();
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    return command.addTriggerListener(() => {
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
            <Key str={x} key={i}></Key>
          ))}
        </span>
      </span>
      {command.description && <span style={{ fontSize: 11 }}>{command.description}</span>}
    </div>
  );
}

function Key({ str }: { str: string }) {
  return (
    <kbd title={str}>
      {str === "meta"
        ? "\u2318"
        : str === "alt"
          ? "\u2325"
          : str === "ctrl"
            ? "\u2303"
            : str === "shift"
              ? "\u21EA"
              : str === "Period"
                ? "."
                : str.replace(/^Key/, "")}
    </kbd>
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
