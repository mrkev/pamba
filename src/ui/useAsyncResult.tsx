import { useEffect, useState } from "react";

export type AsyncResultStatus<T> =
  | {
      status: "pending";
    }
  | { status: "ready"; value: T }
  | { status: "error"; error: any };

export function useAsyncResult<T>(promise: Promise<T> | null): AsyncResultStatus<T> {
  const [status, setStatus] = useState<AsyncResultStatus<T>>({ status: "pending" });
  useEffect(() => {
    if (promise == null) {
      return;
    }
    promise
      .then((value) => {
        setStatus({ status: "ready", value });
      })
      .catch((error) => {
        setStatus({ status: "error", error });
      });
  }, [promise]);
  return status;
}
