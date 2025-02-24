import { FSDir, FSFile } from "../fs/FSDir";
import { LinkedMap } from "../lib/state/LinkedMap";

/**
 * A location in the filesystem for storing a specific package kind.
 * It's also observable via LinkedState.
 */
export class PackageLibrary<P> {
  public readonly state = LinkedMap.create<string, P>();
  private constructor(
    private readonly dir: FSDir,
    private readonly existingPackage: (dir: FSDir) => Promise<P | "invalid" | "not_found">,
  ) {}

  static async init<P>(dir: FSDir, existingPackage: (dir: FSDir) => Promise<P | "invalid" | "not_found">) {
    const pkgLib = new PackageLibrary<P>(dir, existingPackage);
    await pkgLib._initState();
    return pkgLib;
  }

  public async getDir(): Promise<FSDir> {
    return await this.dir;
  }

  /** Make sure to call _initState() before usage! */
  async _initState() {
    const dirList = await (await this.dir).list();
    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639\
    const result = new Map();
    for await (const child of dirList) {
      if (child instanceof FSFile) {
        continue;
      }

      const pkg = await this.existingPackage(child);
      if (typeof pkg === "string") {
        console.warn("Package", child.handle.name, "returned error", result);
      } else {
        result.set(child.name, pkg);
      }
    }

    this.state._setRaw(result);
  }

  public async getAll(): Promise<P[]> {
    return [...this.state.values()];
  }

  // TODO: use state instead?
  async getPackage(id: string) {
    const pkg = await (await this.dir).open("dir", id);
    if (pkg === "not_found") {
      return "not_found";
    }
    return this.existingPackage(pkg);
  }

  async delete(id: string) {
    const result = await (await this.dir).delete(id);
    if (result === "error") {
      return result;
    }
    this.state.delete(id);
    return null;
  }
}
