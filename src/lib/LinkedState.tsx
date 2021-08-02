import { useEffect, useState, useCallback } from "react";
import { Serializable, SerializableT, Serialized } from "./Serializable";
// import { Serializable, JsonProperty } from "typescript-json-serializer";
import { deserialize, serialize } from "typescript-json-serializer";

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

type StateDispath<S> = (value: S | ((prevState: S) => S)) => void;
type StateChangeHandler<S> = (value: S) => void;

// @Serializable()
export class LinkedState<S> {
  protected val: S;
  private handlers: Set<StateChangeHandler<S>> = new Set();
  constructor(initialValue: S) {
    this.val = initialValue;
  }

  static of<T>(val: T) {
    return new this<T>(val);
  }

  set(val: S): void {
    this.val = val;
    this.handlers.forEach((cb) => {
      cb(val);
    });
  }
  get(): S {
    return this.val;
  }

  // Executes these handlers on change
  addStateChangeHandler(cb: StateChangeHandler<S>): () => void {
    this.handlers.add(cb);
    return () => {
      this.handlers.delete(cb);
    };
  }
}

export class SLinkedState<S extends any>
  extends LinkedState<S>
  implements Serializable
{
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

  static of<T>(val: T) {
    return new this<T>(val);
  }
}

(window as any).SLinkedState = SLinkedState;

export function useLinkedState<S>(
  linkedState: LinkedState<S>
): [S, StateDispath<S>] {
  const [state, setState] = useState<S>(() => linkedState.get());

  useEffect(() => {
    return linkedState.addStateChangeHandler((newVal) =>
      setState(() => newVal)
    );
  }, [linkedState]);

  const apiState = linkedState.get();
  useEffect(
    function () {
      // console.log("API => React", apiState);
      setState(() => apiState);
    },
    [apiState]
  );

  const setter = useCallback(
    function (newVal) {
      // newVal instanceof Function
      if (newVal instanceof Function) {
        console.log("HELLO WORLD");
        linkedState.set(newVal(linkedState.get()));
      } else {
        linkedState.set(newVal);
      }
    },
    [linkedState]
  );

  return [state, setter];
}
