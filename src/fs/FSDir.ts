import { exhaustive } from "../utils/exhaustive";
import { pTry } from "../utils/ignorePromise";

/** represents a directory in an OPFS directory structure */
export class FSDir {
  constructor(
    public readonly handle: FileSystemDirectoryHandle,
    public readonly path: readonly string[],
  ) {}

  get name() {
    const pathEnd = this.path[this.path.length - 1];
    // TODO: remove this assertion, but here just so I don't forget this is what this is suppossed to be
    if (pathEnd !== this.handle.name) {
      throw new Error("mismatching names");
    }
    return pathEnd;
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

  public async openAny(name: string): Promise<FSDir | FSFile | "not_found"> {
    const resultDir = await pTry(this.handle.getDirectoryHandle(name), "err" as const);
    const resultFile = await pTry(this.handle.getFileHandle(name), "err" as const);

    if (resultDir instanceof FileSystemDirectoryHandle) {
      return new FSDir(resultDir, this.path.concat(resultDir.name));
    } else if (resultFile instanceof FileSystemFileHandle) {
      return new FSFile(resultFile, this.path.concat(resultFile.name));
    } else {
      return "not_found";
    }
  }

  public async open(kind: "dir", name: string): Promise<FSDir | "not_found">;
  public async open(kind: "file", name: string): Promise<FSFile | "not_found">;
  public async open(kind: "dir" | "file", name: string): Promise<FSDir | FSFile | "not_found"> {
    const result = await (
      kind === "dir"
        ? this.handle.getDirectoryHandle(name).then((handle) => new FSDir(handle, this.path.concat(handle.name)))
        : this.handle.getFileHandle(name).then((handle) => new FSFile(handle, this.path.concat(handle.name)))
    ).catch(() => "not_found" as const);

    return result;
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

  public async hasChild(name: string) {
    const child = await this.openAny(name);
    return child !== "not_found";
  }

  public async isChild(check: FSDir | FSFile) {
    const child = await this.openAny(check.handle.name);
    if (child === "not_found") {
      return false;
    }
    return await child.handle.isSameEntry(check.handle);
  }

  ////////////// throw

  public async deleteThrow(name: string) {
    await this.handle.removeEntry(name, { recursive: true });
  }

  public async openAnyThrow(name: string): Promise<FSDir | FSFile> {
    const resultDir = await pTry(this.handle.getDirectoryHandle(name), "err" as const);
    const resultFile = await pTry(this.handle.getFileHandle(name), "err" as const);

    if (resultDir instanceof FileSystemDirectoryHandle) {
      return new FSDir(resultDir, this.path.concat(resultDir.name));
    } else if (resultFile instanceof FileSystemFileHandle) {
      return new FSFile(resultFile, this.path.concat(resultFile.name));
    } else {
      throw new Error("Not found");
    }
  }

  public async openThrow(kind: "dir", name: string): Promise<FSDir>;
  public async openThrow(kind: "file", name: string): Promise<FSFile>;
  public async openThrow(kind: "dir" | "file", name: string): Promise<FSDir | FSFile> {
    const result = await (kind === "dir"
      ? this.handle.getDirectoryHandle(name).then((handle) => new FSDir(handle, this.path.concat(handle.name)))
      : this.handle.getFileHandle(name).then((handle) => new FSFile(handle, this.path.concat(handle.name))));
    return result;
  }

  public async ensureThrow(kind: "dir", name: string): Promise<FSDir>;
  public async ensureThrow(kind: "file", name: string): Promise<FSFile>;
  public async ensureThrow(kind: "dir" | "file", name: string): Promise<FSDir | FSFile> {
    const result = await (kind === "dir"
      ? this.handle
          .getDirectoryHandle(name, { create: true })
          .then((handle) => new FSDir(handle, this.path.concat(handle.name)))
      : this.handle
          .getFileHandle(name, { create: true })
          .then((handle) => new FSFile(handle, this.path.concat(handle.name))));
    return result;
  }

  // TODO: could also just use ids, and name is metadata
  public async renameThrow(from: string | FSDir | FSFile, to: string) {
    const src = typeof from === "string" ? await this.openAnyThrow(from) : from;
    if (!this.isChild(src)) {
      throw new Error(`${src.name} is not a child of ${this.path.join("/")}`);
    }

    const dest = await this.openAny(to);
    if (dest !== "not_found") {
      throw new Error(`destination ${to} is not empty`);
    }

    if (src instanceof FSDir) {
      // todo: rename
    } else if (src instanceof FSFile) {
      const data = await src.read();
      const newFile = await this.ensureThrow("file", to);
      await newFile.write(data);
    } else {
      exhaustive(src);
    }
  }
}

/** represents a file in an OPFS directory structure */
export class FSFile {
  constructor(
    public readonly handle: FileSystemFileHandle,
    public readonly path: readonly string[],
  ) {}

  get name() {
    const pathEnd = this.path[this.path.length - 1];
    // TODO: remove this assertion, but here just so I don't forget this is what this is suppossed to be
    if (pathEnd !== this.handle.name) {
      throw new Error("mismatching names");
    }
    return pathEnd;
  }

  public async write(file: FileSystemWriteChunkType) {
    const writable = await this.handle.createWritable();
    await writable.write(file);
    await writable.close();
  }

  public async read() {
    return this.handle.getFile();
  }
}
