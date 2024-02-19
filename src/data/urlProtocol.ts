import { appEnvironment } from "../lib/AppEnvironment";
import { exhaustive } from "../utils/exhaustive";
import { nullthrows } from "../utils/nullthrows";
import { AudioPackage } from "./AudioPackage";

export function audioSource(
  filename: string,
):
  | { kind: "library"; path: string }
  | { kind: "project"; path: string }
  | { kind: "remote"; url: string }
  | { kind: "opfs"; path: string } {
  try {
    const url = new URL(filename);
    switch (url.protocol) {
      case "opfs:": {
        console.log("opfspathname", url.pathname);
        return { kind: "opfs", path: url.pathname };
      }
      case "library:": {
        const localName = url.pathname.replace(/^\/\//, "");
        return { kind: "library", path: localName };
      }
      case "project:": {
        const localName = url.pathname.replace(/^\/\//, "");
        return { kind: "project", path: localName };
      }
      default:
        return { kind: "remote", url: filename };
    }
  } catch (e) {
    return { kind: "remote", url: filename };
  }
}

export async function localAudioPackage(url: string) {
  const source = audioSource(url);
  switch (source.kind) {
    case "opfs": {
      const audioPackage = await appEnvironment.loadAudio(source.path);
      return audioPackage;
    }
    case "library": {
      // pathname yields //foo/bar. Remove the initial "//"
      const localName = source.path;
      const audioPackage = appEnvironment.localFiles._audioLib.get(localName);
      return audioPackage ?? null;
    }
    case "project": {
      // pathname yields //foo/bar. Remove the initial "//"
      const localName = source.path;
      const audioLibRef = nullthrows(appEnvironment.openProjectPackage?.audioLibRef, "no open audio lib from project");
      const audioPackage = await audioLibRef.open(localName);
      if (!(audioPackage instanceof AudioPackage)) {
        throw audioPackage;
      }
      return audioPackage ?? null;
    }
    case "remote":
      return null;
    default:
      exhaustive(source);
  }
}

export function localURLOfFileName(fileName: string) {
  return `library://${fileName}`;
}

export function fileNameOfLocalURL(url: string) {
  const result = url.match(/library:\/\/(.+)/);
  return result == null ? null : result[1];
}
