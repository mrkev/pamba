import { TFaustUIItem } from "@shren/faust-ui/src/types";
import { exhaustive } from "../../utils/exhaustive";
import { FaustAudioEffect } from "../FaustAudioEffect";
import "./faust.css";
import { FaustGroup } from "./FaustGroup";
import { FaustSlider } from "./FaustSlider";

export function FaustItem({ item, effect }: { item: TFaustUIItem; effect: FaustAudioEffect }) {
  const { type } = item;

  switch (type) {
    case "vgroup": {
      return <FaustGroup item={item} effect={effect} />;
    }

    case "hgroup": {
      return <FaustGroup item={item} effect={effect} />;
    }

    case "hslider": {
      return <FaustSlider item={item} effect={effect} direction="horizontal" />;
    }

    case "vslider": {
      return <FaustSlider item={item} effect={effect} direction="vertical" />;
    }

    case "tgroup":
      return (
        <div>
          "tgroup"{" "}
          {item.items.map((item, i) => {
            return <FaustItem key={i} item={item} effect={effect} />;
          })}
        </div>
      );

    case "hbargraph":
      return <div>"hbargraph"</div>;

    case "vbargraph":
      return <div>"vbargraph"</div>;

    case "button":
      return <button>"button"</button>;

    case "checkbox":
      return <input type="checkbox">"checkbox"</input>;

    case "nentry":
      return <div>"nentry"</div>;

    default:
      return exhaustive(type);
  }
}
