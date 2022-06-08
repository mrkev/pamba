/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useEffect, useState } from "react";
import { StateChangeHandler, StateDispath } from "./LinkedState";
import { Subbable, notify, subscribe } from "./Subbable";

// .sort, .reverse, .fill, .copyWithin operate in place and return the array. SubbableArray
// is not quite an array so the return types don't match.
// .map has the third argument of its callback function be a readonly array, instead of just an array
// .reduce, .reduceRight I just don't feel like implementing
export type ArrayWithoutIndexer<T> = Omit<
  Array<T>,
  number | "sort" | "reverse" | "fill" | "copyWithin" | "reduce" | "reduceRight" | "map"
>;

export class LinkedArray<S> implements ArrayWithoutIndexer<S>, Subbable<ReadonlyArray<S>> {
  private _array: ReadonlyArray<S>;
  private constructor(initialValue: ReadonlyArray<S>) {
    this._array = initialValue;
  }

  _getRaw(): ReadonlyArray<S> {
    return this._array;
  }

  _setRaw(array: ReadonlyArray<S>) {
    this._array = array;
    notify(this, this._array);
  }

  _subscriptors: Set<StateChangeHandler<ReadonlyArray<S>>> = new Set();
  public static create<T>(initialValue?: ReadonlyArray<T>) {
    return new this(initialValue ?? []);
  }

  private mutate<V>(mutator: (clone: Array<S>) => V): V {
    console.log("mutateeeee");
    const clone = [...this._array];
    const result = mutator(clone);
    this._array = clone;
    notify(this, this._array);
    return result;
  }

  // Array<S> interface
  get length(): number {
    return this._array.length;
  }

  // GETTER. Things with getters get tricky.
  // THis makes this a cointainer, and makes us wonder if this should be
  // a LinkedState too insteaed.
  at(index: number): S | undefined {
    throw new Error("Method not implemented.");
  }

  [Symbol.iterator](): IterableIterator<S> {
    return this._array[Symbol.iterator]();
  }

  // Array<S> interface
  toString(): string {
    return `${this.constructor.name}[${this._array.toString()}]`;
  }

  // Array<S> interface
  toLocaleString(): string {
    throw this._array.toLocaleString();
  }

  // Array<S> interface, mutates
  pop(): S | undefined {
    if (this.length < 1) {
      return;
    }

    return this.mutate((clone) => {
      return clone.pop();
    });
  }

  // Array<S> interface, mutates
  shift(): S | undefined {
    if (this.length < 1) {
      return;
    }

    return this.mutate((clone) => {
      return clone.shift();
    });
  }

  // Array<S> interface, mutates
  push(...items: S[]): number {
    if (items.length < 1) {
      return this.length;
    }

    return this.mutate((clone) => {
      return clone.push(...items);
    });
  }

  // Array<S> interface, mutates
  unshift(...items: S[]): number {
    if (items.length < 1) {
      return this.length;
    }

    return this.mutate((clone) => {
      return clone.unshift(...items);
    });
  }

  // Array<S> interface, mutates
  sort(compareFn?: (a: S, b: S) => number): this {
    return this.mutate((clone) => {
      clone.sort(compareFn);
      return this;
    });
  }

  // Array<S> interface, mutates
  reverse(): this {
    return this.mutate((clone) => {
      clone.reverse();
      return this;
    });
  }

  // Array<S> interface, mutates
  splice(start: number, deleteCount?: number): S[];
  splice(start: number, deleteCount: number, ...items: S[]): S[];
  splice(start: any, deleteCount?: any, ...items: any[]): S[] {
    return this.mutate((clone) => {
      return clone.splice(start, deleteCount, ...items);
    });
  }

  // Array<S> interface, mutates
  fill(value: S, start?: number, end?: number): this {
    return this.mutate((clone) => {
      clone.fill(value, start, end);
      return this;
    });
  }

  // Array<S> interface, mutates
  copyWithin(target: number, start: number, end?: number): this {
    return this.mutate((clone) => {
      clone.copyWithin(target, start, end);
      return this;
    });
  }

