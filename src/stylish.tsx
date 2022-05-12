import { CSSProperties } from "react";

type ClassesFn<T extends { [className: string]: CSSProperties }> = (
  ...args: (
    | keyof T
    | {
        [K in keyof T]?: boolean;
      }
  )[]
) => string;

function createStyles<T extends { [className: string]: CSSProperties }>(
  arg: T
): ClassesFn<T> {
  return (
    ...args: (
      | keyof T
      | {
          [K in keyof T]?: boolean;
        }
    )[]
  ) => {
    return "";
  };
}

function transformed(...args: (string | boolean)[]) {
  let result = "";
  for (let arg of args) {
    if (!arg) continue;
    result += " " + arg;
  }
  return result;
}

const classes = createStyles({
  foo: {
    color: "red",
  },
  bar: {
    color: "red",
  },
  baz: {
    color: "red",
  },
});

function Component() {
  return <div className={classes("foo", "bar", { baz: false, foo: true })} />;
}
