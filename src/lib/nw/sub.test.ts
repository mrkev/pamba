import { string, number, boolean, object, union, map, nil, array } from "./subschema";
import type { SubNumber } from "./subschema";
import * as nw from "./nwschema";

describe("get", () => {
  it("String", () => {
    const str = string("hello", nw.string());
    expect(str.peek()).toEqual("hello");
  });

  it("Number", () => {
    const num = number(4, nw.number());
    expect(num.peek()).toEqual(4);
  });

  it("Boolean", () => {
    const bool = boolean(true, nw.boolean());
    expect(bool.peek()).toEqual(true);
  });

  it("Nil", () => {
    const noop = nil(null, nw.nil());
    expect(noop.peek()).toEqual(null);
  });

  it("Object", () => {
    const objectTest = object(
      { foo: number(3, nw.number()) },
      nw.object({
        foo: nw.number(),
      })
    );

    expect(objectTest.peek()).toEqual({ foo: 3 });
  });

  it("Union", () => {
    // TODO
  });

  it("Map", () => {
    const mapTest = map(
      { foo: number(3, nw.number()), bar: number(2, nw.number()) },
      nw.map({ "[key: string]": nw.number() })
    );
    expect(mapTest.peek()).toEqual({ foo: 3, bar: 2 });
  });

  it("Optional *", () => {
    // TODO
  });

  it("Array", () => {
    const arr = array<SubNumber>([number(2, nw.number()), number(3, nw.number())], nw.array(nw.number()));
    expect(arr.peek()).toEqual([2, 3]);
  });
});

describe("set", () => {
  it("String", () => {
    const str = string("hello", nw.string());
    str.set("world");
    expect(str.peek()).toEqual("world");
  });

  it("Number", () => {
    const str = number(3, nw.number());
    str.set(2);
    expect(str.peek()).toEqual(2);
  });

  it("Boolean", () => {
    const bool = boolean(true, nw.boolean());
    bool.set(false);
    expect(bool.peek()).toEqual(false);
  });

  it("Nil", () => {
    const noop = nil(null, nw.nil());
    noop.set(null);
    expect(noop.peek()).toEqual(null);
  });
});

describe("at", () => {
  it("Object", () => {
    const objectTest = object(
      {
        foo: number(3, nw.number()),
        bar: number(2, nw.number()),
      },
      nw.object({
        foo: nw.number(),
        bar: nw.number(),
      })
    );

    expect(objectTest.at("foo").peek()).toEqual(3);
  });

  it("Map", () => {
    const mapTest = map(
      {
        foo: number(3, nw.number()),
        bar: number(2, nw.number()),
      },
      nw.map({ "[key: string]": nw.number() })
    );
    expect(mapTest.at("foo")?.peek()).toEqual(3);
    expect(mapTest.at("baz")).toEqual(null);
  });

  it("Array", () => {
    const arr = array<SubNumber>(
      [
        number(0, nw.number()),
        number(1, nw.number()),
        number(2, nw.number()),
        number(3, nw.number()),
        number(4, nw.number()),
        number(5, nw.number()),
      ],
      nw.array(nw.number())
    );
    expect(arr.at(0)?.peek()).toEqual(0);
    expect(arr.at(6)).toEqual(null);
  });
});
