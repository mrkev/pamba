import { exhaustive } from "../exhaustive";
import { Subbable } from "../state/Subbable";
import {
  NWMap,
  NWArray,
  NWBoolean,
  NWIn,
  NWInLax,
  NWInUnion,
  NWNumber,
  NWOut,
  NWSchema,
  NWString,
  NWUnion,
} from "./nwschema";
import * as nw from "./nwschema";

function create<T>(schema: SubSchema<T>, value: T) {
  const result = schema.consume(value);
  switch (result.status) {
    case "failure":
      throw result.error;
    case "success":
      break;
    default:
      exhaustive(result);
  }
}

////////////////////

/** narrows unkown type to Record<string, unknown> */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// https://stackoverflow.com/questions/53953814/typescript-check-if-a-type-is-a-union
type IsUnion<T, U extends T = T> = (T extends any ? (U extends T ? false : true) : never) extends false ? false : true;

export type SubConsumeResult<T> = { status: "success"; value: T } | { status: "failure"; error: Error };

function success<T>(value: T): { status: "success"; value: T } {
  return { status: "success", value };
}

function failure(msg?: string): { status: "failure"; error: Error } {
  return { status: "failure", error: new Error(msg) };
}

//////// Schema ////////

export interface SubSchema<T> {
  consume(val: unknown): SubConsumeResult<T>;
}

/** Describes a string */
class SubString implements SubSchema<string> {
  private val: string;
  private readonly schema: NWString;
  constructor(val: string, schema: NWString) {
    this.val = val;
    this.schema = schema;
  }
  consume(val: unknown): SubConsumeResult<string> {
    if (typeof val === "string") {
      return success<string>(val);
    } else {
      return failure();
    }
  }
}

/** Describes a number */
class SubNumber implements SubSchema<number> {
  private val: number;
  private readonly schema: NWNumber;
  constructor(val: number, schema: NWNumber) {
    this.val = val;
    this.schema = schema;
  }

  consume(val: unknown): SubConsumeResult<number> {
    if (typeof val === "number") {
      return success<number>(val);
    } else {
      return failure();
    }
  }
}

/** Describes a boolean */
class SubBoolean implements SubSchema<boolean> {
  private val: boolean;
  private readonly schema: NWBoolean;
  constructor(val: boolean, schema: NWBoolean) {
    this.val = val;
    this.schema = schema;
  }

  consume(val: unknown): SubConsumeResult<boolean> {
    if (typeof val === "boolean") {
      return success<boolean>(val);
    } else {
      return failure();
    }
  }
}

/** Describes null, undefined, void */
class SubNil implements SubSchema<null> {
  private value: null;
  private readonly schema: nw.NWNil;
  constructor(value: null, schema: nw.NWNil) {
    this.value = value;
    this.schema = schema;
  }

  consume(val: unknown): SubConsumeResult<null> {
    if (val == null) {
      return success(null);
    } else {
      return failure();
    }
  }
}

// TODO: consume null values, since they won't even show up.
/** Describes an object with known keys */
class SubObject<TSchema extends Record<string, SubSchema<unknown>>>
  implements SubSchema<{ [Key in keyof TSchema]: SubOut<TSchema[Key]> }>
{
  private schema: TSchema;
  private readonly sub: { [Key in keyof TSchema]: SubOut<TSchema[Key]> };
  constructor(sub: { [Key in keyof TSchema]: SubOut<TSchema[Key]> }, schema: TSchema) {
    this.schema = schema;
    this.sub = sub;
  }

  consume(obj: unknown): SubConsumeResult<{ [Key in keyof TSchema]: SubOut<TSchema[Key]> }> {
    if (!isRecord(obj)) {
      return failure();
    }

    const consumedKeys = new Set<string>();
    // First, iterate all keys in the object. Will find unexpected keys.
    for (const key in obj) {
      const val = obj[key];
      const valSchema = this.schema[key];
      if (!valSchema) {
        return failure(`unexpected key ${key} found.`); // todo, maybe warn instead and continue? make an extensible object, and another that's exact?
      }

      const result = valSchema.consume(val);
      if (result.status === "failure") {
        return failure(result.error.message);
      }

      consumedKeys.add(key);
    }

    // Next, iterate all keys in the schema. Will find missing keys.
    for (const key in this.schema) {
      if (consumedKeys.has(key)) continue;
      const valSchema = this.schema[key];
      // consuming 'undefined' is exactly what we want here
      const result = valSchema.consume(obj[key]);
      if (result.status === "failure") {
        return failure(result.error.message);
      }
    }

    // We clone the object, cause we'll set default values and whatnot, and we don't want to edit the origianl
    // TODO: triple check consumption, since we have to cast
    return success({ ...obj } as any);
  }
}

