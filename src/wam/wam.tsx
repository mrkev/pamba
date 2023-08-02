import { WamNode as IWamNode, WebAudioModule as IWebAudioModule, WamDescriptor } from "@webaudiomodules/api";
import React, { useEffect, useRef } from "react";
import type { WebAudioModule } from "../../packages/sdk/dist";
import { PambaWamNode } from "./PambaWamNode";
import { WAMAvailablePlugin } from "../lib/AppEnvironment";

export type WAMImport = {
  prototype: WebAudioModule;
  createInstance<Node extends IWamNode = IWamNode>(
    groupId: string,
    audioContext: BaseAudioContext,
    initialState?: any
  ): Promise<WebAudioModule<Node>>;
  new <Node extends IWamNode = IWamNode>(groupId: string, audioContext: BaseAudioContext): WebAudioModule<Node>;
} & Pick<typeof IWebAudioModule, "isWebAudioModuleConstructor">;

export const WamPluginContent = React.memo(function WamPluginContentImpl({ wam }: { wam: PambaWamNode }) {
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const div = divRef.current;
    div?.appendChild(wam.dom);
    return () => {
      div?.removeChild(wam.dom);
      wam.destroy();
    };
  }, [wam, wam.dom]);
  return <div ref={divRef} />;
});

export async function fetchWam(
  pluginUrl: string,
  kind: "-m" | "-a" | "m-a" | "a-a"
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
  return { import: plugin, descriptor, kind };
}
