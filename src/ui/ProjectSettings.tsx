import React from "react";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";

export function ProjectSettings({ project }: { project: AudioProject }) {
  const [name] = useLinkedState(project.projectName);

  return (
    <>
      <label style={{ fontSize: "11px" }}>Project Name</label>
      <input
        style={{
          border: "2px solid var(--control-bg-color)",
        }}
        type="text"
        value={name}
        onChange={(e) => project.projectName.set(e.target.value)}
      />
    </>
  );
}
