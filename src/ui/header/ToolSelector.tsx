import { getGlobalState, useContainer } from "structured-state";
import { documentCommands } from "../../input/useDocumentKeyboardEvents";
import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedState } from "../../lib/state/LinkedState";
import { utility } from "../utility";
import { UtilityToggle } from "../UtilityToggle";

export function ToolSelector({ project }: { project: AudioProject }) {
  const [tool] = useLinkedState(project.pointerTool);
  const history = useContainer(getGlobalState().history);

  return (
    <div style={{ width: 150, display: "flex", flexDirection: "row" }}>
      <button
        disabled={history.length < 1}
        title="undo"
        className={utility.button}
        style={{ marginRight: "2px" }}
        onClick={() => {
          documentCommands.execById("undo", project);
        }}
      >
        {"\u21E0"}
      </button>
      {/* <button
        title="move"
        className={utility.button}
        onClick={() => {
          documentCommands.execById("moveTool", project);
        }}
      >
        {"\u21E2"}
      </button> */}

      <UtilityToggle
        toggled={tool === "move"}
        onToggle={() => {
          documentCommands.execById("moveTool", project);
        }}
      >
        <i className="ri-cursor-fill"></i>
      </UtilityToggle>
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
