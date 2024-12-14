import { ensureError } from "./ensureError";

export type Result<T> =
  | Readonly<{
      status: "success";
      value: T;
    }>
  | Readonly<{
      status: "error";
      error: Error;
    }>;

export function success<T>(value: T): Result<T> {
  return {
    status: "success",
    value,
  };
}

export function error<T>(err: unknown): Result<T> {
  return {
    status: "error",
    error: ensureError(err),
  };
}

export const result = { success, error };
