import { useState, useEffect } from "react";

export function usePotentialInternalState<T>(
  mode: "internal" | "external",
  value: T,
  setValue: (val: T) => void,
): [T, (val: T) => void] {
  const [internal, setInternal] = useState<T>(value);
  useEffect(() => {
    if (mode === "internal") {
      setInternal(value);
    }
  }, [mode, value]);

  if (mode === "internal") {
    return [internal, setInternal];
  } else {
    return [value, setValue];
  }
}
