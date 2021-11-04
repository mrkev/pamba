import createPanner from "./Panner.dsp";
import { TFaustUIItem, TFaustUIInputItem } from "@shren/faust-ui/src/types";

import { AudioContext } from "standardized-audio-context";
import React, { useEffect, useState } from "react";
import { FaustAudioProcessorNode } from "faust-loader";

const context = new AudioContext();

declare function exhaustive(x: never): never;

interface INodeData {
  compile_options: string;
  filename: string;
  include_pathnames: Array<string>;
  inputs: number;
  library_list: Array<string>;
  meta: Array<any>;
  name: string;
  outputs: number;
  size: number;
  ui: Array<TFaustUIItem>;
  version: string;
}

function FaustItem({ item }: { item: TFaustUIItem }) {
  const { type } = item;

  switch (type) {
    case "vgroup": {
      const { items, label } = item;

      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div>{label}</div>
          {items.map((item, i) => {
            return <FaustItem key={i} item={item} />;
          })}
        </div>
      );
    }

    case "hgroup":
      return (
        <div>
          "hgroup"
          {item.items.map((item, i) => {
            return <FaustItem key={i} item={item} />;
          })}
        </div>
      );

    case "tgroup":
      return (
        <div>
          "tgroup"{" "}
          {item.items.map((item, i) => {
            return <FaustItem key={i} item={item} />;
          })}
        </div>
      );

    case "hbargraph":
      return <div>"hbargraph"</div>;

    case "vbargraph":
      return <div>"vbargraph"</div>;

    case "hslider": {
      return <FaustHSlider item={item} />;
    }

    case "vslider":
      return <input type="range"></input>;

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

function FaustHSlider({ item }: { item: TFaustUIInputItem }) {
  const { label, index, init, min, max, step } = item;
  const [value, setValue] = useState(init);
  return (
    <React.Fragment>
      <label htmlFor={`${index}`}>{label}</label>
      <input
        id={`${index}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const newVal = parseFloat(e.target.value);
          setValue(newVal);
        }}
      ></input>
    </React.Fragment>
  );
}

function FaustModule({ ui }: { ui: Array<TFaustUIItem> }) {
  return (
    <div style={{ background: "gray" }}>
      {ui.map((item, i) => {
        return <FaustItem key={i} item={item} />;
        // renderItem(item);
      })}
    </div>
  );
}

export function FaustTest() {
  const [node, setNode] = useState<null | FaustAudioProcessorNode>(null);
  const [ui, setUi] = useState<Array<TFaustUIItem>>([]);
  useEffect(() => {
    (async function () {
      const panner = await createPanner(context);
      if (!panner) {
        return;
      }
      const nodeData: INodeData = JSON.parse((panner as any).getJSON());
      const { ui } = nodeData;
      setNode(panner || null);
      setUi(ui);
    })();
  }, []);

  if (!node || !ui) {
    return null;
  }

  return <FaustModule ui={ui} />;
}
