import { exhaustive } from "../../utils/exhaustive";
import { FaustAudioEffect, LayoutTypeMap } from "../FaustAudioEffect";
import "./faust.css";
import { FaustGroup } from "./FaustGroup";
import { FaustSlider } from "./FaustSlider";

type TFaustUIItem = LayoutTypeMap[keyof LayoutTypeMap];

export function FaustItem({ item, effect, arrPos }: { item: TFaustUIItem; effect: FaustAudioEffect; arrPos: number }) {
  const { type } = item;

  switch (type) {
    case "vgroup": {
      return <FaustGroup item={item} effect={effect} isFirstItem={arrPos === 0} />;
    }

    case "hgroup": {
      return <FaustGroup item={item} effect={effect} isFirstItem={arrPos === 0} />;
    }

    case "hslider": {
      return <FaustSlider item={item} effect={effect} direction="horizontal" />;
    }

    case "vslider": {
      return <FaustSlider item={item} effect={effect} direction="vertical" />;
    }

    case "tgroup":
      // TODO: tgroup
      return (
        <div>
          tgroup
          {item.items.map((item, i) => {
            return <FaustItem key={i} item={item} effect={effect} arrPos={i} />;
          })}
        </div>
      );

    case "hbargraph":
      return <div>hbargraph</div>;

    case "vbargraph":
      return <div>vbargraph</div>;

    case "button":
      return <button>button</button>;

    case "checkbox":
      return <input type="checkbox" />;

    case "nentry":
      return <div>nentry</div>;

    case "soundfile":
      return <div>soundfile</div>;

    default:
      return exhaustive(type);
  }
}
