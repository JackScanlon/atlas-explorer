import { NumType } from './types';
import { NumberUtils } from '@engine/math';

/**
 *
 * @param value
 *
 * @returns
 */
export const isEmptyString = (value: string): boolean => {
  return !value.length || !value.replace(/\s/g, '').length;
};

/**
 *
 * @param object
 *
 * @returns
 */
export const isValidString = (object: unknown): object is string => {
  return typeof object === 'string' && !isEmptyString(object);
};

/**
 *
 * @param object
 *
 * @returns
 */
export const isSafeNumber = (object: unknown): object is number => {
  if (typeof object !== 'number') {
    return false;
  }

  return (
    !Number.isNaN(object) &&
    Number.isFinite(object) &&
    (Number.isSafeInteger(object) || ((Math.abs(object) < Number.MIN_VALUE) || (Math.abs(object) > Number.MAX_VALUE)))
  );
};

/**
 *
 * @param object
 *
 * @returns
 */
export const isFloat32 = (object: unknown): object is number => {
  return typeof object === 'number' && Number.isFinite(object) && object == Math.fround(object);
};

/**
 *
 * @param value
 *
 * @returns
 */
export const toSafeInteger = (value: number): number => {
  return Math.trunc(Math.max(Math.min(value, Number.MAX_SAFE_INTEGER), Number.MIN_SAFE_INTEGER));
};

/**
 *
 * @param value
 * @param type
 *
 * @returns
 */
export const toSafeFloat = (value: number, type: NumType.F32 | NumType.F64 = NumType.F64): number => {
  if (type === NumType.F64) {
    return Math.max(Math.min(value, Number.MAX_VALUE), Number.MIN_VALUE);
  }

  const sign = Math.sign(value);
  value = Math.fround(value);

  return Math.max(Math.min(value, sign*3.40282347e+38), sign*1.17549435e-38);
};

/**
 *
 * @param value
 * @param type
 * @param param2
 *
 * @returns
 */
export const tryParseNumber = (
  value: unknown,
  type: NumType = NumType.Any,
  {
    testNaN = true,
    testSafety = true,
    testFinite = true,

    minBounds = undefined,
    maxBounds = undefined,
    precision = undefined,
  }: {
    testNaN?: boolean,
    testSafety?: boolean,
    testFinite?: boolean,

    minBounds?: number,
    maxBounds?: number,
    precision?: number,
  } = {}
): Nullable<number> => {
  let res: number | undefined;
  if (isValidString(value)) {
    switch (type) {
      case NumType.Any: {
        res = Number(value);

        if (!isSafeNumber(res)) {
          return null;
        }

        const remainder = res - (res | 0);
        if (remainder < Number.MIN_VALUE || Math.abs(remainder - 1) < Number.MIN_VALUE) {
          res = Math.trunc(res);
        }

        if (Number.isInteger(res)) {
          type = NumType.Int;
        } else if (Number.isFinite(res) && res == Math.fround(res)) {
          type = NumType.F32;
        } else {
          type = NumType.F64;
        }
      } break;

      case NumType.Int:
        res = Number.parseInt(value);
        break;

      case NumType.F32:
        res = Number.parseFloat(value);
        break;

      case NumType.F64:
        res = Number.parseFloat(value);
        break;

      default:
        break;
    }
  }

  if (typeof res !== 'number' || ((testNaN && Number.isNaN(res)) || (testFinite && !Number.isFinite(res)))) {
    return null;
  }

  if (minBounds !== maxBounds && typeof minBounds === 'number' && typeof maxBounds === 'number') {
    res = NumberUtils.clamp(res, Math.min(minBounds, maxBounds), Math.max(maxBounds, minBounds))
  } else if (typeof minBounds === 'number') {
    res = Math.max(res, minBounds);
  } else if (typeof maxBounds === 'number') {
    res = Math.min(res, maxBounds);
  }

  switch (type) {
    case NumType.Int: {
      if (testSafety) {
        res = toSafeInteger(res);
      }
      res = Math.trunc(res);
    } break;

    case NumType.F32: {
      if (testSafety) {
        res = toSafeFloat(res, type);
      }

      if (precision) {
        // Note:
        //  -> IEEE 754 float32 (binary32): 1x sign bit | 8x exponent bits | 23 fraction bits
        //  -> Clamping to upper bound of 9 digits, but could have 6 to 9 decimal digits of precision for an f32
        //
        res = NumberUtils.round(res, NumberUtils.clamp(precision, 0, 9));
      }
    } break;

    case NumType.F64: {
      if (testSafety) {
        res = toSafeFloat(res, NumType.F64);
      }

      if (precision) {
        // Note:
        //  -> IEEE 754 float64 (binary64): 1x sign bit | 11x exponent bits | 52 fraction bits
        //  -> Clamping to upper bound of 17, but could have 15 to 17 decimal digits of precision for an f64
        //
        res = NumberUtils.round(res, NumberUtils.clamp(precision, 0, 17));
      }
    } break;

    default:
      break;
  }

  return res;
}

/**
 *
 * @param value
 * @param type
 * @param fallback
 * @param opts
 *
 * @returns
 */
export const parseSafeNumber = (
  value: unknown,
  type: NumType = NumType.Any,
  fallback: number = 0,
  opts?: {
    testNaN?: boolean,
    testSafety?: boolean,
    testFinite?: boolean,

    minBounds?: number,
    maxBounds?: number,
    precision?: number,
  }
): number => {
  const res = tryParseNumber(value, type, opts);
  return typeof res === 'number' ? res : fallback;
};
