import { useLink, useLinkAsState } from "marked-subbable";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioProject } from "../lib/project/AudioProject";
import { cn } from "../utils/cn";
import { UtilityToggle } from "./UtilityToggle";

export function MIDIPanel(_: { project: AudioProject }) {
  const [midiLearning, setMidiLearning] = useLinkAsState(appEnvironment.midiLearning);
  const inputs = useLink(appEnvironment.midiDevices.inputs);
  const midiInputs = [...inputs().values()];

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
      {midiInputs.map((x) => {
        const disconnected = x.state === "disconnected";
        return (
          <div className="flex flex-row items-center" key={x.id}>
            <input type="checkbox" disabled={disconnected} />
            <span className={cn(disconnected && "text-list-item-disabled")} key={x.id}>
              {x.name ?? "Input " + x.id}
            </span>
          </div>
        );
      })}
    </>
  );
}
