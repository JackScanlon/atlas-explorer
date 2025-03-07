import { Const, ExplorerError } from '@engine/common';

/**
 * @desc returns a random `float` (really a `double`) within the specified `min` and `max` range
 *
 * @param {number} [min=0] lower bounds
 * @param {number} [max=0] upper bounds
 *
 * @returns {number} some random `float` between `min` and `max`
 */
export const randomFloat = (min: number = 0, max: number = 1): number => {
  return Math.random() * (max - min) + min;
};

/**
 * @desc returns a random `int` within the specified `min` and `max` range
 *
 * @param {number} [min=0] lower bounds
 * @param {number} [max=0] upper bounds
 *
 * @returns {number} some random `int` between `min` and `max`
 */
export const randomInt = (min: number = 0, max: number = 1): number => {
  return Math.ceil(Math.random() * (max - min)) + min;
};

/**
 * @desc clamps a number within the given range
 *
 * @param {number} value some value to clamp
 * @param {number} min   lower lim of the range
 * @param {number} max   upper lim of the range
 *
 * @return {number} the resultant value clamped within the specified range
 */
export const clamp = (value: number, min: number, max: number): number => {
  return value < min ? min : value > max ? max : value;
};

/**
 * @desc clamps a number between 0 and 1
 *
 * @param {number} value some value to clamp
 *
 * @return {number} a clamped value in the range of 0-1
 */
export const clamp01 = (value: number): number => {
  return value < 0 ? 0 : value > 1 ? 0 : value;
};

/**
 * @desc wraps the specified value such that it's never larger than the given length and never smaller than 0
 * @note the default behaviour is to repeat between two numbers, if `oscillate` is specified the number will
 *       oscillate between 0 and the specified length
 *
 * @param {number}  value             some value to remap
 * @param {number}  [length=1]        the maximum bounds, or length, of the range
 * @param {boolean} [oscillate=false] specifies whether to oscillate between those two values instead of rolling back to `0`
 *
 * @returns {number} some value between 0 and the specified length
 */
export const wrap = (value: number, length: number, oscillate: boolean = false): number => {
  if (oscillate) {
    const r = length * 2;
    value = clamp(value - Math.floor(value / r) * r, 0, r);
    return length - Math.abs(value - length);
  }

  return clamp(value - Math.floor(value / length) * length, 0, length);
};

/**
 * @param {number} value some value to normalise
 * @param {number} inMin the minimum bounds of this value's range
 * @param {number} inMax the maximum bounds of this value's range
 *
 * @returns {number} a value normalised between 0 and 1
 */
export const normalise = (value: number, inMin: number, inMax: number): number => {
  return (value - inMin) / (inMax - inMin);
};

/**
 * @param {number} value  some value to remap
 * @param {number} inMin  the minimum bounds of this value's range
 * @param {number} inMax  the maximum bounds of this value's range
 * @param {number} outMin the minimum bounds of the desired range
 * @param {number} outMax the maximum bounds of the desired range
 *
 * @returns {number} a value remapped from its current range to another range
 */
export const remapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

/**
 * @desc interpolates a number from `a` from `b` at alpha `t`
 *
 * @param {number}  a                 some start position
 * @param {number}  b                 some target position
 * @param {number}  t                 the interpolation fraction between the positions (expects range 0 - 1)
 * @param {boolean} [clampAlpha=true] optionally specify whether the alpha should be clamped
 *
 * @returns {number} some position at alpha `t` on some line between both positions
 */
export const lerp = (a: number, b: number, t: number, clampAlpha: boolean = true): number => {
  t = !!clampAlpha ? (t < 0 ? 0 : t > 1 ? 1 : t) : t;

  return a + (b - a) * t;
};

