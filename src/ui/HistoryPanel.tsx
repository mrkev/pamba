import { getGlobalState, useContainer } from "structured-state";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { UtilityDataList } from "./UtilityList";

export type HistoryItem = {
  clip: AudioClip;
};

export function HistoryPanel(_: { project: AudioProject }) {
  const history = useContainer(getGlobalState().history);

  return (
    <>
      <UtilityDataList
        items={history.map((entry) => {
          return {
            title: entry.name,
            data: entry,
          };
        })}
        onItemSelect={(item) => {
          console.log(item.data);
        }}
      />
    </>
  );
}
