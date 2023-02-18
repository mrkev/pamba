import { useEffect, useState } from "react";
import { SPrimitive } from "./LinkedState";
import { subscribe } from "./Subbable";

type StateChangeHandler<S> = (value: S) => void;

// type FnSrc<F> = F extends (s: infer S) => any ? S : never;
type FnSrcTuple<F> = F extends (...s: infer S) => any ? S : never;
type FnDst<F> = F extends (...s: any[]) => infer T ? T : never;

type TupleOfLinkedStates<Tuple extends [...any[]]> = {
  [Index in keyof Tuple]: SPrimitive<Tuple[Index]>;
} & { length: Tuple["length"] };

export class DerivedState<F extends Function> {
  private dependencies: TupleOfLinkedStates<FnSrcTuple<F>>;
  private transform: F;
  private handlers: Set<StateChangeHandler<FnDst<F>>> = new Set();

  constructor(dep: TupleOfLinkedStates<FnSrcTuple<F>>, transform: F) {
    this.dependencies = dep;
    this.transform = transform;
    for (let i = 0; i < this.dependencies.length; i++) {
      const dependency = this.dependencies[i];
      subscribe(dependency, (_newState) => {
        // TODO: coalece. If multiple deps change, call my handlers only once
        // like setState.
        this.handlers.forEach((cb: StateChangeHandler<FnDst<F>>) => {
          cb(this.transform(...this.getSourceValues()));
        });
      });
    }
  }

  private getSourceValues(): FnSrcTuple<F> {
    const args = Array.prototype.map.call(this.dependencies, (x) => x.get());
    return args as any;
  }

  get(): FnDst<F> {
    const args = this.getSourceValues();
    return this.transform(...args);
  }
  // Executes these handlers on change
  addStateChangeHandler(cb: StateChangeHandler<FnDst<F>>): () => void {
    this.handlers.add(cb);
    return () => {
      this.handlers.delete(cb);
    };
  }

  static from<F extends Function>(states: TupleOfLinkedStates<FnSrcTuple<F>>, callback: F): DerivedState<F> {
    return new DerivedState(states, callback);
  }
}

export function useDerivedState<F extends Function>(derivedState: DerivedState<F>): FnDst<F> {
  const [state, setState] = useState<FnDst<F>>(() => derivedState.get());

  useEffect(() => {
    return derivedState.addStateChangeHandler((newVal) => {
      setState(() => newVal);
    });
  }, [derivedState]);

  return state;
}

// class Foo<T> {
//   t: T;
//   constructor(t: T) {
//     this.t = t;
//   }
//   get(): T {
//     return this.t;
//   }
// }

// type MakeFoo<T> = (v: T) => Foo<T>;
// function makeFoo<T>(t: T) {
//   return new Foo(t);
// }

// function foo<F>(...bar: FnSrcArr<F>): FooTuple<FnSrcArr<F>> {
//   return bar.map((x) => new Foo(x)) as any;
// }

// const v = foo<(i: number, x: string) => void>(4, "3");

// function callback(i: number, x: string) {}

// // const vals =

// // const a = [3, "3"].map((x) => new Foo(x));

// type FooTuple<Tuple extends [...any[]]> = {
//   [Index in keyof Tuple]: Foo<Tuple[Index]>;
// } & { length: Tuple["length"] };
