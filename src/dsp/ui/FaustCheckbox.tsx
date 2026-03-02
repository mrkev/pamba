import type { FaustUIInputItem } from "@grame/faustwasm";
import { useLinkAsState } from "marked-subbable";
import { useContainer } from "structured-state";
import { appEnvironment } from "../../lib/AppEnvironment";
import { cn } from "../../utils/cn";
import { exhaustive } from "../../utils/exhaustive";
import { nullthrows } from "../../utils/nullthrows";
import { FaustAudioEffect } from "../FaustAudioEffect";

export function FaustCheckbox({
  item,
  effect,
  direction,
}: {
  item: FaustUIInputItem;
  effect: FaustAudioEffect;
  direction: "vertical" | "horizontal";
}) {
  const [midiLearning, setMidiLearning] = useLinkAsState(appEnvironment.midiLearning);
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

  const checked = value === 1;

  return (
    <div
      className={cn("flex h-full items-center relative")}
      // onClick={onClick}
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
      style={{
        flexDirection: !isHorizontal ? "column-reverse" : "row",
        columnGap: 3,
        rowGap: 3,
        fontSize: 10,
        // border: document.activeElement?.id === id ? "1px solid red" : undefined,
        ...style,
      }}
    >
      <label className="whitespace-nowrap" htmlFor={item.address}>
        {label}
      </label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          effect.setParam(address, e.target.checked ? 1 : 0);
        }}
      />
    </div>
  );
}
