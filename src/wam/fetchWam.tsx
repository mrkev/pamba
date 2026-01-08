import { WamNode as IWamNode, WebAudioModule as IWebAudioModule } from "@webaudiomodules/api";
import type { WebAudioModule } from "../../packages/sdk/dist";

export type WAMImport = {
  prototype: WebAudioModule;
  createInstance<Node extends IWamNode = IWamNode>(
    groupId: string,
    audioContext: BaseAudioContext,
    initialState?: any,
  ): Promise<WebAudioModule<Node>>;
  new <Node extends IWamNode = IWamNode>(groupId: string, audioContext: BaseAudioContext): WebAudioModule<Node>;
} & Pick<typeof IWebAudioModule, "isWebAudioModuleConstructor">;

export async function fetchWam(pluginUrl: string, kind: "-m" | "-a" | "m-a" | "a-a") {
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
  return plugin;

  // TODO: propery initialize instead to get proper metadata?
  // const descriptor = new (plugin as any)().descriptor;
  // console.log(descriptor);
  // return {
  //   kind: "WAMAvailablePlugin",
  //   import: plugin,
  //   // descriptor,
  //   pluginKind: kind,
  //   url: pluginUrl,
  // };
}
