import { string, number, boolean, object, union, map, nil, array } from "./nwschema";
import type { NWConsumeResult } from "./nwschema";

function passes<T>(result: NWConsumeResult<any>, expectedValue?: T): void {
  // arguments.length so we can test for expectedValue === undefined
  if (arguments.length === 1) {
    return expect(result.status).toEqual("success");
  } else {
    return expect(result).toEqual({ status: "success", value: expectedValue });
  }
}

function fails(result: NWConsumeResult<any>): void {
  return expect(result.status).toEqual("failure");
}

describe("matchers", () => {
  it("String", () => {
    passes(string().consume("hello"), "hello");
    fails(string().consume(2));
  });

  it("Number", () => {
    passes(number().consume(2), 2);
    fails(number().consume("hello"));
  });

  it("Boolean", () => {
    fails(boolean().consume(2));
    passes(boolean().consume(true), true);
  });

  it("Object", () => {
    passes(object({ x: number() }).consume({ x: 2 }));
    fails(object({ x: number() }).consume(true));
    passes(object({ point: object({ x: number() }) }).consume({ point: { x: 2 } }));
  });

  it("Union", () => {
    passes(union(number(), string(), object({ x: number() })).consume("hello"));
    fails(union(number(), string(), object({ x: number() })).consume(true));
  });

  it("Map", () => {
    fails(map({ "[key: string]": number() }).consume(true));
    passes(map({ "[key: string]": number() }).consume({ x: 3 }));
  });

  it("Nil", () => {
    fails(nil().consume(true));
    passes(nil().consume(null));
    passes(nil().consume(undefined));
  });

  it("Optional *", () => {
    fails(object({ x: union(number(), nil()) }).consume(true));
    passes(object({ x: union(number(), nil()) }).consume({}));
    passes(object({ x: union(number(), nil()) }).consume({ x: 2 }));
  });

  it("Array", () => {
    fails(array(union(number(), string())).consume(true));
    passes(array(union(number(), string())).consume([2, "hello"]));
  });
});
