import { usePrimitive } from "structured-state";
import { documentCommands } from "../../input/documentCommands";
import { AudioProject } from "../../lib/project/AudioProject";
import { utility } from "../utility";
import { CommandButton } from "./CommandButton";

export function ToolSelector({ project }: { project: AudioProject }) {
  const [tool] = usePrimitive(project.pointerTool);

  return (
    <div className="flex flex-row" style={{ width: 150 }}>
      <CommandButton toggled={tool === "move"} command={documentCommands.getById("moveTool")} project={project}>
        <i className="ri-cursor-fill"></i>
      </CommandButton>

      <button
        title="slice"
        className={utility.button}
        style={tool === "slice" ? { background: "teal", color: "white" } : undefined}
        onClick={() => {
          if (tool === "slice") {
            documentCommands.execById("moveTool", project);
          } else {
            documentCommands.execById("sliceTool", project);
          }
        }}
      >
        <i className="ri-slice-fill"></i>
      </button>
      <button
        title="trim clips from start"
        className={utility.button}
        style={tool === "trimStart" ? { background: "teal", color: "white" } : undefined}
        onClick={() => {
          if (tool === "trimStart") {
            documentCommands.execById("moveTool", project);
          } else {
            documentCommands.execById("trimStartTool", project);
          }
        }}
      >
        ⇥
      </button>
      <button
        title="trim clips from end"
        className={utility.button}
        style={tool === "trimEnd" ? { background: "teal", color: "white" } : undefined}
        onClick={() => {
          if (tool === "trimEnd") {
            documentCommands.execById("moveTool", project);
          } else {
            documentCommands.execById("trimEndTool", project);
          }
        }}
      >
        ⇤
      </button>
      <span
        className="text-white bg-black shrink-0 whitespace-nowrap font-mono"
        style={{
          fontSize: 12,
          padding: "2px 2px",
          width: 64,
        }}
      >
        {tool}
      </span>
    </div>
  );
}
