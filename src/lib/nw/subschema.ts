import { exhaustive } from "../exhaustive";
import {
  NWMap,
  NWArray,
  NWBoolean,
  NWInLax,
  NWInUnion,
  NWNumber,
  NWOut,
  NWSchema,
  NWString,
  NWUnion,
} from "./nwschema";
import * as nw from "./nwschema";

// function create<T>(schema: SubSchema<T>, value: T) {
//   const result = schema.consume(value);
//   switch (result.status) {
//     case "failure":
//       throw result.error;
//     case "success":
//       break;
//     default:
//       exhaustive(result);
//   }
// }

////////////////////

/** narrows unkown type to Record<string, unknown> */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// https://stackoverflow.com/questions/53953814/typescript-check-if-a-type-is-a-union
type IsUnion<T, U extends T = T> = (T extends any ? (U extends T ? false : true) : never) extends false ? false : true;

export type SubConsumeResult<T> = { status: "success"; value: T } | { status: "failure"; error: Error };

//////// Schema ////////

export interface SubSchema<T> {
  peek(): T;
}

/** Describes a string */
class SubString implements SubSchema<string> {
  private val: string;
  private readonly schema: NWString;
  constructor(val: string, schema: NWString) {
    this.val = val;
    this.schema = schema;
  }

  peek(): string {
    return this.val;
  }

  replace(val: unknown) {
    const result = this.schema.consume(val);
    switch (result.status) {
      case "failure":
        throw result.error;
      case "success":
        this.val = result.value;
    }
  }

  set(val: string) {
    this.val = val;
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

  peek(): number {
    return this.val;
  }

  set(val: number) {
    this.val = val;
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

  peek(): boolean {
    return this.val;
  }

  set(val: boolean) {
    this.val = val;
  }
}

/** Describes null, undefined, void */
class SubNil implements SubSchema<null> {
  private val: null;
  private readonly schema: nw.NWNil;
  constructor(value: null, schema: nw.NWNil) {
    this.val = value;
    this.schema = schema;
  }

  peek(): null {
    return this.val;
  }

  set(val: null) {
    this.val = val;
  }
}

// TODO: consume null values, since they won't even show up.
/** Describes an object with known keys */
class SubObject<TSub extends Record<string, SubSchema<unknown>>>
  implements SubSchema<{ [Key in keyof TSub]: SubOut<TSub[Key]> }>
{
  schema: nw.NWObject<{ [Key in keyof TSub]: NWInLax<SubOutLax<TSub[Key]>> }>;
  readonly sub: TSub;

  constructor(sub: TSub, schema: nw.NWObject<{ [Key in keyof TSub]: NWInLax<SubOutLax<TSub[Key]>> }>) {
    this.schema = schema;
    this.sub = sub;
  }

  peek(): { [Key in keyof TSub]: SubOut<TSub[Key]> } {
    const record: any = {};
    for (let key in this.sub) {
      const value = this.sub[key].peek();
      record[key] = value as any;
    }
    return record;
  }

  at<K extends keyof TSub>(key: K): TSub[K] {
    return this.sub[key];
  }
}

// function union<Opts extends NWSchema<unknown>>(
//   sub: SubInUnion<NWOut<Opts>>,
//   schema: NWUnion<Opts>
// ): SubUnion<SubInUnion<NWOut<Opts>>> {
//   return new SubUnion<SubInUnion<NWOut<Opts>>>(sub, schema);
// }

/** Describes a union of several types; resolves to the first successful one */
class SubUnion<T extends SubSchema<any>> implements SubSchema<SubOut<T>> {
  // TODO: T should be Tout
  subValue: T;
  readonly schema: NWUnion<NWInUnion<SubOutLax<T>>>;
  constructor(subValue: T, schema: NWUnion<NWInUnion<SubOutLax<T>>>) {
    this.subValue = subValue;
    this.schema = schema;
  }
  peek(): SubOut<T> {
    return this.subValue.peek();
  }
}

class SubMap<T extends SubSchema<unknown>> implements SubSchema<Record<string, SubOut<T>>> {
  private readonly schema: nw.NWMap<NWInLax<SubOutLax<T>>>;
  private subs: Record<string, T>;
  constructor(subs: Record<string, T>, schema: nw.NWMap<NWInLax<SubOutLax<T>>>) {
    this.schema = schema;
    this.subs = subs;
  }
  peek(): Record<string, SubOut<T>> {
    const record: Record<string, SubOut<T>> = {};
    for (let key in this.subs) {
      const value = this.subs[key].peek();
      record[key] = value as any;
    }
    return record;
  }

  at(key: string): T | null {
    return this.subs[key] ?? null;
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

  peek(): SubOut<T>[] {
    const res = this.subs.map((sub) => sub.peek());
    return res as any;
  }

  at(key: number): T | null {
    return this.subs[key] ?? null;
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

// we extend on NWSchema because only the schema has all the options. The sub has just the current value.
// TODO
function union<Opts extends NWSchema<unknown>>(
  sub: SubInUnion<NWOut<Opts>>,
  schema: NWUnion<Opts>
): SubUnion<SubInUnion<NWOut<Opts>>> {
  // TODO
  return new SubUnion<SubInUnion<NWOut<Opts>>>(sub, schema as any);
}

// type O = NWNumber | NWString;
// type T = SubInUnion<NWOut<O>>;

// type E = SubSchema<SubOut<T>>;
// type Bar = NWInUnion<SubOutLax<T>>;

// const unionSchema = nw.union(nw.string(), nw.number());
// const unionTest = union(number(2, nw.number()), unionSchema);

// const udir = new SubUnion<SubNumber | SubString>(number(2, nw.number()), nw.union(nw.string(), nw.number()));

// type Foo = NWUnion<NWString | NWNumber>;
// type Bar = SubInUnion<NWOut<Foo>>;

// union(number(3), nwschema);

function object<T extends Record<string, SubSchema<unknown>>>(
  sub: T,
  // schema: NWInLax<SubOutLax<SubObject<T>>>
  schema: nw.NWObject<{ [Key in keyof T]: NWInLax<SubOutLax<T[Key]>> }>
): SubObject<T> {
  return new SubObject<T>(sub, schema);
}

// const obj = { foo: number(3, nw.number()) };
// type T = typeof obj;
// type Key = "foo";

// type Out2 = NWInLax<SubOutLax<SubObject<T>>>;
// type Out = nw.NWObject<{ [Key in keyof T]: NWInLax<SubOutLax<T[Key]>> }>;

// // SubObject<{foo:... etc}>

function map<T extends SubSchema<unknown>>(sub: Record<string, T>, schema: NWMap<NWInLax<SubOutLax<T>>>): SubMap<T> {
  return new SubMap<T>(sub, schema);
}

// const schemaTest = nw.union(nw.string(), nw.number());
// const unionTest = union(number(2, nw.number()), schemaTest);

// type is the same for each item, although value is different
// so "top level schema" is the same, even if underneath it changes
// map({foo: union(number(3), schema), bar: union(string('3'), schema)}, schema)

function array<T extends SubSchema<unknown>>(sub: T[], schema: NWArray<NWInLax<SubOutLax<T>>>): SubArray<T> {
  return new SubArray(sub, schema);
}

export { string, number, boolean, object, union, map, nil, array };

export { SubString, SubNumber, SubBoolean, SubObject, SubUnion, SubMap, SubNil, SubArray };

export type infer<T extends SubSchema<unknown>> = SubOut<T>;
