/**
 * @desc
 * @type {enum}
 */
export enum NumType {
  Any  = 0,
  F32  = 1,
  F64  = 2,
  // Note:
  //  -> Integers are represented by `fp` values in JS, which are IEEE 754 64-bit `double`s
  //  -> This means we're getting 53 bits of precision for `int` types, i.e. a min/max value of `pow(2, 53) - 1` (`int53`)
  //
  Uint = 3,
  Int  = 4,
};