/**
 * @desc interpolates from some radian position `a` to another radian position `b` at alpha `t`
 * @note used to interpolate between theta targets, ensuring that the interpolated position wraps around at 360deg
 *
 * @param {number}  a                  some start position (in radians)
 * @param {number}  b                  some target position (in radians)
 * @param {number}  t                  the interpolation fraction between the positions; wraps around 0 - 1 if specified, otherwise clamped to 0 - 1
 * @param {boolean} [wrapAround=false] specifies whether we should wrap alpha `t` around 0 - 1
 * @param {boolean} [oscillate=false]  specifies whether to oscillate between those two values instead of rolling back to `0`; ignored if `wrapAround=false`
 *
 * @returns {number}
 */
export const angleLerp = (a: number, b: number, t: number, wrapAround: boolean = false, oscillate: boolean = false): number => {
  const dt = wrap(b - a, Const.TAU);
  t = wrapAround ? wrap(t, 1, oscillate) : t < 0 ? 0 : t > 1 ? 1 : t;

  return a + t * (dt > Math.PI ? dt - Const.TAU : dt);
};

/**
 * @desc tests whether `a` is approximately `b` within some threshold described by `eps`
 *
 * @param {number} a   some number
 * @param {number} b   some number
 * @param {number} eps epsilon - defaults to 1e-6 (see `Const.EPS`)
 *
 * @returns {number} a boolean reflecting its approximate equality
 */
export const approximately = (a: number, b: number, eps: number = Const.EPSILON_LP): boolean => {
  return a === b || Math.abs(a - b) <= eps; // (Math.abs(a - b) <= (Math.abs(a) + 1)*eps)
};

/**
 * @desc round some number value by some precision
 * @example
 * // returns 1.06, i.e. rounded to 2 decimal places
 * round(1.055, 2)
 *
 * @param {number} value         some input value
 * @param {number} [precision=0] the rounding precision
 *
 * @returns {number} some number value rounded to some precision
 */
export const round = (value: number, precision: number = 0): number => {
  const m = Math.pow(10, precision);
  return Math.round(value * m) / m;
};

/**
 * @desc tests whether the given number is a power of two
 * @see {@link http://graphics.stanford.edu/~seander/bithacks.html|Power of two bit hack reference}
 *
 * @param {number} n            some input integer
 * @param {number} [trunc=true] specify whether to truncate the number, see {@link Math.trunc}; defaults to `true`
 *
 * @returns {boolean} describing whether the given input is a power of two
 */
export const isPowerOfTwo = (n: number, trunc: boolean = true): boolean => {
  n = trunc ? Math.trunc(n) : n;
  return (n & (n - 1)) === 0;
};

/**
 * @desc computes the nearest (ceil) power of two of the specified value
 * @note
 *  1. this assumes input `n` is a 32-bit integer
 *  2. the reason we're capping texture size is due to support
 *     across platforms & devices, see the following link:
 *     https://web3dsurvey.com/webgl/parameters/MAX_TEXTURE_SIZE
 *
 * @param {number} n            some input value (integer)
 * @param {number} [lim=4096]   the maximum allowable size; err is raised if the computed POT exceeds this value
 * @param {number} [trunc=true] specify whether to truncate the number, see {@link Math.trunc}; defaults to `true`
 *
 * @returns {number} the nearest POT value; raises an error if the value exceeds the specified limit
 */
export const ceilPowerOfTwo = (n: number, lim: number = Const.MAX_POT_SIZE, trunc: boolean = true): number => {
  n = trunc ? Math.trunc(n) : n;

  if (!Number.isSafeInteger(n) || n < 0 || n > lim) {
    // Throw if we already exceed the threshold and/or we're not a safe, positive integer
    throw new ExplorerError({
      msg: `Texture POT size must be a safe, positive integer that does not exceed the ${lim} texture size limit (${lim}x${lim})`,
      code: ExplorerError.Errors.InvalidArgument,
    });
  } else if (n === 0 || (n & (n - 1)) === 0) {
    // Early exit if we're already zero / a power of two
    return n;
  }

  // See ref @ http://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  return n + 1;
};
