import { useState } from "react";
import { utility } from "../ui/utility";
import { UtilityTextInput } from "../ui/UtilityButton";
import { ListItem, UtilityDataList } from "../ui/UtilityList";
import { UtilityMenu } from "../ui/UtilityMenu";
import { UtilityNumber } from "../ui/UtilityNumber";
import { UtilityNumberSlider, UtilitySlider } from "../ui/UtilitySlider";
import { UtilityToggle } from "../ui/UtilityToggle";
import { cn } from "../utils/cn";

const DATA_LIST_ITEMS = [...Array(40)].map((): ListItem<null> => {
  return { data: null, icon: <i className="ri-file-music-line" />, title: "hello world" };
});

export function TestUtility() {
  const [toggled, setToggled] = useState(false);
  const [number, setNumber] = useState(64);
  const [str, setStr] = useState("hello world");
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <button className={cn(utility.button)}>button</button>
        <UtilityToggle title={"toggle"} toggled={toggled} onToggle={setToggled}>
          toggle
        </UtilityToggle>
        <UtilitySlider
          min={0}
          max={128}
          value={number}
          step={1}
          onChange={(e) => {
            const newVal = parseFloat(e.target.value);
            setNumber(newVal);
          }}
        />
        <UtilityNumberSlider
          min={0}
          max={128}
          value={number}
          onChange={function (val): void {
            setNumber(val);
          }}
        />
        <UtilityNumber
          // min={0}
          // max={128}
          value={number}
          // step={1}
          onChange={(value) => setNumber(value)}
        />
        <UtilityDataList items={DATA_LIST_ITEMS} className="max-h-[100px]" />
        <UtilityMenu label={"menu"} items={{ item: () => {}, "item two": () => {} }} />
        <UtilityTextInput value={str} onChange={(value: string) => setStr(value)} />
      </div>
    </>
  );
}
