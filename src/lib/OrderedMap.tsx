import { SMap, Structured, map } from "structured-state";
import { nullthrows } from "../utils/nullthrows";
import { EmptyObj } from "../utils/types";

export function orderedMap<K, V>() {
  return Structured.create(OrderedMap<K, V>);
}

export class OrderedMap<K, V> extends Structured<EmptyObj, typeof OrderedMap> implements Map<K, V> {
  private readonly _order: Array<K>;
  constructor(private readonly _map: SMap<K, V> = map()) {
    super();
    this._order = Array.from(_map.keys());
  }
  clear(): void {
    this._map.clear();
    this._order.splice(0, this._order.length);
  }
  delete(key: K): boolean {
    const value = this._map.get(key);
    if (value == null) {
      return false;
    }
    const orderPos = this._order.indexOf(key);
    if (orderPos < 0) {
      throw new Error("deleting key without order");
    }

    this._map.delete(key);
    this._order.splice(orderPos, 1);
    return true;
  }
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    throw new Error("Method not implemented.");
  }
  get(key: K): V | undefined {
    return this._map.get(key);
  }
  has(key: K): boolean {
    return this._map.has(key);
  }

  set(key: K, value: V): this {
    throw new Error("Method not implemented.");
  }
  get size(): number {
    return this._map.size;
  }
  entries(): MapIterator<[K, V]> {
    const self = this;
    return (function* () {
      for (const key of self._order) {
        yield [key, nullthrows(self._map.get(key))];
      }
      return undefined;
    })();
  }
  keys(): MapIterator<K> {
    return this._order[Symbol.iterator]();
  }
  values(): MapIterator<V> {
    const self = this;
    return (function* () {
      for (const key of self._order) {
        yield nullthrows(self._map.get(key));
      }
      return undefined;
    })();
  }
  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }
  [Symbol.toStringTag]: string = "[OrderedMap]";

  // Array
  sort(compareFn?: ((a: [K, V], b: [K, V]) => number) | undefined): this {
    if (compareFn == null) {
      this._order.sort();
    } else {
      this._order.sort((a, b) => {
        const aval = nullthrows(this._map.get(a));
        const bval = nullthrows(this._map.get(b));
        return compareFn([a, aval], [b, bval]);
      });
    }

    return this;
  }
  push(key: K, value: V): this {
    this.delete(key);
    this._map.set(key, value);
    this._order.push(key);
    return this;
  }

  // Structured
  override replace(): void {}
  override autoSimplify(): EmptyObj {
    return {};
  }
  static construct() {
    return new OrderedMap(map());
  }
}

