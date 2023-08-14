import React from "react";
import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedState } from "../../lib/state/LinkedState";
import { utility } from "../utility";

export function ToolSelector({ project }: { project: AudioProject }) {
  const [tool, setTool] = useLinkedState(project.pointerTool);
  return (
    <div style={{ width: 140 }}>
      <button
        className={utility.button}
        style={tool === "trimStart" ? { background: "teal", color: "white" } : undefined}
        onClick={() => {
          if (tool === "trimStart") {
            setTool("move");
          } else {
            setTool("trimStart");
          }
        }}
      >
        ⇥
      </button>
      <button
        className={utility.button}
        style={tool === "trimEnd" ? { background: "teal", color: "white" } : undefined}
        onClick={() => {
          if (tool === "trimEnd") {
            setTool("move");
          } else {
            setTool("trimEnd");
          }
        }}
      >
        ⇤
      </button>
      {tool === "move" ? "move \u00b7" : tool === "trimStart" ? "trimStart ⇥" : tool === "trimEnd" ? "trimEnd ⇤" : tool}
    </div>
  );
}
