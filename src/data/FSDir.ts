import { pTry } from "../utils/ignorePromise";
import { LocalFilesystem } from "./localFilesystem";

export class FSDir {
  constructor(
    public readonly handle: FileSystemDirectoryHandle,
    public readonly path: readonly string[],
  ) {}

  get name() {
    return this.path[this.path.length - 1];
  }

  static async ensure(path: readonly string[]) {
    switch (path[0]) {
      case undefined:
        throw new Error("fs: empty path");
      case LocalFilesystem.ROOT_NAME:
        break;
      default:
        throw new Error(`fs: path doesn't start at root: ${path}`);
    }

    let currentDir = navigator.storage.getDirectory();
    for (let i = 1; i < path.length; i++) {
      currentDir = currentDir.then((x) => x.getDirectoryHandle(path[i], { create: true }));
    }

    const dir = await currentDir;
    return new FSDir(dir, path);
  }

  public async list() {
    const results = [];
    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639
    for await (let [_, child] of (this.handle as any).entries()) {
      child as FileSystemDirectoryHandle | FileSystemFileHandle;

      if (child instanceof FileSystemFileHandle) {
        results.push(new FSFile(child, this.path.concat(child.name)));
        continue;
      }

      if (child instanceof FileSystemDirectoryHandle) {
        results.push(new FSDir(child, this.path.concat(child.name)));
        continue;
      }

      console.warn("FSDir: child is unknown type:", child);
    }
    return results;
  }

  public async delete(name: string) {
    try {
      await this.handle.removeEntry(name, { recursive: true });
    } catch (e) {
      return "error";
    }
    return null;
  }

  public async open(kind: "dir", name: string): Promise<FSDir | "not_found"> {
    const result = await pTry(this.handle.getDirectoryHandle(name), "not_found" as const);
    if (result === "not_found") {
      return result;
    }

    return new FSDir(result, this.path.concat(result.name));
  }

  public async ensure(kind: "dir", name: string): Promise<FSDir | "invalid">;
  public async ensure(kind: "file", name: string): Promise<FSFile | "invalid">;
  public async ensure(kind: "dir" | "file", name: string): Promise<FSDir | FSFile | "invalid"> {
    switch (kind) {
      case "dir": {
        const res = await pTry(this.handle.getDirectoryHandle(name, { create: true }), "invalid" as const);
        if (res === "invalid") {
          return res;
        }
        return new FSDir(res, this.path.concat(res.name));
      }
      case "file": {
        const res = await pTry(this.handle.getFileHandle(name, { create: true }), "invalid" as const);
        if (res === "invalid") {
          return res;
        }
        return new FSFile(res, this.path.concat(res.name));
      }
    }
  }
}

export class FSFile {
  constructor(
    public readonly handle: FileSystemFileHandle,
    public readonly path: readonly string[],
  ) {}
}
