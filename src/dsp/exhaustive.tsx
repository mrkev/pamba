export function exhaustive(x: never): never {
  throw new Error("exhaustive violation");
}
