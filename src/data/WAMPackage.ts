// TODO

import { WamDescriptor } from "@webaudiomodules/api";
import { isRecord } from "../lib/nw/nwschema";
import { pAll, pTry } from "../utils/ignorePromise";
import { FSDir } from "./FSDir";

/**
 * <wam_package>
 * - index.js
 * - metadata (includes kind, my metadata)
 * - descriptor (wam descriptor, their metadata)
 */

export type WAMKind = "-m" | "-a" | "m-a" | "a-a";

// TODO: how to update
class WAMPackage {
  static readonly INDEX_FILE_NAME = "index.js";
  static readonly METADATA_FILE_NAME = "metadata";
  static readonly DESCRIPTOR_FILE_NAME = "descriptor";

  constructor(
    private readonly pkgDir: FSDir,
    private readonly index: File,
    private readonly metadata: { kind: WAMKind; url: string }, // todo
    private readonly descriptor: WamDescriptor,
  ) {}

  static async existingPackage(pkgDir: FSDir) {
    // dont need metadata atm but open for good measure?
    const [indexHandle, metadataHandle, descriptorHandle] = await pAll(
      pTry(pkgDir.handle.getFileHandle(WAMPackage.INDEX_FILE_NAME), "error" as const),
      pTry(pkgDir.handle.getFileHandle(WAMPackage.METADATA_FILE_NAME), "error" as const),
      pTry(pkgDir.handle.getFileHandle(WAMPackage.DESCRIPTOR_FILE_NAME), "error" as const),
    );

    if (indexHandle === "error" || metadataHandle === "error" || descriptorHandle === "error") {
      throw new Error("ERROR: " + pkgDir.path);
    }

    const [file, metadataFile, descriptorFile] = await pAll(
      indexHandle.getFile(),
      metadataHandle.getFile(),
      descriptorHandle.getFile(),
    );

    // TODO: verify type
    const metadata = JSON.parse(await metadataFile.text());
    if (!isRecord(metadata)) {
      throw new Error("metadata is not a record!");
    }
    // TODO: verify type
    const descriptor = JSON.parse(await descriptorFile.text());
    if (!isRecord(descriptor)) {
      throw new Error("descriptor is not a record!");
    }

    return new WAMPackage(pkgDir, file, metadata as any, descriptor as any);
  }
}
