import { NWArray, NWBoolean, NWNumber, NWSchema, NWString, NWUnion } from "./nwschema";
import { NWInLax, NWInUnion, NWOut } from "./nwschema.types";
import * as nw from "./nwschema";
import { SubOut, SubOutLax, SubInLaxUnion } from "./subschema.types";

//////// Schema ////////

type AllSubs =
  | SubString
  | SubNumber
  | SubBoolean
  | SubNil
  | SubUnion<any>
  | SubMap<any>
  | SubArray<any>
  | SubObject<any>;

export interface SubSchema<T> {
  peek(): T;
}

// function peek(sub: SubString): string;
// function peek(sub: SubNumber): number;
// function peek(sub: SubBoolean): boolean;
// function peek(sub: SubNil): null;
// function peek<T extends SubSchema<any>>(sub: SubUnion<T>): SubOut<SubUnion<T>>;
// function peek<T extends SubSchema<any>>(sub: SubMap<T>): string;
// function peek<T extends SubSchema<any>>(sub: SubArray<T>): string;
// function peek<T extends Record<string, SubSchema<unknown>>>(sub: SubObject<T>): string;
// function peek<T extends SubSchema<any>>(sub: AllSubs): T {
//   if (sub instanceof SubString) {
//     return sub.peek();
//   }
//   exhaustive(sub);
// }

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

// function union<Opts extends NWSchema<unknown>>(
//   sub: SubInUnion<NWOut<Opts>>,
//   schema: NWUnion<Opts>
// ): SubUnion<SubInUnion<NWOut<Opts>>> {
//   return new SubUnion<SubInUnion<NWOut<Opts>>>(sub, schema);
// }

/** Describes a union of several types; resolves to the first successful one */
class SubUnion<T extends SubSchema<any>> implements SubSchema<SubOut<T>> {
  subValue: T;
  readonly schema: NWUnion<NWInUnion<SubOutLax<T>>>;
  constructor(subValue: T, schema: NWUnion<NWInUnion<SubOutLax<T>>>) {
    this.subValue = subValue;
    this.schema = schema;
  }

  peek(): SubOut<T> {
    return this.subValue.peek();
  }

  set(val: SubOut<T>) {
    // Iterate through every option in schema
    // First one that can be concretized is it

    // if (this.subValue instanceof SubNumber) {
    //   if (typeof val !== "number") {
    //     throw new Error("invalid type");
    //   }
    //   this.subValue.set(val);
    // } else if (this.subValue instanceof SubString) {
    //   if (typeof val !== "string") {
    //     throw new Error("invalid type");
    //   }
    //   this.subValue.set(val);
    // } else if (this.subValue instanceof SubBoolean) {
    //   if (typeof val !== "boolean") {
    //     throw new Error("invalid type");
    //   }
    //   this.subValue.set(val);
    // } else if (this.subValue instanceof SubNil) {
    //   if (val !== null) {
    //     throw new Error("invalid type");
    //   }
    //   this.subValue.set(val);
    // } else if (this.subValue instanceof SubArray) {
    //   throw new Error("TODO");
    // } else if (this.subValue instanceof SubMap) {
    //   throw new Error("TODO");
    // } else if (this.subValue instanceof SubObject) {
    //   throw new Error("TODO");
    // } else if (this.subValue instanceof SubUnion) {
    //   throw new Error("TODO");
    // } else {
    //   throw new Error("Unknown SubSchema for union");
    // }

    // TODO: GOTTA REPLACE.
    if (typeof this.subValue.peek() === typeof val) {
      // this.subValue.set()
      // SET
    } else {
      // REPLACLE
    }
    throw new Error("NOT IMPLEMENTED");
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

class SubMap<T extends SubSchema<unknown>> implements SubSchema<Record<string, SubOut<T>>> {
  private readonly schema: nw.NWMap<NWInLax<SubOutLax<T>>>;
  protected subs: Record<string, T>;
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

  // set(val: Record<string, NWOut<NWInLax<SubOutLax<T>>>>) {
  //   const newSub = this.schema.concretize(val);
  //   this.subs = newSub.subs;
  // }

  at(key: string): T | null {
    return this.subs[key] ?? null;
  }
}

//////// Constructors  ////////

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

export type NWUnionOptsToSubOpts<Opts extends NWSchema<any>> = SubInLaxUnion<NWOut<Opts>>;

/* We extend on NWSchema because only the schema has all the
 * options. The sub has just the current value.
 */
function union<Opts extends NWSchema<any>>(
  sub: NWUnionOptsToSubOpts<Opts>,
  schema: NWUnion<Opts>
): SubUnion<NWUnionOptsToSubOpts<Opts>> {
  // TODO
  return new SubUnion<NWUnionOptsToSubOpts<Opts>>(sub, schema as any);
}

function object<T extends Record<string, SubSchema<unknown>>>(
  sub: T,
  // schema: NWInLax<SubOutLax<SubObject<T>>>
  schema: nw.NWObject<{ [Key in keyof T]: NWInLax<SubOutLax<T[Key]>> }>
): SubObject<T> {
  return new SubObject<T>(sub, schema);
}

function map<T extends SubSchema<unknown>>(sub: Record<string, T>, schema: nw.NWMap<NWInLax<SubOutLax<T>>>): SubMap<T> {
  return new SubMap<T>(sub, schema);
}

function array<T extends SubSchema<unknown>>(sub: T[], schema: NWArray<NWInLax<SubOutLax<T>>>): SubArray<T> {
  return new SubArray(sub, schema);
}

export { string, number, boolean, object, union, map, nil, array };
export { SubString, SubNumber, SubBoolean, SubObject, SubUnion, SubMap, SubNil, SubArray };
export type infer<T extends SubSchema<unknown>> = SubOut<T>;
