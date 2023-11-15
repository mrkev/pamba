import { useCallback, useEffect, useState } from "react";
import { SetState } from "../utils/types";

function loadOrSetDefault<T>(id: string, initialValue: T): T {
  const value = localStorage.getItem(id);
  if (value == null) {
    localStorage.setItem(id, JSON.stringify(initialValue));
    return initialValue;
  } else {
    return JSON.parse(value);
  }
}
export function useLocalStorage<T>(id: string, initialValue: T): [T, SetState<T>] {
  const [state, setState] = useState(() => loadOrSetDefault(id, initialValue));

  // load local storage on mount
  useEffect(() => {
    const value = loadOrSetDefault(id, initialValue);
    setState(value);
  }, [id, initialValue]);

  const setter = useCallback<SetState<T>>(
    (arg: T | ((prevState: T) => T)) => {
      setState((prev) => {
        const val = typeof arg === "function" ? (arg as any)(prev) : arg;
        localStorage.setItem(id, JSON.stringify(arg));
        return val;
      });
    },
    [id],
  );

  return [state, setter];
}
