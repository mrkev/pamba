import { AudioClip } from "./lib/AudioClip";
import { AudioTrack } from "./lib/AudioTrack";

function jsonifyState(val: unknown): any {
  if (typeof val === "number" || typeof val === "string" || typeof val === "undefined") {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map(jsonifyState);
  }

  if (typeof val === "object") {
    if (val === null) {
      return val;
    }

    const res: Record<string, any> = {};
    switch (val.constructor) {
      case AudioClip:
        // TODO: unused
        // case AudioTrack:
        res.__constructor = val.constructor.name;
        break;
      case Object:
        break;
      default:
        return `constructor/${val.constructor.name}`;
    }

    for (let key in val) {
      res[key] = jsonifyState((val as any)[key]);
    }

    return res;
  }

  if (typeof val === "function") {
    return `function/${val.name}`;
  }

  throw new Error(`Don't know how to jsonify "${val}".`);
}
