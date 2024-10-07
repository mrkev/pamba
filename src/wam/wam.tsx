import { WamNode as IWamNode, WebAudioModule as IWebAudioModule } from "@webaudiomodules/api";
import React, { useEffect, useRef, useState } from "react";
import type { WebAudioModule } from "../../packages/sdk/dist";
import { WAMAvailablePlugin } from "../lib/AppEnvironment";
import { MidiInstrument } from "../midi/MidiInstrument";
import { importFetch } from "../utils/importModule";
import { PambaWamNode } from "./PambaWamNode";

export type WAMImport = {
  prototype: WebAudioModule;
  createInstance<Node extends IWamNode = IWamNode>(
    groupId: string,
    audioContext: BaseAudioContext,
    initialState?: any,
  ): Promise<WebAudioModule<Node>>;
  new <Node extends IWamNode = IWamNode>(groupId: string, audioContext: BaseAudioContext): WebAudioModule<Node>;
} & Pick<typeof IWebAudioModule, "isWebAudioModuleConstructor">;

export const WamPluginContent = React.memo(function WamPluginContentImpl({ wam }: { wam: PambaWamNode }) {
  const divRef = useRef<HTMLDivElement>(null);

  // For PambaWamNodes
  useEffect(() => {
    if (wam instanceof MidiInstrument) {
      return;
    }

    const div = divRef.current;
    div?.appendChild(wam.dom);
    return () => {
      div?.removeChild(wam.dom);
      wam.destroy();
    };
  }, [wam, wam.dom]);
  return <div ref={divRef} />;
});

export const WamInstrumentContent = React.memo(function WamInstrumentContentImpl({ wam }: { wam: MidiInstrument }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(wam.dom == null ? "loading" : "ready");

  // For PambaWamNodes
  useEffect(() => {
    const dom = wam.dom;
    console.log("EFF", dom);
    if (dom == null) {
      wam.module
        .createGui()
        .then((elem) => {
          wam.dom = elem;
          console.log("createdGui");
          setStatus("ready");
        })
        .catch((err) => {
          setStatus("error");
        });
      return;
    }

    const div = divRef.current;
    div?.appendChild(dom);
    return () => {
      div?.removeChild(dom);
      wam.destroy();
    };
  }, [wam, wam.dom]);

  return <div ref={divRef} />;
});

export async function fetchWam(
  pluginUrl: string,
  kind: "-m" | "-a" | "m-a" | "a-a",
): Promise<WAMAvailablePlugin | null> {
  console.log("WAM: LOADING fromURLlllll", pluginUrl);
  const rawModule = await import(/* @vite-ignore */ pluginUrl);
  if (rawModule == null) {
    console.error("could not import", rawModule);
    return null;
  }
  const plugin: WAMImport = rawModule.default;

  if (plugin == null) {
    console.warn(`error: loading wam at url ${pluginUrl}`);
    return null;
  }
  // TODO: propery initialize instead to get proper metadata?
  const descriptor = new (plugin as any)().descriptor;
  // console.log(descriptor);
  return {
    kind: "WAMAvailablePlugin",
    import: plugin,
    descriptor,
    pluginKind: kind,
    url: pluginUrl,
  };
}