/** Describes a union of several types; resolves to the first successful one */
class SubUnion<T extends SubSchema<any>> implements SubSchema<SubOut<T>> {
  // TODO: T should be Tout
  private subValue: T;
  private readonly schema: NWUnion<NWInUnion<SubOutLax<T>>>;
  constructor(subValue: T, schema: NWUnion<NWInUnion<SubOutLax<T>>>) {
    this.subValue = subValue;
    this.schema = schema;
  }
  consume(val: unknown): SubConsumeResult<SubOut<T>> {
    throw new Error("REMOVE");
  }
}

class SubMap<T extends SubSchema<unknown>> implements SubSchema<Record<string, SubOut<T>>> {
  private readonly schema: nw.NWMap<NWInLax<SubOutLax<T>>>;
  private subs: Record<string, T>;
  constructor(subs: Record<string, T>, schema: nw.NWMap<NWInLax<SubOutLax<T>>>) {
    this.schema = schema;
    this.subs = subs;
  }

  consume(obj: unknown): SubConsumeResult<Record<string, SubOut<T>>> {
    throw new Error("TODO");
    // if (!isRecord(obj)) {
    //   return failure();
    // }

    // for (const key in obj) {
    //   const val = obj[key];
    //   const result = this.valSchema.consume(val);
    //   if (result.status === "failure") {
    //     return failure(result.error.message);
    //   }
    // }

    // return success({ ...obj } as any);
  }
}

/** Describes an array */
class SubArray<T extends SubSchema<unknown>> implements SubSchema<SubOut<T>[]> {
  private subs: T[];
  private readonly schema: NWArray<NWInLax<SubOutLax<T>>>;
  constructor(subs: T[], schema: NWArray<NWInLax<SubOutLax<T>>>) {
    this.schema = schema;
    this.subs = subs;
  }

  consume(arr: unknown): SubConsumeResult<SubOut<T>[]> {
    if (!Array.isArray(arr)) {
      return failure();
    }

    for (const value of arr) {
      const result = this.schema.consume(value);
      if (result.status === "failure") {
        return failure(result.error.message);
      }
    }

    // we clone since we might want to modify the arrow with defaults
    return success([...arr]);
  }
}

export type SubOut<T extends SubSchema<unknown>> = T extends SubNumber
  ? number
  : T extends SubString
  ? string
  : T extends SubBoolean
  ? boolean
  : T extends SubObject<infer O>
  ? { [Key in keyof O]: SubOut<O[Key]> }
  : T extends SubUnion<infer U>
  ? SubOut<U>
  : T extends SubMap<infer V>
  ? { [key: string]: SubOut<V> }
  : T extends SubNil
  ? null
  : T extends SubArray<infer E>
  ? SubOut<E>[]
  : never;

export type SubOutLax<T extends SubSchema<unknown>> = T extends SubNumber
  ? number
  : T extends SubString
  ? string
  : T extends SubBoolean
  ? boolean
  : T extends SubObject<infer O>
  ? { [Key in keyof O]: SubOut<O[Key]> }
  : T extends SubUnion<infer U>
  ? SubOut<U>
  : T extends SubMap<infer V>
  ? { [key: string]: SubOut<V> }
  : T extends SubNil
  ? null
  : T extends SubArray<infer E>
  ? SubOut<E>[]
  : unknown;

