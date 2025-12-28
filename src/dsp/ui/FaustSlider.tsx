import type { FaustUIInputItem } from "@grame/faustwasm";
import { useContainer, usePrimitive } from "structured-state";
import { UtilitySlider } from "../../ui/UtilitySlider";
import { nullthrows } from "../../utils/nullthrows";
import { FaustAudioEffect } from "../FaustAudioEffect";
import { appEnvironment } from "../../lib/AppEnvironment";
import { exhaustive } from "../../utils/exhaustive";

export function FaustSlider({
  item,
  effect,
  direction,
}: {
  item: FaustUIInputItem;
  effect: FaustAudioEffect;
  direction: "vertical" | "horizontal";
}) {
  console.log(item);
  const [midiLearning, setMidiLearning] = usePrimitive(appEnvironment.midiLearning);
  const isHorizontal = direction === "horizontal";
  const { label, min, max, step, address } = item;

  // observe the map to be notified of changes
  const params = useContainer(effect.params);
  // TODO: handle, disable control, show error state?
  const value = nullthrows(params.get(address), `Invalid address for effect param: ${address}`);

  // const [value, setValue] = useState(() => effect.getParam(address));

  const style = ((): React.CSSProperties | undefined => {
    const waitingStyle = { background: "var(--timeline-bg)" };

    switch (midiLearning.status) {
      case "off":
        return undefined;
      case "waiting":
        return waitingStyle;
      case "learning":
        if (midiLearning.effect === effect && midiLearning.address === address) {
          return { background: "orange" };
        } else {
          return waitingStyle;
        }
      default:
        exhaustive(midiLearning);
    }
  })();

  return (
    <UtilitySlider
      label={label}
      min={min ?? 0}
      max={max ?? 128}
      step={step}
      value={value}
      style={style}
      onChange={(e) => {
        const newVal = parseFloat(e.target.value);
        effect.setParam(address, newVal);
      }}
      onMouseDownCapture={
        midiLearning.status === "off"
          ? undefined
          : (e) => {
              e.stopPropagation();
              e.preventDefault();
              setMidiLearning({ status: "learning", effect, address });
              console.log(effect, address);
            }
      }
      vertical={!isHorizontal}
    />
  );
}
