import { AudioProject } from "../lib/project/AudioProject";
import { UtilityDataList } from "./UtilityList";
import { LinkedArray } from "../lib/state/LinkedArray";
import { AudioClip } from "../lib/AudioClip";
import { getGlobalState, useContainer } from "structured-state";

export type HistoryItem = {
  clip: AudioClip;
};

export const history = LinkedArray.create([]);

export function History({ project }: { project: AudioProject }) {
  const history = useContainer(getGlobalState().history);

  return (
    <UtilityDataList
      items={history.map((entry) => {
        return {
          title: entry.id,
          secondary: entry.objects.size,
          data: entry,
        };
      })}
    />
  );
}
