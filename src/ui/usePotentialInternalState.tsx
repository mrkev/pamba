import { useState } from "react";

export function usePotentialInternalState<T>(
  mode: "internal" | "external",
  value: T,
  setValue: (val: T) => void,
): [T, (val: T) => void] {
  const [internal, setInternal] = useState<T>(value);

  // While in "internal" mode, keep the internal copy synced to `value`.
  // Adjusting state during render is React's recommended way to derive state
  // from props — it avoids the extra commit (and the
  // react-hooks/set-state-in-effect cascade) an effect would incur.
  const [prev, setPrev] = useState({ mode, value });
  if (prev.mode !== mode || prev.value !== value) {
    setPrev({ mode, value });
    if (mode === "internal") {
      setInternal(value);
    }
  }

  if (mode === "internal") {
    return [internal, setInternal];
  } else {
    return [value, setValue];
  }
}
