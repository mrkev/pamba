import { pTry } from "../utils/ignorePromise";

export class FSDir {
  constructor(
    public readonly handle: FileSystemDirectoryHandle,
    public readonly path: readonly string[],
  ) {}

  get name() {
    return this.path[this.path.length - 1];
  }

  public async list() {
    const results = [];
    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639
    for await (const [_, child] of (this.handle as any).entries()) {
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
    } catch (_e) {
      return "error";
    }
    return null;
  }

  // todo: more descriptive errors
  public async openAny(name: string): Promise<FSDir | FSFile | "err"> {
    const resultDir = await pTry(this.handle.getDirectoryHandle(name), "err" as const);
    const resultFile = await pTry(this.handle.getFileHandle(name), "err" as const);

    if (resultDir instanceof FileSystemDirectoryHandle) {
      return new FSDir(resultDir, this.path.concat(resultDir.name));
    } else if (resultFile instanceof FileSystemFileHandle) {
      return new FSFile(resultFile, this.path.concat(resultFile.name));
    } else {
      return "err";
    }
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
        const res = await pTry(this.handle.getDirectoryHandle(name, { create: true }), (e) => {
          console.error(e);
          return "invalid" as const;
        });
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

  public async ensureThrow(kind: "dir", name: string): Promise<FSDir>;
  public async ensureThrow(kind: "file", name: string): Promise<FSFile>;
  public async ensureThrow(kind: "dir" | "file", name: string): Promise<FSDir | FSFile> {
    switch (kind) {
      case "dir": {
        const res = await this.handle.getDirectoryHandle(name, { create: true });
        return new FSDir(res, this.path.concat(res.name));
      }
      case "file": {
        const res = await this.handle.getFileHandle(name, { create: true });
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

  public async write(file: FileSystemWriteChunkType) {
    const writable = await this.handle.createWritable();
    await writable.write(file);
    await writable.close();
  }
}
