import { SAFE_I32 } from './constants';
import { ExplorerError } from './error';

/**
 * @desc converts some numeric value to a binary string; used for debugging
 * @note must be max 32-bit int
 *
 * @param {number} value some numeric value to process
 * @param {number} size  int bit size; one of `8 | 16 | 32`
 *
 * @returns {string} a string binary representation of this numeric value
 */
export const toBinaryString = (value: number, size: 8 | 16 | 32 = 8): string => {
  if (!Number.isSafeInteger(value) || Math.abs(value) > SAFE_I32) {
    throw new ExplorerError({
      code: ExplorerError.Errors.InvalidArgument,
      msg: `Expected a finite & safe (unsigned) int32, specified value does not meet this criteria`,
    });
  }

  let res = '';
  for (let i = 0, mask = value; i < 32; i++, mask <<= 1) {
    res += String(mask >>> 31);
  }

  return res.substring(32, 32 - size).replace(/\B(?=(\d{8})+(?!\d))/g, ' ');
};

/**
 * @desc generic binary search
 *
 * @param {Array<T>}          arr        some target array
 * @param {V}                 obj        some object to find within the target array
 * @param {CompareFunc<V, T>} comparator a comparator function
 *
 * @returns {number} either...
 *    1. Some positive integer describing the index of the object found within the array
 *    2. OR; a negative integer whose bitwise complement describes the index at which the object would be positioned
 */
export const binarySearch = <T, V>(arr: T[], obj: V, comparator: (a: V, b: T) => number): number => {
  let comp = 0,
    left = 0,
    right = arr.length - 1,
    midpoint = 0;

  while (left <= right) {
    // i.e. x = ⌊ 0.5*(left + right) ⌋
    midpoint = (left + right) >>> 1;

    // compare & then bit hack to get the integer's sign (assuming 32 bit here)
    //  - i.e. `sgn(x)`
    //  - see ref @ https://graphics.stanford.edu/~seander/bithacks.html#CopyIntegerSign
    //
    comp = comparator(obj, arr[midpoint]);
    comp = Number(comp != 0) | (comp >> 31);

    switch (comp) {
      case -1:
        {
          right = --midpoint;
        }
        break;

      case 1:
        {
          left = ++midpoint;
        }
        break;

      default:
        return midpoint;
    }
  }

  return ~left;
};

/**
 * @desc generic binary insertion
 *
 * @param {Array<T>}       arr            some target array
 * @param {T}              obj            some object to insert
 * @param {CompareFunc<T>} comparator     a comparator function
 * @param {boolean|any}    allowDuplicate specifies whether duplicates can be inserted (optional; defaults to `true`)
 *
 * @returns {number} either...
 *    1. Some positive integer describing the index of the inserted object
 *    2. OR; a negative integer whose bitwise complement describes the duplicate index on insertion failure
 */
export const binaryInsert = <T>(arr: T[], obj: T, comparator: (a: T, b: T) => number, allowDuplicate: boolean = true): number => {
  let comp = 0,
    left = 0,
    right = arr.length - 1,
    midpoint = 0;

  loop: while (left <= right) {
    // i.e. ⌊ 0.5*(left + right) ⌋
    midpoint = (left + right) >>> 1;

    // compare & then bit hack to get the integer's sign (assuming 32 bit here)
    //  - i.e. `sgn(x)`
    //  - see ref @ https://graphics.stanford.edu/~seander/bithacks.html#CopyIntegerSign
    //
    comp = comparator(obj, arr[midpoint]);
    comp = Number(comp != 0) | (comp >> 31);

    switch (comp) {
      case -1:
        right = --midpoint;
        continue;

      case 1:
        left = ++midpoint;
        continue;

      default: {
        if (!allowDuplicate) {
          return ~midpoint;
        }

        left = midpoint;
        break loop;
      }
    }
  }

  arr.splice(left, 0, obj);
  return left;
};
