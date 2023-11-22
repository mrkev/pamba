import { AudioProject } from "../lib/project/AudioProject";
import { UtilityDataList } from "./UtilityList";
import { LinkedArray } from "../lib/state/LinkedArray";
import { AudioClip } from "../lib/AudioClip";
import { getGlobalState, useContainer } from "structured-state";
import { doConfirm } from "./ConfirmDialog";
import { documentCommands } from "../input/useDocumentKeyboardEvents";

export type HistoryItem = {
  clip: AudioClip;
};

export const history = LinkedArray.create([]);

export function History({ project }: { project: AudioProject }) {
  const history = useContainer(getGlobalState().history);

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
      <UtilityDataList
        items={history.map((entry) => {
          return {
            title: entry.id,
            secondary: entry.objects.size,
            data: entry,
          };
        })}
      />
    </>
  );
}
