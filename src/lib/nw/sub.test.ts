import { string, number, boolean, object, union, map, nil, array } from "./nwschema";
import type { NWConsumeResult } from "./nwschema";

describe("matchers", () => {
  it("String", () => {
    const sub = string().concretize("hello");
    expect(sub.peek()).toEqual("hello");
  });

  // it("Number", () => {
  //   passes(number().consume(2), 2);
  //   fails(number().consume("hello"));
  // });

  // it("Boolean", () => {
  //   fails(boolean().consume(2));
  //   passes(boolean().consume(true), true);
  // });

  // it("Object", () => {
  //   passes(object({ x: number() }).consume({ x: 2 }));
  //   fails(object({ x: number() }).consume(true));
  //   passes(object({ point: object({ x: number() }) }).consume({ point: { x: 2 } }));
  // });

  // it("Union", () => {
  //   passes(union(number(), string(), object({ x: number() })).consume("hello"));
  //   fails(union(number(), string(), object({ x: number() })).consume(true));
  // });

  it("Map (simple)", () => {
    const simple = map({ "[key: string]": number() }).concretize({ foo: 3, bar: 2, baz: 1 });
  });

  // it("Nil", () => {
  //   fails(nil().consume(true));
  //   passes(nil().consume(null));
  //   passes(nil().consume(undefined));
  // });

  // it("Optional *", () => {
  //   fails(object({ x: union(number(), nil()) }).consume(true));
  //   passes(object({ x: union(number(), nil()) }).consume({}));
  //   passes(object({ x: union(number(), nil()) }).consume({ x: 2 }));
  // });

  // it("Array", () => {
  //   fails(array(union(number(), string())).consume(true));
  //   passes(array(union(number(), string())).consume([2, "hello"]));
  // });
});
