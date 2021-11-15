// import createPanner from "./Panner.dsp";
import { TFaustUIItem, TFaustUIInputItem } from "@shren/faust-ui/src/types";
import React, { useEffect, useState } from "react";
import { FaustAudioProcessorNode, ProcessorLoader } from "faust-loader";

declare function exhaustive(x: never): never;

export interface INodeData {
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

function FaustItem({
  item,
  setParam,
}: {
  item: TFaustUIItem;
  setParam: FaustNodeSetParamFn;
}) {
  const { type } = item;

  switch (type) {
    case "vgroup": {
      const { items, label } = item;

      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div>{label}</div>
          {items.map((item, i) => {
            return <FaustItem key={i} item={item} setParam={setParam} />;
          })}
        </div>
      );
    }

    case "hgroup":
      return (
        <div>
          "hgroup"
          {item.items.map((item, i) => {
            return <FaustItem key={i} item={item} setParam={setParam} />;
          })}
        </div>
      );

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

    case "hslider": {
      return <FaustHSlider item={item} setParam={setParam} />;
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

function FaustHSlider({
  item,
  setParam,
}: {
  item: TFaustUIInputItem;
  setParam: FaustNodeSetParamFn;
}) {
  const { label, index, init, min, max, step, address } = item;
  const [value, setValue] = useState(init);
  return (
    <div style={{ display: "flex", flexDirection: "row", columnGap: 6 }}>
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
          setValue(() => {
            setParam(address, newVal);
            return newVal;
          });
        }}
      ></input>
    </div>
  );
}

export type FaustNodeSetParamFn = (address: string, value: number) => void;

export function FaustModule({
  ui,
  setParam,
  style,
}: {
  ui: Array<TFaustUIItem>;
  setParam: FaustNodeSetParamFn;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "gray",
        border: "1px solid #333",
        padding: 4,
        fontSize: "14px",
        ...style,
      }}
    >
      {ui.map((item, i) => {
        return <FaustItem key={i} item={item} setParam={setParam} />;
      })}
    </div>
  );
}

export function FaustTest({ context }: { context: AudioContext }) {
  const [node, setNode] = useState<null | FaustAudioProcessorNode>(null);
  const [ui, setUi] = useState<Array<TFaustUIItem>>([]);
  useEffect(() => {
    (async function () {
      const createPanner = await import("./Panner.dsp");

      const panner = await createPanner.default(context);
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

  return <FaustModule ui={ui} setParam={node.setParam} />;
}

type FaustEffectImport = Promise<{ default: ProcessorLoader }> | null;
export abstract class FaustAudioEffect {
  static importPromise: FaustEffectImport = import("./Panner.dsp");
  node: FaustAudioProcessorNode;
  data: INodeData;
  ui: Array<TFaustUIItem>;

  constructor(faustNode: FaustAudioProcessorNode) {
    this.node = faustNode;
    (window as any).nn = faustNode;
    const nodeData: INodeData = JSON.parse((faustNode as any).getJSON());
    this.data = nodeData;
    this.ui = nodeData.ui;
  }

  static async create(context: AudioContext): Promise<FaustAudioEffect | null> {
    if (this.importPromise === null) {
      throw new Error("no import promise specified!");
    }
    const mod = await this.importPromise;
    const creator: ProcessorLoader = mod.default;
    const node = await creator(context);
    if (!node) {
      return null;
    }
    return new (this as any)(node);
  }
}

export class PannerFaustAudioEffect extends FaustAudioEffect {
  static importPromise = import("./Panner.dsp");
}

(window as any).PannerFaustAudioEffect = PannerFaustAudioEffect;
