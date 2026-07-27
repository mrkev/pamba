import { useLink, useLinkAsState } from "marked-subbable";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioProject } from "../lib/project/AudioProject";
import { cn } from "../utils/cn";
import { UtilityToggle } from "./UtilityToggle";
import { AudioRecorder } from "../lib/io/AudioRecorder";

export function DevicesPanel({ recorder }: { project: AudioProject; recorder: AudioRecorder }) {
  const [midiLearning, setMidiLearning] = useLinkAsState(appEnvironment.midiLearning);
  const inputs = useLink(appEnvironment.midiDevices.inputs);
  const midiInputs = [...inputs().values()];
  const listening = useLink(appEnvironment.midiDevices.activeInputs);
  const inputDevices = useLink(recorder.audioInputDevices);
  const [selectedDevice] = useLinkAsState(recorder.currentInput);

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
          <div className="flex flex-row items-start" key={x.id}>
            <input
              type="checkbox"
              disabled={disconnected}
              checked={listening().has(x.id)}
              onChange={() => {
                if (listening().has(x.id)) {
                  appEnvironment.midiDevices.stopListening(x);
                } else {
                  appEnvironment.midiDevices.listen(x);
                }
              }}
            />
            <div>
              <span className={cn(disconnected && "text-list-item-disabled")} key={x.id}>
                {x.name ?? "Input " + x.id}
              </span>
              <br />
              <span className="text-sm text-control-subtle-highlight">{x.id}</span>
            </div>
          </div>
        );
      })}

      <select
        style={{ width: "100%" }}
        value={selectedDevice ?? undefined}
        onChange={(e) => recorder.selectInputDevice(e.target.value)}
      >
        {inputDevices().map((device) => (
          <option value={device.deviceId} key={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
    </>
  );
}
