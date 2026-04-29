import { EventEmitter } from "node:events";

/**
 * A type-safe version of Node.js EventEmitter.
 * T is a record where keys are event names and values are payload types.
 */
export class TypedEventEmitter<T extends Record<string, any>> extends EventEmitter {
  override on<K extends keyof T>(event: K | (string & symbol) | string | symbol, listener: (data: T[K]) => void): this {
    return super.on(event as string | symbol, listener as any);
  }

  override once<K extends keyof T>(event: K | (string & symbol) | string | symbol, listener: (data: T[K]) => void): this {
    return super.once(event as string | symbol, listener as any);
  }

  override off<K extends keyof T>(event: K | (string & symbol) | string | symbol, listener: (data: T[K]) => void): this {
    return super.off(event as string | symbol, listener as any);
  }

  override emit<K extends keyof T>(event: K | (string & symbol) | string | symbol, data: T[K]): boolean {
    return super.emit(event as string | symbol, data);
  }

  override removeAllListeners<K extends keyof T>(event?: K | (string & symbol) | string | symbol): this {
    return super.removeAllListeners(event as string | symbol);
  }
}

/**
 * Recursively makes all properties in T readonly.
 */

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

/**
 * Recursively makes all properties in T optional.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * Asserts that two types are equal at the type level.
 * Useful for type-level testing.
 */
export type AssertEqual<T, U> =
  [T] extends [U]
    ? [U] extends [T]
      ? true
      : false
    : false;
