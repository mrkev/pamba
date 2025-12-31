import type { FaustUIInputItem } from "@grame/faustwasm";
import { useLinkAsState } from "marked-subbable";
import { createUseStyles } from "react-jss";
import { useContainer } from "structured-state";
import { appEnvironment } from "../../lib/AppEnvironment";
import { UtilitySlider } from "../../ui/UtilitySlider";
import { cn } from "../../utils/cn";
import { exhaustive } from "../../utils/exhaustive";
import { countDecimals } from "../../utils/math";
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
  console.log(item);
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

  const styles = useStyles();

  const stepDecimals = countDecimals(step ?? 0);
  const minSize = Math.max((min ?? 0).toFixed(stepDecimals).length, (max ?? 0).toFixed(stepDecimals).length);
  const renderValue = value.toFixed(countDecimals(step ?? 0)).padStart(minSize, "\xa0"); // Non-breakable space is char 0xa0 (160 dec)

  return (
    <div
      className={cn(styles.container, "flex h-full items-center relative")}
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
        // border: document.activeElement?.id === id ? "1px solid red" : undefined,
        ...style,
      }}
    >
      <label className="whitespace-nowrap" htmlFor={item.address}>
        {label}
      </label>
      <span
        className="whitespace-nowrap pointer-events-none"
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          // position: "absolute",
          // writingMode: vertical ? "vertical-lr" : undefined,
          // [vertical ? "top" : "right"]: 8,
          // mixBlendMode: "overlay",
          // color: "var(--background)",
        }}
      >
        {renderValue}
      </span>
      <UtilitySlider
        id={item.address}
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
        vertical={!isHorizontal}
      />
    </div>
  );
}

const useStyles = createUseStyles({
  container: {
    columnGap: 3,
    rowGap: 3,
    fontSize: 10,
  },
});
