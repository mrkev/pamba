import { useEffect, useState } from "react";

export function useAsyncState<T>(cb: () => Promise<T>): T | null {
  const [result, setResult] = useState<T | null>(null);

  useEffect(() => {
    let active = true;
    void load();
    return () => {
      active = false;
    };

    async function load() {
      setResult(null);
      const res = await cb();
      if (!active) {
        return;
      }
      setResult(res);
    }
  }, [cb]);

  return result;
}
