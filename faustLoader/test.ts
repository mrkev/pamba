import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { faustLoaderWasmImpl } from "./FaustLoader.js";

const datorro = `
declare name "dattorro";
declare version "0.1";
declare author "Jakob Zerbian";
declare description "Dattorro demo application.";

import("stdfaust.lib");

process = dm.dattorro_rev_demo;
`;

const TEST_DIR = resolve(`${__dirname}/testtmp`);

main().catch(console.error);
async function main() {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR);
  }

  faustLoaderWasmImpl(
    (name: string, source: string | Uint8Array, contentType?: string) => {
      writeFileSync(resolve(TEST_DIR, name), source);
      console.log("//// emitFile", name, source.length, contentType);
      return "__VITE_ASSET__TEST";
    },
    "dattorro",
    datorro,
  );
}
