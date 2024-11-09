import { Dispatch, SetStateAction } from "react";

export type SetState<S> = Dispatch<SetStateAction<S>>;

export function mutable<T>(v: readonly T[]): T[] {
  return v as any;
}

export type EmptyObj = Record<string, never>;
