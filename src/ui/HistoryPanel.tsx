import { createUseStyles } from "react-jss";
import { getGlobalState, useContainer } from "structured-state";
import { AudioClip } from "../lib/AudioClip";
import { AudioProject } from "../lib/project/AudioProject";
import { LinkedArray } from "../lib/state/LinkedArray";
import { UtilityDataList } from "./UtilityList";

export type HistoryItem = {
  clip: AudioClip;
};

export const history = LinkedArray.create([]);

export function HistoryPanel({ project }: { project: AudioProject }) {
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

export function Settings({ project }: { project: AudioProject }) {
  return <>Settings</>;
}

const useStyles = createUseStyles({
  flashing: {
    background: "red",
  },
});
