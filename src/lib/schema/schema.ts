/** narrows unkown type to Record<string, unknown> */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// https://stackoverflow.com/questions/53953814/typescript-check-if-a-type-is-a-union
type IsUnion<T, U extends T = T> = (T extends any ? (U extends T ? false : true) : never) extends false ? false : true;

type NWConsumeResult<T> = { status: "success"; value: T } | { status: "failure"; error: Error };

function success<T>(value: T): { status: "success"; value: T } {
  return { status: "success", value };
}

function failure(msg?: string): { status: "failure"; error: Error } {
  return { status: "failure", error: new Error(msg) };
}

//////// Schema ////////

export interface NWSchema<T> {
  consume(val: unknown): NWConsumeResult<T>;
}

/** Describes a string */
class NWString implements NWSchema<string> {
  consume(val: unknown): NWConsumeResult<string> {
    if (typeof val === "string") {
      return success<string>(val);
    } else {
      return failure();
    }
  }
}

/** Describes a number */
class NWNumber implements NWSchema<number> {
  consume(val: unknown): NWConsumeResult<number> {
    if (typeof val === "number") {
      return success<number>(val);
    } else {
      return failure();
    }
  }
}

/** Describes a boolean */
class NWBoolean implements NWSchema<boolean> {
  consume(val: unknown): NWConsumeResult<boolean> {
    if (typeof val === "boolean") {
      return success<boolean>(val);
    } else {
      return failure();
    }
  }
}

// TODO: consume null values, since they won't even show up.
/** Describes an object with known keys */
class NWObject<TSchema extends Record<string, NWSchema<unknown>>>
  implements NWSchema<{ [Key in keyof TSchema]: NWOut<TSchema[Key]> }>
{
  schema: TSchema;
  constructor(schema: TSchema) {
    this.schema = schema;
  }

  consume(obj: unknown): NWConsumeResult<{ [Key in keyof TSchema]: NWOut<TSchema[Key]> }> {
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
class NWUnion<T extends NWSchema<any>> implements NWSchema<NWOut<T>> {
  // TODO: T should be Tout
  options: T[];
  constructor(options: T[]) {
    this.options = options;
  }
  consume(val: unknown): NWConsumeResult<NWOut<T>> {
    for (const schema of this.options) {
      const result = schema.consume(val);
      if (result.status === "success") {
        return result;
      }
    }

    return failure();
  }
}

class NWMap<T extends NWSchema<unknown>> implements NWSchema<Record<string, NWOut<T>>> {
  valSchema: T;
  constructor(valSchema: T) {
    this.valSchema = valSchema;
  }

  consume(obj: unknown): NWConsumeResult<Record<string, NWOut<T>>> {
    if (!isRecord(obj)) {
      return failure();
    }

    for (const key in obj) {
      const val = obj[key];
      const result = this.valSchema.consume(val);
      if (result.status === "failure") {
        return failure(result.error.message);
      }
    }

    return success({ ...obj } as any);
  }
}

/** Describes null, undefined, void */
class NWNil implements NWSchema<null> {
  consume(val: unknown): NWConsumeResult<null> {
    if (val == null) {
      return success(null);
    } else {
      return failure();
    }
  }
}

/** Describes an array */
class NWArray<T extends NWSchema<unknown>> implements NWSchema<NWOut<T>[]> {
  schema: T;
  constructor(schema: T) {
    this.schema = schema;
  }

  consume(arr: unknown): NWConsumeResult<NWOut<T>[]> {
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

type NWOut<T extends NWSchema<unknown>> = T extends NWNumber
  ? number
  : T extends NWString
  ? string
  : T extends NWBoolean
  ? boolean
  : T extends NWObject<infer O>
  ? { [Key in keyof O]: NWOut<O[Key]> }
  : T extends NWUnion<infer U>
  ? NWOut<U>
  : T extends NWMap<infer V>
  ? { [key: string]: NWOut<V> }
  : T extends NWNil
  ? null
  : T extends NWArray<infer E>
  ? NWOut<E>[]
  : never;

// Applies NWIn to each member of the union
type NWInUnion<T> = T extends any ? NWIn<T> : never;
// Converts a value type to a schema type
type NWIn<T extends unknown> = IsUnion<T> extends true
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
    : NWObject<{ [Key in keyof T]-?: NWIn<T[Key]> }>
  : T extends Array<infer E>
  ? NWArray<NWIn<E>>
  : never;

function string() {
  return new NWString();
}

function number() {
  return new NWNumber();
}

function boolean() {
  return new NWBoolean();
}

function object<T extends Record<string, NWSchema<unknown>>>(schema: T): NWObject<T> {
  return new NWObject<T>(schema);
}

function union<T extends Array<NWSchema<unknown>>>(...args: T): NWUnion<T[number]> {
  return new NWUnion<T[number]>(args);
}

function map<T extends NWSchema<unknown>>(map: { "[key: string]": T }): NWMap<T> {
  return new NWMap(map["[key: string]"]);
}

function nil() {
  return new NWNil();
}

function array<T extends NWSchema<unknown>>(schema: T): NWArray<T> {
  return new NWArray(schema);
}

export { string, number, boolean, object, union, map, nil, array };

export type infer<T extends NWSchema<unknown>> = NWOut<T>;

// const schema = union(string(), number());
