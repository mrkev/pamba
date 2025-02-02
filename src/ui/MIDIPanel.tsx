import { useContainer, usePrimitive } from "structured-state";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioProject } from "../lib/project/AudioProject";
import { UtilityDataList } from "./UtilityList";
import { UtilityToggle } from "./UtilityToggle";

export function MIDIPanel(_: { project: AudioProject }) {
  const [midiLearning, setMidiLearning] = usePrimitive(appEnvironment.midiLearning);
  const midiInputMap = useContainer(appEnvironment.midiDevices.inputs);
  const midiInputs = [...midiInputMap.values()];

  return (
    <>
      <div>
        <UtilityToggle
          title={"midi learn"}
          toggled={midiLearning.status !== "off"}
          onToggle={() => {
            if (midiLearning.status === "off") {
              setMidiLearning({ status: "waiting" });
            } else {
              setMidiLearning({ status: "off" });
            }
          }}
        >
          midi learn
        </UtilityToggle>
      </div>
      {midiInputs.map((x) => (
        <div key={x.id}>{x.name ?? "Input " + x.id}</div>
      ))}
      <UtilityDataList items={midiInputs.map((x) => ({ title: x.name ?? x.id, data: x }))} />
    </>
  );
}
