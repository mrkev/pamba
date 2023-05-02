import { IsUnion } from "./utils";
import {
  SubSchema,
  SubNumber,
  SubString,
  SubBoolean,
  SubObject,
  SubUnion,
  SubMap,
  SubNil,
  SubArray,
} from "./subschema";

// SubArray<SubNumber> -> number[] (default never)
export type SubOut<T extends SubSchema<unknown>> = T extends SubNumber
  ? number
  : T extends SubString
  ? string
  : T extends SubBoolean
  ? boolean
  : T extends SubObject<infer O>
  ? {
      [Key in keyof O]: SubOut<O[Key]>;
    }
  : T extends SubUnion<infer U>
  ? SubOut<U>
  : T extends SubMap<infer V>
  ? { [key: string]: SubOut<V> }
  : T extends SubNil
  ? null
  : T extends SubArray<infer E>
  ? SubOut<E>[]
  : never;

// SubArray<SubNumber> -> number[] (default unknown)
export type SubOutLax<T extends SubSchema<unknown>> = T extends SubNumber
  ? number
  : T extends SubString
  ? string
  : T extends SubBoolean
  ? boolean
  : T extends SubObject<infer O>
  ? {
      [Key in keyof O]: SubOut<O[Key]>;
    }
  : T extends SubUnion<infer U>
  ? SubOut<U>
  : T extends SubMap<infer V>
  ? { [key: string]: SubOut<V> }
  : T extends SubNil
  ? null
  : T extends SubArray<infer E>
  ? SubOut<E>[]
  : unknown;

/////////////////////// SubIn ///////////////////////

// Applies SubIn to each member of the union
export type SubInUnion<T> = T extends any ? SubIn<T> : never;
export type SubInLaxUnion<T> = T extends any ? SubInLax<T> : never;

// Converts a value type to a schema type
// number[] -> SubArray<SubNumber> (default never)
export type SubIn<T extends unknown> = IsUnion<T> extends true
  ? SubUnion<SubInUnion<T>>
  : T extends null
  ? SubNil
  : T extends undefined
  ? SubNil
  : T extends void
  ? SubNil
  : T extends number
  ? SubNumber
  : T extends string
  ? SubString
  : T extends boolean
  ? SubBoolean
  : T extends Record<string, infer C>
  ? string extends keyof T
    ? SubMap<SubIn<C>>
    : SubObject<{
        [Key in keyof T]-?: SubIn<T[Key]>;
      }>
  : T extends Array<infer E>
  ? SubArray<SubIn<E>>
  : never;

// number[] -> SubArray<SubNumber> (default unknown)
export type SubInLax<T extends unknown> = IsUnion<T> extends true
  ? SubUnion<SubInUnion<T>>
  : T extends null
  ? SubNil
  : T extends undefined
  ? SubNil
  : T extends void
  ? SubNil
  : T extends number
  ? SubNumber
  : T extends string
  ? SubString
  : T extends boolean
  ? SubBoolean
  : T extends Record<string, infer C>
  ? string extends keyof T
    ? SubMap<SubIn<C>>
    : SubObject<{
        [Key in keyof T]-?: SubIn<T[Key]>;
      }>
  : T extends Array<infer E>
  ? SubArray<SubIn<E>>
  : unknown;
