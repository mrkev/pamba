const boxed: Record<string, any> = {};

export function boxUp<T>(create: () => T, name: string): () => T {
  return () => {
    let res = boxed[name];
    if (res == null) {
      res = create();
      boxed[name] = res;
      return res;
    } else {
      return res;
    }
  };
}
