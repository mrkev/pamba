/** narrows unkown type to Record<string, unknown> */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// resolves to true if type is a union type, false otherwise
// https://stackoverflow.com/questions/53953814/typescript-check-if-a-type-is-a-union
export type IsUnion<T, U extends T = T> = (T extends any ? (U extends T ? false : true) : never) extends false
  ? false
  : true;
