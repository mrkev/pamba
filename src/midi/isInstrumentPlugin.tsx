import { WAMAvailablePlugin } from "../wam/plugins";

export function isInstrumentPlugin(plugin: WAMAvailablePlugin): plugin is WAMAvailablePlugin & { pluginKind: "m-a" } {
  if (plugin.pluginKind !== "m-a") {
    return false;
  } else {
    return true;
  }
}
