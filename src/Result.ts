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

function success<T>(value: T): Result<T> {
  return {
    status: "success",
    value,
  };
}

function error<T>(err: unknown): Result<T> {
  return {
    status: "error",
    error: ensureError(err),
  };
}

export const result = { success, error };

////////

export type Status<T> =
  | Readonly<{
      status: "pending";
    }>
  | Readonly<{ status: "ready"; value: T }>
  | Readonly<{ status: "error"; error: Error }>;

function ready<T>(value: T): Status<T> {
  return {
    status: "ready",
    value,
  };
}

function pending<T>(): Status<T> {
  return { status: "pending" };
}

export const status = { ready, pending, error };
