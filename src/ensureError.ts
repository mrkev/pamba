export function ensureError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  } else if (typeof e === "string") {
    return new Error(e);
  } else {
    return new Error(String(e), { cause: e });
  }
}
