import { describe, expect, it } from "vitest";

describe("startOffsetSec", () => {
  it("test", () => {
    expect(2 === 3).toBe(false);
  });
});

// String
// console.log(string().consume("hello"));
// console.log(string().consume(2));
// Number
// console.log(number().consume(2));
// console.log(number().consume("hello"));
// Boolean
// console.log(boolean().consume(2));
// console.log(boolean().consume(true));
// Object
// console.log(object({ x: number() }).consume({ x: 2 }));
// console.log(object({ x: number() }).consume(true));
// console.log(
//   object({ point: object({ x: number() }) }).consume({ point: { x: 2 } })
// );
// console.log(
//   union(number(), string(), object({ x: number() })).consume("hello")
// );
// console.log(union(number(), string(), object({ x: number() })).consume(true));
// console.log(map({ "[key: string]": number() }).consume(true));
// console.log(map({ "[key: string]": number() }).consume({ x: 3 }));
// console.log(nil().consume(true));
// console.log(nil().consume(null));
// console.log(nil().consume(undefined));
// console.log(object({ x: union(number(), nil()) }).consume(true));
// console.log(object({ x: union(number(), nil()) }).consume({}));
// console.log(object({ x: union(number(), nil()) }).consume({ x: 2 }));
// console.log(array(union(number(), string())).consume(true));
// console.log(array(union(number(), string())).consume([2, "hello"]));
