import React from "react";
import { AudioRenderer } from "../../lib/AudioRenderer";
import { AudioProject } from "../../lib/project/AudioProject";
import { useLinkedState } from "../../lib/state/LinkedState";
import { ignorePromise } from "../../utils/ignorePromise";
import { utility } from "../utility";

export function BounceButton({ project }: { project: AudioProject; renderer: AudioRenderer }) {
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  return (
    <button
      className={utility.button}
      onClick={() => {
        ignorePromise(AudioRenderer.bounceSelection(project));
      }}
    >
      {selectionWidth && Math.abs(selectionWidth) > 0 ? "bounce selected" : "bounce all"}
    </button>
  );
}
