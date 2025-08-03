export type Ok<T> = [T, null];
export type Err<E> = [null, E];

export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T, E>(value: T): Ok<T> {
  return [value, null];
}

export function err<T, E>(error: E): Err<E> {
  return [null, error];
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result[0] !== null;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result[0] === null;
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result[0];
  } else {
    throw result[1];
  }
}
