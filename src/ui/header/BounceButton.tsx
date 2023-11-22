import { AudioRenderer } from "../../lib/AudioRenderer";
import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedState } from "../../lib/state/LinkedState";
import { utility } from "../utility";

export function BounceButton({ project }: { project: AudioProject; renderer: AudioRenderer }) {
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  return (
    <div style={{ width: 105, display: "flex", flexDirection: "row-reverse" }}>
      <button
        className={utility.button}
        onClick={async () => {
          await AudioRenderer.bounceSelection(project);
        }}
      >
        {selectionWidth && Math.abs(selectionWidth) > 0 ? "bounce selected" : "bounce all"}
      </button>
    </div>
  );
}
