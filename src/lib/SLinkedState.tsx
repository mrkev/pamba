import { Serializable, Serialized } from "./Serializable";
import { SPrimitive } from "./state/LinkedState";
// import { Serializable, JsonProperty } from "typescript-json-serializer";
// import { deserialize, serialize } from "typescript-json-serializer";

export class SLinkedState<S extends any> extends SPrimitive<S> implements Serializable {
  __serialize(): Serialized<SLinkedState<S>> {
    const x = new Serializable();
    const res = x.__serialize.call(this);
    return res;
  }

  static __parse<T>(s: Serialized<SLinkedState<T>>): SLinkedState<T> {
    const json = JSON.parse(s);
    if (json.__c !== this.name) {
      throw new Error("wrong serialized type");
    }
    return new this(json.val);
  }

  static override of<T>(val: T) {
    return new this<T>(val);
  }
}

// @Serializable()
// class Foo {
//   @JsonProperty() bar: number;
//   baz: string;
//   constructor(bar: number) {
//     this.bar = bar;
//     this.baz = bar + "asdf";
//   }
// }

// (window as any).foo = new Foo(2);
// (window as any).deserialize = deserialize;
// (window as any).serialize = serialize;
// debugger;
