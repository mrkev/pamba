import { useEffect, useState } from "react";
import { LinkedState } from "./LinkedState";

type StateChangeHandler<S> = (value: S) => void;

type FnSrc<F> = F extends (s: infer S) => any ? S : never;
type FnDst<F> = F extends (s: any) => infer T ? T : never;

export class DerivedState<F extends Function> {
  private dependency: LinkedState<FnSrc<F>>;
  private transform: F;
  private handlers: Set<StateChangeHandler<FnDst<F>>> = new Set();

  constructor(dep: LinkedState<FnSrc<F>>, transform: F) {
    this.dependency = dep;
    this.transform = transform;
    this.dependency.addStateChangeHandler((newState: FnSrc<F>) => {
      this.handlers.forEach((cb: StateChangeHandler<FnDst<F>>) => {
        cb(this.transform(newState));
      });
    });
  }

  get(): FnDst<F> {
    return this.transform(this.dependency.get());
  }
  // Executes these handlers on change
  addStateChangeHandler(cb: StateChangeHandler<FnDst<F>>): () => void {
    this.handlers.add(cb);
    return () => {
      this.handlers.delete(cb);
    };
  }

  static from<F extends Function>(
    state: LinkedState<FnSrc<F>>,
    callback: F
  ): DerivedState<F> {
    return new DerivedState(state, callback);
  }
}

export function useDerivedState<F extends Function>(
  derivedState: DerivedState<F>
): FnDst<F> {
  const [state, setState] = useState<FnDst<F>>(() => derivedState.get());

  useEffect(() => {
    return derivedState.addStateChangeHandler((newVal) => {
      console.log("new val", newVal);
      setState(() => newVal);
    });
  }, [derivedState]);

  return state;
}
