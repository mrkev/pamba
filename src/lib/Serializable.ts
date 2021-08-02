export class Serializable {
  static serializePrimitive(val: unknown): string | null {
    switch (typeof val) {
      case "string":
        return JSON.stringify(val);
      case "boolean":
      case "number":
        return `${val}`;
    }

    if (val == null) {
      return "null";
    }

    if (Array.isArray(val)) {
      const serialized = val.map(Serializable.serializePrimitive);
      return `[${serialized.join(",")}]`;
    }

    if (
      val instanceof Object &&
      (val as any).__proto__.constructor === Object
    ) {
      const entries = Object.entries(val)
        .map(([okey, oval]) => {
          const serialized = Serializable.serializePrimitive(oval);
          if (serialized === null) {
            return null;
          }
          return `"${okey}": ${serialized}`;
        })
        .filter(Boolean);

      return `{${entries.join(",")}}`;
    }

    if (val instanceof Serializable) {
      return val.__serialize();
    }

    if (
      val instanceof Object &&
      typeof (val as any).__serialize === "function"
    ) {
      return (val as any).__serialize();
    }

    return null;
  }

  __serialize<T>(): Serialized<T> {
    const acc: Record<string, unknown> = {};
    for (let key in this) {
      // skip loop if the property is from prototype
      if (!this.hasOwnProperty(key)) continue;

      acc[key] = this[key];
      acc.__c = this.constructor.name;
    }

    return Serializable.serializePrimitive(acc) || "";
  }
}

// function deserialize<T extends Serializable>(str: Serialized<T>): T {}
type SerializableArray<T> = Record<string, SerializableT<T>>;
type SerializableRecord<T> = Array<SerializableT<T>>;

export type SerializableT<T> = T extends Array<infer U>
  ? SerializableArray<U>
  : T extends Record<string, infer S>
  ? SerializableRecord<S>
  : number | boolean | string | Serializable;

// export type SerializableT =
//   | Serializable
//   | Array<SerializableT>
//   | number
//   | boolean
//   | string
//   | Record<string, SerializableT>;

export type Serialized<T> = string;

// class Foo {}
// const foo: Serialized<Foo> = "";

// console.log(foo);
