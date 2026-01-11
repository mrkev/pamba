import { useEffect } from "react";

export function useConditionalKeydown(enabled: boolean, keydown: (e: KeyboardEvent) => void) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
    };
  }, [enabled, keydown]);
}
