import { appEnvironment } from "../lib/AppEnvironment";

export async function localAudioPackage(filename: string) {
  const url = new URL(filename);
  switch (url.protocol) {
    case "library:": {
      // pathname yields //foo/bar. Remove the initial "//"
      const localName = url.pathname.replace(/^\/\//, "");
      const audioPackage = appEnvironment.localFiles._audioLib.get(localName);
      return audioPackage ?? null;
    }
    case "project:":

    default:
      throw new Error(`Invalid local URL protocol: ${filename}`);
  }
}

export function localURLOfFileName(fileName: string) {
  return `library://${fileName}`;
}

export function fileNameOfLocalURL(url: string) {
  const result = url.match(/library:\/\/(.+)/);
  return result == null ? null : result[1];
}
