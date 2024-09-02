import { useEffect, useState, useCallback } from "react";
import { MutationHashable } from "./MutationHashable";
import { Subbable, notify, subscribe } from "./Subbable";

/* eslint-disable @typescript-eslint/no-unused-vars */

export type StateDispath<S> = (value: S | ((prevState: S) => S)) => void;
export type StateChangeHandler<S> = (value: S) => void;

interface LS<T> extends Subbable<T> {
  peek(): T;
  replace(v: T): void;
}

function get<T>(ls: LS<T>): T {
  return ls.peek();
}

function set<T>(ls: LS<T>, v: T): void {
  return ls.replace(v);
}

/**
 * LinkedState is a Subbable, a single atomic primitive
 */
export class LinkedState<S> implements LS<S> {
  private _value: Readonly<S>;
  _subscriptors: Set<StateChangeHandler<S>> = new Set();
  constructor(initialValue: S) {
    this._value = initialValue;
  }

  static of<T>(val: T) {
    return new this<T>(val);
  }

  set(value: Readonly<S>): void {
    // performance.mark("0");
    this._value = value;
    notify(this, this._value);
    // performance.mark("1");
    // performance.measure("a", "0", "1");
  }

  setDyn(cb: (prevState: S) => S) {
    const newVal = cb(this.get());
    this.set(newVal);
  }

  get(): Readonly<S> {
    return this._value;
  }

  peek(): Readonly<S> {
    return this.get();
  }

  replace(value: Readonly<S>): void {
    this.set(value);
  }
}

export function useLinkedState<S>(linkedState: LinkedState<S>): [S, StateDispath<S>] {
  const [state, setState] = useState<S>(() => linkedState.get());

  useEffect(() => {
    return subscribe(linkedState, () => {
      setState(() => linkedState.get());
    });
  }, [linkedState]);

  const apiState = linkedState.get();
  useEffect(() => {
    setState(() => apiState);
  }, [apiState]);

  const setter: StateDispath<S> = useCallback(
    (newVal) => {
      // newVal instanceof Function
      if (newVal instanceof Function) {
        linkedState.set(newVal(linkedState.get()));
      } else {
        linkedState.set(newVal);
      }
    },
    [linkedState]
  );

  return [state, setter];
}

/////////// NOT DONE OR USED ///////////////

// type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// LinkedMap X
// LinkedArray X
// LinkedSet X
// LinkedRecord (TODO)
// - Keys don't change
// - Listens to changes of keys
// - is this just automatically creating a map of string -> LinkedState?

type LSIn<T> =
  // primitives
  T extends number | string | boolean
    ? LinkedState<T>
    : // Records
    T extends Record<string, infer U>
    ? { [Key in keyof T]: SOut<U> }
    : never;

type SOut<T> = // primitives
  T extends LinkedState<infer P>
    ? P
    : // Records
    T extends SRecord<infer E>
    ? { [Key in keyof E]: SOut<E[Key]> }
    : never;

class SRecord<TSchema extends Record<string, LS<any>>>
  implements LS<{ [Key in keyof TSchema]: SOut<TSchema[Key]> }>, MutationHashable
{
  _subscriptors: Set<StateChangeHandler<{ [Key in keyof TSchema]: SOut<TSchema[Key]> }>> = new Set();
  _hash: number = 0;

  schema: TSchema;
  constructor(schema: TSchema) {
    this.schema = schema;
  }

  peek(): { [Key in keyof TSchema]: SOut<TSchema[Key]> } {
    const entries = Object.entries(this.schema).map(([key, value]) => {
      return [key, value.peek()];
    });
    return Object.fromEntries(entries);
  }

  child<K extends keyof TSchema>(key: K): TSchema[K] {
    // We add a check because this is usued dynamically in 'browse'
    if (!(key in this.schema)) {
      throw new Error(`${this.constructor.name}: no key ${String(key)} found. Keys: ${Object.keys(this.schema)}`);
    }
    return this.schema[key];
  }

  browse(browseCB: (b: BrowserTarget<SRecord<TSchema>>) => void) {
    const target = { __path: [] };
    const browser: any = new Proxy<{ __path: string[] }>(target, {
      get: (target, prop: string | symbol) => {
        if (typeof prop === "symbol") {
          throw new Error("TODO CANT SYMBOL");
        }
        target.__path.push(prop);
        return browser;
      },
    });

    browseCB(browser);

    let result = this;
    for (const key of target.__path) {
      result = result.child(key) as any;
    }

    return result;
  }

  replace(_v: { [Key in keyof TSchema]: SOut<TSchema[Key]> }) {
    throw new Error("not implemented");
  }
}

function primitive<T extends number | string | boolean>(val: T): LinkedState<T> {
  return new LinkedState(val);
}

function number(val: number) {
  return new LinkedState(val);
}

function record<TSchema extends Record<string, LS<any>>>(schema: TSchema): SRecord<TSchema> {
  return new SRecord<TSchema>(schema);
}

const a = record({
  zoo: record({
    animals: record({
      lions: number(3),
    }),
  }),
  park: record({
    animals: record({
      lions: number(3),
    }),
  }),
});

type BrowserTarget<T extends LS<any>> =
  // Records
  T extends SRecord<infer E>
    ? { [Key in keyof E]: BrowserTarget<E[Key]> }
    : // Primitives
    T extends LinkedState<any>
    ? void
    : never;

a.browse((a) => a.park.animals.lions);
(window as any).a = a;

// a.child("here");
// a.browse((foo) => foo.here.there);

/////////////

// const zoo = record({
//   animals: record({
//     penguins: number(3),
//     tigers: number(2),
//   }),
//   ticketSales: number(2),
// });

// zoo.push();

// function Foo() {
//   const [value] = observe(zoo.animals.penguins);
// }
