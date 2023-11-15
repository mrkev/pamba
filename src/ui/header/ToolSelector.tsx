import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedState } from "../../lib/state/LinkedState";
import { utility } from "../utility";

export function ToolSelector({ project }: { project: AudioProject }) {
  const [tool, setTool] = useLinkedState(project.pointerTool);
  return (
    <div style={{ width: 150, display: "flex", flexDirection: "row" }}>
      <button
        title="move"
        className={utility.button}
        style={tool === "move" ? { background: "#BABABA", color: "black" } : undefined}
        onClick={() => {
          setTool("move");
        }}
      >
        <i className="ri-cursor-fill"></i>
      </button>
      <button
        title="slice"
        className={utility.button}
        style={tool === "slice" ? { background: "teal", color: "white" } : undefined}
        onClick={() => {
          if (tool === "slice") {
            setTool("move");
          } else {
            setTool("slice");
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
            setTool("move");
          } else {
            setTool("trimStart");
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
            setTool("move");
          } else {
            setTool("trimEnd");
          }
        }}
      >
        ⇤
      </button>
      <span
        style={{
          color: "white",
          fontSize: 12,
          background: "black",
          padding: "2px 4px",
          width: 50,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {tool}
      </span>
    </div>
  );
}