// type Out2 = SubOut<SubSchema<number>>;

// type MakeArray<T> = T extends any ? T[] : T;

// type A = MakeArray<string | number>;

// Applies SubIn to each member of the union
type SubInUnion<T> = T extends any ? SubIn<T> : never;
// Converts a value type to a schema type
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
    : SubObject<{ [Key in keyof T]-?: SubIn<T[Key]> }>
  : T extends Array<infer E>
  ? SubArray<SubIn<E>>
  : never;

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
    : SubObject<{ [Key in keyof T]-?: SubIn<T[Key]> }>
  : T extends Array<infer E>
  ? SubArray<SubIn<E>>
  : unknown;

function string(val: string, schema: nw.NWString) {
  return new SubString(val, schema);
}

function number(val: number, schema: nw.NWNumber) {
  return new SubNumber(val, schema);
}

function boolean(val: boolean, schema: nw.NWBoolean) {
  return new SubBoolean(val, schema);
}

function nil(val: null, schema: nw.NWNil) {
  return new SubNil(val, schema);
}

// object({x: number(3), y: number(3)}, schema)

// TODO
function union<O extends NWSchema<unknown>>(
  sub: SubInUnion<NWOut<O>>,
  schema: NWUnion<O>
): SubUnion<SubInUnion<NWOut<O>>> {
  return new SubUnion<SubInUnion<NWOut<O>>>(sub, schema);
}

// type O = NWNumber | NWString;
// type T = SubInUnion<NWOut<O>>;

// type A = NWUnion<NWInUnion<SubOutLax<T>>>;

// type E = SubSchema<SubOut<T>>;
// type Bar = NWInUnion<SubOutLax<T>>;

// const schemaTest = nw.union(nw.string(), nw.number());
// const unionTest = union(number(2, nw.number()), schemaTest);

// type Foo = NWUnion<NWString | NWNumber>;
// type Bar = SubInUnion<NWOut<Foo>>;

// union(number(3), nwschema);

// TODO
function object<T extends Record<string, SubSchema<unknown>>>(
  sub: { [Key in keyof T]: SubOut<T[Key]> },
  schema: nw.NWObject<NWInLax<SubOutLax<T>>>
): SubObject<T> {
  return new SubObject<T>(sub, schema);
}

const obj = { foo: number(3, nw.number()), bar: number(3, nw.number()) };
type T = typeof obj;

type Out = SubInLax<T>;

const objectTest = object(
  { foo: number(3, nw.number()), bar: number(3, nw.number()) },
  nw.object({ foo: nw.number(), bar: nw.number() })
);

function map<T extends SubSchema<unknown>>(sub: Record<string, T>, schema: NWMap<NWInLax<SubOutLax<T>>>): SubMap<T> {
  return new SubMap<T>(sub, schema);
}

// const mapTest = map(
//   { foo: number(3, nw.number()), bar: number(3, nw.number()) },
//   nw.map({ "[key: string]": nw.number() })
// );

// const schemaTest = nw.union(nw.string(), nw.number());
// const unionTest = union(number(2, nw.number()), schemaTest);

// type is the same for each item, although value is different
// so "top level schema" is the same, even if underneath it changes
// map({foo: union(number(3), schema), bar: union(string('3'), schema)}, schema)

function array<T extends SubSchema<unknown>>(sub: T[], schema: NWArray<NWInLax<SubOutLax<T>>>): SubArray<T> {
  return new SubArray(sub, schema);
}

// same as map above, type is the same for all of these

// NWArray<NWNumber>
// array([number(3), number(2)], schema)

export { string, number, boolean, object, union, map, nil, array };

export { SubString, SubNumber, SubBoolean, SubObject, SubUnion, SubMap, SubNil, SubArray };

export type infer<T extends SubSchema<unknown>> = SubOut<T>;

const arrTest = array<SubNumber>([number(2, nw.number()), number(3, nw.number())], nw.array(nw.number()));
