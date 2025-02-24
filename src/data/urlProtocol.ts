import { exhaustive } from "../utils/exhaustive";
import { AudioPackage } from "./AudioPackage";
import { FSFile } from "../fs/FSDir";
import { LocalFilesystem } from "./localFilesystem";

// I'm thinking here:
// - "opfs:dir/foobar.mp3", no host. path is dir/foobar.mp3
// - "opfs://host/foobar.mp3". host, and path is foobar.mp3
// dont use protocol to define location, use host
export function audioSource(rawurl: string): { kind: "remote"; url: string } | { kind: "opfs"; path: string } {
  try {
    const url = new URL(rawurl);
    if (url.protocol !== "opfs:") {
      return { kind: "remote", url: rawurl };
    }

    switch (url.host) {
      case "":
        console.log("opfspathname", url.pathname);
        return { kind: "opfs", path: decodeURI(url.pathname) };
      case "project":
      case "library":
      // case "library": {
      //   LocalFilesystem.GLOBAL_AUDIO_LIB_DIR;
      //   const localName = url.pathname.replace(/^\/\//, "");
      //   return { kind: "library", path: localName };
      // }
      // case "project": {
      //   const localName = url.pathname.replace(/^\/\//, "");
      //   return { kind: "project", path: localName };
      // }
      default:
        // unknown location
        throw new Error("UNIMPLEMENTED HOST MULTIPLEXING");
    }
  } catch (e) {
    console.warn(e);
    return { kind: "remote", url: rawurl };
  }
}

export async function localAudioPackage(url: string) {
  const source = audioSource(url); // solves absolute opfs location, or assumes remote url
  switch (source.kind) {
    case "opfs": {
      const result = await LocalFilesystem.browse(source.path.split("/"));
      if (result === "err") {
        throw new Error(`error when browsing for ${source.path}`);
      }

      if (result instanceof FSFile) {
        throw new Error("expected audio package directory, found file instead");
      }

      return AudioPackage.existingPackage(result);
    }
    case "remote":
      return null;
    default:
      exhaustive(source);
  }
}
