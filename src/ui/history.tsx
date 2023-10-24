import { AudioProject } from "../lib/project/AudioProject";
import { UtilityDataList } from "./UtilityList";
import { LinkedArray } from "../lib/state/LinkedArray";
import { AudioClip } from "../lib/AudioClip";

export type HistoryItem = {
  clip: AudioClip;
};

export const history = LinkedArray.create([]);

export function History({ project }: { project: AudioProject }) {
  return <UtilityDataList items={[]}></UtilityDataList>;
}
