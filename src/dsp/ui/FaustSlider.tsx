import type { FaustUIInputItem } from "@grame/faustwasm";
import { useContainer } from "structured-state";
import { UtilitySlider } from "../../ui/UtilitySlider";
import { nullthrows } from "../../utils/nullthrows";
import { FaustAudioEffect } from "../FaustAudioEffect";

export function FaustSlider({
  item,
  effect,
  direction,
}: {
  item: FaustUIInputItem;
  effect: FaustAudioEffect;
  direction: "vertical" | "horizontal";
}) {
  const isHorizontal = direction === "horizontal";
  const { label, min, max, step, address } = item;

  // observe the map to be notified of changes
  const params = useContainer(effect.params);
  // TODO: handle, disable control, show error state?
  const value = nullthrows(params.get(address), `Invalid address for effect param: ${address}`);

  // const [value, setValue] = useState(() => effect.getParam(address));

  return (
    <UtilitySlider
      label={label}
      min={min ?? 0}
      max={max ?? 128}
      step={step}
      value={value}
      // style={{}}
      onChange={(e) => {
        const newVal = parseFloat(e.target.value);
        effect.setParam(address, newVal);
      }}
      vertical={!isHorizontal}
    />
  );
}
