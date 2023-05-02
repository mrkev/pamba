import { IsUnion } from "./utils";
import { NWSchema, NWNumber, NWString, NWBoolean, NWObject, NWUnion, NWMap, NWNil, NWArray } from "./nwschema";

export type NWConsumeResult<T> = { status: "success"; value: T } | { status: "failure"; error: Error };

export type NWOut<T extends NWSchema<unknown>> = T extends NWNumber
  ? number
  : T extends NWString
  ? string
  : T extends NWBoolean
  ? boolean
  : T extends NWObject<infer O>
  ? {
      [Key in keyof O]: NWOut<O[Key]>;
    }
  : T extends NWUnion<infer U>
  ? NWOut<U>
  : T extends NWMap<infer V>
  ? { [key: string]: NWOut<V> }
  : T extends NWNil
  ? null
  : T extends NWArray<infer E>
  ? NWOut<E>[]
  : never;

export type NWInUnion<T> = T extends any ? NWIn<T> : never;
export type NWInLaxUnion<T> = T extends any ? NWIn<T> : unknown;

// Converts a value type to a schema type
export type NWIn<T extends unknown> = IsUnion<T> extends true
  ? NWUnion<NWInUnion<T>>
  : T extends null
  ? NWNil
  : T extends undefined
  ? NWNil
  : T extends void
  ? NWNil
  : T extends number
  ? NWNumber
  : T extends string
  ? NWString
  : T extends boolean
  ? NWBoolean
  : T extends Record<string, infer C>
  ? string extends keyof T
    ? NWMap<NWIn<C>>
    : NWObject<{
        [Key in keyof T]-?: NWIn<T[Key]>;
      }>
  : T extends Array<infer E>
  ? NWArray<NWIn<E>>
  : never;

export type NWInLax<T extends unknown> = IsUnion<T> extends true
  ? NWUnion<NWInUnion<T>>
  : T extends null
  ? NWNil
  : T extends undefined
  ? NWNil
  : T extends void
  ? NWNil
  : T extends number
  ? NWNumber
  : T extends string
  ? NWString
  : T extends boolean
  ? NWBoolean
  : T extends Record<string, infer C>
  ? string extends keyof T
    ? NWMap<NWIn<C>>
    : NWObject<{
        [Key in keyof T]-?: NWIn<T[Key]>;
      }>
  : T extends Array<infer E>
  ? NWArray<NWIn<E>>
  : NWSchema<unknown>;
