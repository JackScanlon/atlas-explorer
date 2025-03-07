import {
  isArrayBuffer, isArrayBufferViewLike, isArrayLike,
  isObjectLike, isRegex, isDate,
  type ArrayLike, type ArrayBufferViewLike
} from './types';

export * from './types';

/**
 * @desc deep compare `Set` values
 *
 * @param {Set} lhs some value to compare
 * @param {Set} rhs some value to compare
 *
 * @returns {boolean} specifying whether the values have equality
 */
export const areSetsEqual = (lhs: Set<unknown>, rhs: Set<unknown>): boolean => {
  if (lhs === rhs) {
    return true;
  } else if (lhs.size !== rhs.size) {
    return false;
  }

  for (const value of lhs) {
    if (!rhs.has(value)) {
      return false;
    }
  }

  return true;
};

/**
 * @desc deep compare `Map` values
 *
 * @param {Map} lhs some value to compare
 * @param {Map} rhs some value to compare
 *
 * @returns {boolean} specifying whether the values have equality
 */
export const areMapsEqual = (lhs: Map<unknown, unknown>, rhs: Map<unknown, unknown>): boolean => {
  if (lhs === rhs) {
    return true;
  } else if (lhs.size !== rhs.size) {
    return false;
  }

  for (let [key, lValue] of lhs) {
    if (!rhs.has(key)) {
      return false;
    }

    if (!hasDeepEquality(lValue, rhs.get(key))) {
      return false;
    }
  }

  return true;
};

/**
 * @desc deep compare {@link ArrayLike} values
 *
 * @param {ArrayLike} lhs some value to compare
 * @param {ArrayLike} rhs some value to compare
 *
 * @returns {boolean} specifying whether the values have equality
 */
export const areArraysEqual = (lhs: ArrayLike, rhs: ArrayLike): boolean => {
  if (lhs === rhs) {
    return true;
  } else if (lhs.length !== rhs.length) {
    return false;
  }

  for (let i = lhs.length; i-- > 0; ) {
    if (!hasDeepEquality(lhs[i], rhs[i])) {
      return false;
    }
  }

  return true;
};

/**
 * @desc deep compare `ArrayBuffer` values
 *
 * @param {ArrayBuffer} lhs some value to compare
 * @param {ArrayBuffer} rhs some value to compare
 *
 * @returns {boolean} specifying whether the values have equality
 */
export const areArrayBuffersEqual = (lhs: ArrayBuffer, rhs: ArrayBuffer): boolean => {
  if (lhs === rhs) {
    return true;
  } else if (lhs.byteLength !== rhs.byteLength) {
    return false;
  }

  try {
    const v0 = new DataView(lhs);
    const v1 = new DataView(rhs);

    for (let i = lhs.byteLength; i-- > 0; ) {
      if (v0.getUint8(i) !== v1.getUint8(i)) {
        return false;
      }
    }

    return true;
  }
  catch { }

  return false;
};

/**
 * @desc deep compare {@link ArrayBufferViewLike} values
 *
 * @param {ArrayBufferViewLike} lhs some value to compare
 * @param {ArrayBufferViewLike} rhs some value to compare
 *
 * @returns {boolean} specifying whether the values have equality
 */
export const areBufferViewsEqual = (lhs: ArrayBufferViewLike, rhs: ArrayBufferViewLike): boolean => {
  if (lhs === rhs) {
    return true;
  } else if (lhs.byteLength !== rhs.byteLength) {
    return false;
  }

  const v0 = new DataView(lhs.buffer);
  const v1 = new DataView(rhs.buffer);

  for (let i = lhs.byteLength; i-- > 0; ) {
    if (v0.getUint8(i) !== v1.getUint8(i)) {
      return false;
    }
  }

  return true;
};

/**
 * @desc deep compare values
 * @note **IMPORTANT:** does not currently decycle circular references!
 *
 * @param {unknown} lhs some value to compare
 * @param {unknown} rhs some value to compare
 *
 * @returns {boolean} specifying whether the values have equality
 */
export const hasDeepEquality = (lhs: unknown, rhs: unknown): boolean => {
  if (lhs === rhs) {
    return true;
  }

  if (typeof lhs === 'number' && typeof rhs === 'number' && Number.isNaN(lhs) && Number.isNaN(rhs)) {
    return true;
  } else if (isRegex(lhs) && isRegex(rhs)) {
    return lhs.source === rhs.source && lhs.flags === rhs.flags;
  } else if (isDate(lhs) && isDate(rhs)) {
    return lhs.getTime() === rhs.getTime();
  } else if (isArrayLike(lhs) && isArrayLike(rhs)) {
    return areArraysEqual(lhs, rhs);
  } else if (lhs instanceof Map && rhs instanceof Map) {
    return areMapsEqual(lhs, rhs);
  } else if (lhs instanceof Set && rhs instanceof Set) {
    return areSetsEqual(lhs, rhs);
  } else if (isArrayBufferViewLike(lhs) && isArrayBufferViewLike(rhs)) {
    return areBufferViewsEqual(lhs, rhs);
  } else if (isArrayBuffer(lhs) && isArrayBuffer(rhs)) {
    return areArrayBuffersEqual(lhs, rhs)
  } else if (isObjectLike(lhs) && isObjectLike(rhs)) {
    if (lhs.constructor !== rhs.constructor) {
      return false;
    } else if (lhs.valueOf !== Object.prototype.valueOf) {
      return lhs.valueOf() === rhs.valueOf();
    }

    // NOTE:
    //   Attempt to use any UDF equality methods
    //
    const eqFnLhs = 'equals' in lhs && typeof lhs.equals === 'function' ? lhs.equals : null;
    const eqFnRhs = 'equals' in rhs && typeof rhs.equals === 'function' ? rhs.equals : null;
    if (eqFnLhs === eqFnRhs) {
      try {
        return (lhs.equals as Function)(rhs);
      }
      catch (e) { }
    }

    if (lhs.toString !== Object.prototype.toString) {
      return lhs.toString() === rhs.toString();
    }

    const lKeys = Object.keys(lhs);
    if (lKeys.length !== Object.keys(rhs).length) {
      return false;
    }

    // NOTE:
    //   We're ignoring circular references here; should we consider
    //   non-destructive decycling?
    let key!: PropertyKey;
    for (let i = lKeys.length; i-- > 0; ) {
      key = lKeys[i];
      if (!Object.prototype.hasOwnProperty.call(rhs, key)) {
        return false;
      } else if (!hasDeepEquality(lhs?.[key], rhs?.[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
};
