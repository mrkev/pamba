import { writeFileSync } from "fs";
import { resolve } from "path";
import { faustLoaderWasmImpl } from "./faustLoaderWasm";

const datorro = `
declare name "dattorro";
declare version "0.1";
declare author "Jakob Zerbian";
declare description "Dattorro demo application.";

import("stdfaust.lib");

process = dm.dattorro_rev_demo;
`;

const testPath = resolve(`${__dirname}/testtmp`);

main().catch(console.error);
async function main() {
  faustLoaderWasmImpl(
    (name: string, source: string | Uint8Array, contentType?: string) => {
      writeFileSync(resolve(testPath, name), source);
      console.log("//// emitFile", name, source.length, contentType);
      return "__VITE_ASSET__TEST";
    },
    "dattorro",
    datorro,
    {
      path: `${__dirname}/testtmp`,
      cleanup: async () => {
        console.log("cleanup called");
      },
    },
  );
}
