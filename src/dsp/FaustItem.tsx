import { TFaustUIItem } from "@shren/faust-ui/src/types";
import React from "react";
import { exhaustive } from "./exhaustive";
import { FaustSlider } from "./FaustSlider";
import { FaustNodeSetParamFn } from "./Faust";
import "./faust.css";
import { FaustGroup } from "./FaustGroup";

export function FaustItem({ item, setParam }: { item: TFaustUIItem; setParam: FaustNodeSetParamFn }) {
  const { type } = item;

  switch (type) {
    case "vgroup": {
      return <FaustGroup item={item} setParam={setParam} />;
    }

    case "hgroup": {
      return <FaustGroup item={item} setParam={setParam} />;
    }

    case "hslider": {
      return <FaustSlider item={item} setParam={setParam} direction="horizontal" />;
    }

    case "vslider": {
      return <FaustSlider item={item} setParam={setParam} direction="vertical" />;
    }

    case "tgroup":
      return (
        <div>
          "tgroup"{" "}
          {item.items.map((item, i) => {
            return <FaustItem key={i} item={item} setParam={setParam} />;
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