  // TODO: should this mutate and return itself? return a new LinkedArray? just return an array? probably the latter right?
  // Array<S> interface
  map<U>(callbackfn: (value: S, index: number, array: readonly S[]) => U, thisArg?: any): U[] {
    return this._array.map(callbackfn, thisArg);
  }

  // Array<S> interface
  indexOf(searchElement: S, fromIndex?: number): number {
    return this._array.indexOf(searchElement, fromIndex);
  }

  // not in standard arrays
  public remove(searchElement: S): S | null {
    const index = this.indexOf(searchElement);
    if (index === -1) {
      return null;
    }
    return this.splice(index, 1)[0];
  }

  [Symbol.unscopables](): {
    copyWithin: boolean;
    entries: boolean;
    fill: boolean;
    find: boolean;
    findIndex: boolean;
    keys: boolean;
    values: boolean;
  } {
    return this._array[Symbol.unscopables as any] as any;
  }

  /////////////////////

  // does not mutate
  slice(start?: number, end?: number): S[] {
    throw new Error("Method not implemented.");
  }

  concat(...items: ConcatArray<S>[]): S[];
  concat(...items: (S | ConcatArray<S>)[]): S[];
  concat(...items: any[]): S[] {
    throw new Error("Method not implemented.");
  }

  join(separator?: string): string {
    throw new Error("Method not implemented.");
  }

  lastIndexOf(searchElement: S, fromIndex?: number): number {
    throw new Error("Method not implemented.");
  }
  every<S>(predicate: (value: S, index: number, array: S[]) => value is S, thisArg?: any): this is S[];
  every(predicate: (value: S, index: number, array: S[]) => unknown, thisArg?: any): boolean;
  every(predicate: any, thisArg?: any): boolean {
    throw new Error("Method not implemented.");
  }
  some(predicate: (value: S, index: number, array: S[]) => unknown, thisArg?: any): boolean {
    throw new Error("Method not implemented.");
  }
  forEach(callbackfn: (value: S, index: number, array: S[]) => void, thisArg?: any): void {
    throw new Error("Method not implemented.");
  }

  filter<S>(predicate: (value: S, index: number, array: S[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: S, index: number, array: S[]) => unknown, thisArg?: any): S[];
  filter(predicate: any, thisArg?: any): S[] | S[] {
    throw new Error("Method not implemented.");
  }

  find<S>(predicate: (this: void, value: S, index: number, obj: S[]) => value is S, thisArg?: any): S | undefined;
  find(predicate: (value: S, index: number, obj: S[]) => unknown, thisArg?: any): S | undefined;
  find(predicate: any, thisArg?: any): S | S | undefined {
    throw new Error("Method not implemented.");
  }
  findIndex(predicate: (value: S, index: number, obj: S[]) => unknown, thisArg?: any): number {
    throw new Error("Method not implemented.");
  }

  entries(): IterableIterator<[number, S]> {
    throw new Error("Method not implemented.");
  }
  keys(): IterableIterator<number> {
    throw new Error("Method not implemented.");
  }
  values(): IterableIterator<S> {
    throw new Error("Method not implemented.");
  }
  includes(searchElement: S, fromIndex?: number): boolean {
    throw new Error("Method not implemented.");
  }
  flatMap<U, This = undefined>(
    callback: (this: This, value: S, index: number, array: S[]) => U | readonly U[],
    thisArg?: This
  ): U[] {
    throw new Error("Method not implemented.");
  }
  flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[] {
    throw new Error("Method not implemented.");
  }
}

// TODO: currently I clone in the link set to see if anything changed
// I can also not clone and just have a state counter here or something.
export function useLinkedArray<S>(linkedSet: LinkedArray<S>): [LinkedArray<S>, StateDispath<ReadonlyArray<S>>] {
  const [_, setState] = useState(() => linkedSet._getRaw());

  useEffect(() => {
    return subscribe(linkedSet, (newVal) => {
      setState(() => newVal);
    });
  }, [linkedSet]);

  const setter: StateDispath<ReadonlyArray<S>> = useCallback(
    function (newVal) {
      if (newVal instanceof Function) {
        linkedSet._setRaw(newVal(linkedSet._getRaw()));
      } else {
        linkedSet._setRaw(newVal);
      }
    },
    [linkedSet]
  );

  return [linkedSet, setter];
}
