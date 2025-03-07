declare global {
  /**
   * @desc represents all values of underlying type `T` with an additional `null` | `undefined` value
   */
  export type Nullable<T> = T | undefined | null;

  /**
   * @desc typed array of some arbitrary length
   */
  export type ArrayOf<
    Q extends 'exactly' | 'at least',
    N extends number,
    T,
    V extends T[] = []
  > = V['length'] extends N
    ? Q extends 'exactly'
    ? [...V]
    : [...V, ...T[]]
    : ArrayOf<Q, N, T, [...V, T]>;

  /**
   * @desc extension of `Partial` utility, requiring a specific property to be defined
   */
  export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

  /**
   * @desc primitive object type names
   * @see https://developer.mozilla.org/en-US/docs/Glossary/Primitive
   */
  export type PrimitiveTypeNames = 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'null';
};