// class Foo implements Array<string> {
//   [n: number]: string;
//   length: number;
//   toString(): string {
//     throw new Error("Method not implemented.");
//   }
//   toLocaleString(locales?: unknown, options?: unknown): string {
//     throw new Error("Method not implemented.");
//   }
//   pop(): string | undefined {
//     throw new Error("Method not implemented.");
//   }
//   push(...items: string[]): number {
//     throw new Error("Method not implemented.");
//   }
//   concat(...items: unknown[]): string[] {
//     throw new Error("Method not implemented.");
//   }
//   join(separator?: string): string {
//     throw new Error("Method not implemented.");
//   }
//   reverse(): string[] {
//     throw new Error("Method not implemented.");
//   }
//   shift(): string | undefined {
//     throw new Error("Method not implemented.");
//   }
//   slice(start?: number, end?: number): string[] {
//     throw new Error("Method not implemented.");
//   }
//   sort(compareFn?: ((a: string, b: string) => number) | undefined): this {
//     throw new Error("Method not implemented.");
//   }
//   splice(start: unknown, deleteCount?: unknown, ...rest: unknown[]): string[] {
//     throw new Error("Method not implemented.");
//   }
//   unshift(...items: string[]): number {
//     throw new Error("Method not implemented.");
//   }
//   indexOf(searchElement: string, fromIndex?: number): number {
//     throw new Error("Method not implemented.");
//   }
//   lastIndexOf(searchElement: string, fromIndex?: number): number {
//     throw new Error("Method not implemented.");
//   }
//   every(predicate: unknown, thisArg?: unknown): boolean {
//     throw new Error("Method not implemented.");
//   }
//   some(predicate: (value: string, index: number, array: string[]) => unknown, thisArg?: any): boolean {
//     throw new Error("Method not implemented.");
//   }
//   forEach(callbackfn: (value: string, index: number, array: string[]) => void, thisArg?: any): void {
//     throw new Error("Method not implemented.");
//   }
//   map<U>(callbackfn: (value: string, index: number, array: string[]) => U, thisArg?: any): U[] {
//     throw new Error("Method not implemented.");
//   }
//   filter(predicate: unknown, thisArg?: unknown): string[] | S[] {
//     throw new Error("Method not implemented.");
//   }
//   reduce(callbackfn: unknown, initialValue?: unknown): string | U {
//     throw new Error("Method not implemented.");
//   }
//   reduceRight(callbackfn: unknown, initialValue?: unknown): string | U {
//     throw new Error("Method not implemented.");
//   }
//   find(predicate: unknown, thisArg?: unknown): string | S | undefined {
//     throw new Error("Method not implemented.");
//   }
//   findIndex(predicate: (value: string, index: number, obj: string[]) => unknown, thisArg?: any): number {
//     throw new Error("Method not implemented.");
//   }
//   fill(value: string, start?: number, end?: number): this {
//     throw new Error("Method not implemented.");
//   }
//   copyWithin(target: number, start: number, end?: number): this {
//     throw new Error("Method not implemented.");
//   }
//   entries(): ArrayIterator<[number, string]> {
//     throw new Error("Method not implemented.");
//   }
//   keys(): ArrayIterator<number> {
//     throw new Error("Method not implemented.");
//   }
//   values(): ArrayIterator<string> {
//     throw new Error("Method not implemented.");
//   }
//   includes(searchElement: string, fromIndex?: number): boolean {
//     throw new Error("Method not implemented.");
//   }
//   flatMap<U, This = undefined>(
//     callback: (this: This, value: string, index: number, array: string[]) => U | readonly U[],
//     thisArg?: This | undefined,
//   ): U[] {
//     throw new Error("Method not implemented.");
//   }
//   flat<A, D extends number = 1>(this: A, depth?: D | undefined): FlatArray<A, D>[] {
//     throw new Error("Method not implemented.");
//   }
//   at(index: number): string | undefined {
//     throw new Error("Method not implemented.");
//   }
//   findLast(predicate: unknown, thisArg?: unknown): string | S | undefined {
//     throw new Error("Method not implemented.");
//   }
//   findLastIndex(predicate: (value: string, index: number, array: string[]) => unknown, thisArg?: any): number {
//     throw new Error("Method not implemented.");
//   }
//   toReversed(): string[] {
//     throw new Error("Method not implemented.");
//   }
//   toSorted(compareFn?: ((a: string, b: string) => number) | undefined): string[] {
//     throw new Error("Method not implemented.");
//   }
//   toSpliced(start: unknown, deleteCount?: unknown, ...items: unknown[]): string[] {
//     throw new Error("Method not implemented.");
//   }
//   with(index: number, value: string): string[] {
//     throw new Error("Method not implemented.");
//   }
//   [Symbol.iterator](): ArrayIterator<string> {
//     throw new Error("Method not implemented.");
//   }
//   [Symbol.unscopables]: {
//     [x: number]: boolean | undefined;
//     length?: boolean | undefined;
//     toString?: boolean | undefined;
//     toLocaleString?: boolean | undefined;
//     pop?: boolean | undefined;
//     push?: boolean | undefined;
//     concat?: boolean | undefined;
//     join?: boolean | undefined;
//     reverse?: boolean | undefined;
//     shift?: boolean | undefined;
//     slice?: boolean | undefined;
//     sort?: boolean | undefined;
//     splice?: boolean | undefined;
//     unshift?: boolean | undefined;
//     indexOf?: boolean | undefined;
//     lastIndexOf?: boolean | undefined;
//     every?: boolean | undefined;
//     some?: boolean | undefined;
//     forEach?: boolean | undefined;
//     map?: boolean | undefined;
//     filter?: boolean | undefined;
//     reduce?: boolean | undefined;
//     reduceRight?: boolean | undefined;
//     find?: boolean | undefined;
//     findIndex?: boolean | undefined;
//     fill?: boolean | undefined;
//     copyWithin?: boolean | undefined;
//     entries?: boolean | undefined;
//     keys?: boolean | undefined;
//     values?: boolean | undefined;
//     includes?: boolean | undefined;
//     flatMap?: boolean | undefined;
//     flat?: boolean | undefined;
//     at?: boolean | undefined;
//     findLast?: boolean | undefined;
//     findLastIndex?: boolean | undefined;
//     toReversed?: boolean | undefined;
//     toSorted?: boolean | undefined;
//     toSpliced?: boolean | undefined;
//     with?: boolean | undefined;
//     [Symbol.iterator]?: boolean | undefined;
//     readonly [Symbol.unscopables]?: boolean | undefined;
//   };
// }
