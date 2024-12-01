import * as Three from 'three'

import { Const, Workspace } from '@/explorer/constants'
import { isCSSRule } from '@/utils'
import {
  AlAxisScale, AlScaleFn, AlScaleTarget,
  AtlasDescriptor, AtlasPacked, AtlasSpeciality, ExplorerElementProps
} from '@/explorer/types'

/**
 * @desc matches camel case string patterns
 */
const CAMEL_CASE_PATTERN = /(?<=[a-z\d])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g;

/**
 * splitCamelCase
 * @desc splits a camel case spring into its components
 *
 * @param {string} input some input string
 *
 * @returns {string[]} the resulting string array containing each component of the input
 */
export const splitCamelCase = (input: string): string[] => {
  return input.split(CAMEL_CASE_PATTERN);
}

/**
 * isAtlasDescriptor
 * @desc tests whether some value is a `AtlasDescriptor`
 *
 * @param {any} obj some value to test
 *
 * @returns {boolean} describing whether the input object is a `AtlasDescriptor`
 */
export const isAtlasDescriptor = (obj: any): obj is AtlasDescriptor => {
  return obj instanceof Object && obj.constructor == Object && typeof obj.target === 'string';
}

/**
 * applyAppearance
 * @desc apply an appearance descriptor set to a `HTMLElement`
 *
 * @param {HTMLElement}                    element    the `HTMLElement` to target
 * @param {ExplorerElementProps|undefined} appearance some nullable descriptor set
 *
 */
export const applyAppearance = (element: HTMLElement, appearance: ExplorerElementProps | undefined): void => {
  if (!appearance) {
    return;
  }

  const {
    Style: style,
    ClassName: className,
    ClassList: classList,
    ZIndex: zIndex,
  } = appearance;

  if (className) {
    element.className = className;
  } else if (classList) {
    for (let i = 0; i < classList.length; ++i) {
      element.classList.add(classList[i]);
    }
  }

  if (style) {
    for (const [prop, value] of Object.entries(style)) {
      let priority = '';
      let resolved: string | undefined;
      if (isCSSRule(value)) {
        resolved = value.cssText;
      } else if (isAtlasDescriptor(value)) {
        resolved = value.target;
        priority = typeof value.priority === 'string' ? value.priority : priority;
      } else if (typeof value === 'number') {
        resolved = value.toString();
      } else if (typeof value === 'string') {
        resolved = value;
      }

      if (resolved) {
        const propName = splitCamelCase(prop).join('-');
        element.style.setProperty(propName, resolved, priority);
      }
    }
  }

  if (zIndex) {
    element.style.zIndex = typeof zIndex === 'string' ? zIndex : zIndex.toString();
  }
}

/**
 * rayPlaneIntersect
 * @desc basic implementation of ray-plane intersection test
 *
 * @param {Vector3} rayOrigin    starting position of the ray
 * @param {Vector3} rayDirection ray direction (with magnitude)
 * @param {Vector3} planeOrigin  a point on the plane
 * @param {Vector3} planeNormal  the plane's normal
 *
 * @returns {Object} an object specifying whether the ray intersects with the plane
 *                   and either (a) the intersection position; or (b) the end position
 *                   of the ray
 */
export const rayPlaneIntersect = (
  rayOrigin: Three.Vector3,
  rayDirection: Three.Vector3,
  planeOrigin: Three.Vector3,
  planeNormal: Three.Vector3
): { Intersects: boolean, Position: Three.Vector3 } => {
  const result = { Intersects: false, Position: rayOrigin.clone().add(rayDirection) }
  const distance = planeOrigin.x*planeNormal.x + planeOrigin.y*planeNormal.y + planeOrigin.z*planeNormal.z;

  const v0 = rayDirection.x*planeNormal.x + rayDirection.y*planeNormal.y + rayDirection.z*planeNormal.z;
  if (approximately(v0, 0)) {
    return result;
  }

  const v1 = planeOrigin.clone().sub(rayOrigin).dot(planeNormal) / v0;
  result.Intersects = v1 > distance;
  result.Position = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(v1));
  return result;
}

/**
 * approximately
 * @desc tests whether `a` is approximately `b` within some threshold described by `eps`
 * @param {number} a   some number
 * @param {number} b   some number
 * @param {number} eps epsilon - defaults to 1e-6 (see `Const.EPS`)
 * @returns {number} a boolean reflecting its approximate equality
 */
export const approximately = (a: number, b: number, eps: number = Const.EPS): boolean => {
  return a === b || (Math.abs(a - b) <= (Math.abs(a) + 1)*eps)
}

/**
 * interpolateString
 * @desc Interpolate string template
 *
 * @param  {string} str    The string to interpolate
 * @param  {object} params The parameters
 * @return {str} The interpolated string
 *
 */
export const interpolateString = (str: string, params: Record<string, any>): string => {
  const names = Object.keys(params);
  const values = Object.values(params);
  return new Function(...names, `return \`${str}\`;`)(...values);
}

/**
 * clampValue
 * @desc clamps a number within the given range
 *
 * @param {number} value some value to clamp
 * @param {number} min   lower lim of the range
 * @param {number} max   upper lim of the range
 *
 * @return {number} the given value clamped between the given range
 */
export const clampValue = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * rescaleToRange
 * @desc rescale a value from one range to another
 *
 * @param {number} value  some value to rescale
 * @param {number} inMin  current min bounds of the value
 * @param {number} inMax  current max bounds of the value
 * @param {number} outMin target min bounds
 * @param {number} outMax target max bounds
 *
 * @returns {number} the rescaled value
 */
export const rescaleToRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
};

/**
 * isFnType
 * @desc utility fn to determine whether a value is a function
 *
 * @param {unknown|undefined} value some value to test
 *
 * @return {boolean} specifying whether the value is a function
 */
export const isFnType = (value?: unknown): boolean => !!(value && value.constructor && typeof value === 'function' && value.apply);

/**
 * getScalerFn
 * @desc attempts to build a scale fn from the given `AlScalingOpt` property
 *
 * @param {AlScaleTarget|AlScaleFn|undefined} prop some `AlScalingOpt` property
 *
 * @return {AlScaleFn|null} the scaler assoc. with this prop (if any)
 */
export const getScalerFn = (prop?: AlScaleTarget | AlScaleFn): AlScaleFn | null => {
  if (!prop) {
    return null;
  }

  if (typeof prop === 'object' && prop.constructor == Object) {
    if (typeof prop.min === 'number' && typeof prop.max === 'number') {
      return ((val: number, min: number, max: number) => {
        return rescaleToRange(val, min, max, prop.min, prop.max);
      });
    }
  } else if (isFnType(prop)) {
    return prop as AlScaleFn;
  }

  return null;
}

/**
 * toFixedFloat
 * @desc attempts to parse a floating point number from a string/number object
 *       and fixes its precision to the given optional parameter
 *
 * @param {string|number} input     the input value to parse / fix
 * @param {number|any}    precision i.e. digits after the decimal point (optional; defaults to `4`)
 *
 * @returns {number} a number with fixed precision
 */
export const toFixedFloat = (input: string | number, precision: number = 4): number => {
  const output = typeof input == 'number'
    ? input
    : parseFloat(input);

  return Number(output.toFixed(precision));
};

/**
 * packAtlasData
 * @desc packs the object's Id, SpecialityId and Active state - `uint16_t`, `uint8_t` and a `uint8_t`
 *       respectively - into a `uint32_t`
 *
 * @param {number}         id          a `uint16_t` describing the id of the object
 * @param {number}         speciality  the SpecialityId, represented as a `uint8_t`
 * @param {boolean|number} active      a binary or boolean value specifying whether it's selected
 *
 * @returns {number} a bit packed representation of the inputs
 */
export const packAtlasObject = (id: number, speciality: number, active: boolean | number): number => {
  const state = typeof active === 'number'
    ? active
    : (active ? 1 : 0);

  return ((id & 0xFFFF) << 16) | ((speciality << 8) & 0xFF00) | (state & 0x00FF);
}

/**
 * unpackAtlasObject
 * @desc unpacks the atlas object
 *
 * @param {number} input the bit packed data
 *
 * @returns {Partial<AtlasPacked>} i.e. an Id, SpecialityId, and an Active state
 */
export const unpackAtlasObject = (input: number): Partial<AtlasPacked> => {
  const state = input & 0x000000FF;
  return {
    Id: (input >> 16) & 0xFFFF,
    SpecialityId: (input >> 8) & 0x0000FF,
    Active: state === 1,
  }
};

/**
 * packAtlasColRef
 * @desc packs a hexadecimal colour and a category id into a single `uint32_t` integer
 *
 * @param {number} hex      the hex colour code, represented as a packed `uint24_t` (3x `uint8_t` representing `rgb`)
 * @param {number} category the category id, represented as a `uint8_t`
 *
 * @returns {number} a bit packed representation of both inputs
 */
export const packAtlasColRef = (hex: number, category: number): number => {
  return ((category & 0xFF) << 24) | (hex & 0xFFFFFF);
};

/**
 * unpackAtlasColRef
 * @desc unpacks the `Hex` & `MapId` values packed into a `uint32_t`
 *
 * @param {number} input the `Reference` value input (i.e. some bit packed `Hex` & `mapId`)
 *
 * @returns {Partial<AtlasSpeciality>} i.e. a `Hex` colour code and a `MapId` of
 *                                     a speciality; represented by a packed `uint24_t`
 *                                     and a single `uint8_t`
 */
export const unpackAtlasColRef = (input: number): Partial<AtlasSpeciality> => {
  const hex = (input & ((1 << 24) - 1)) & 0xFFFFFF;
  const ref = (input >> 24) & 0xFF;
  return { Hex: hex, MapId: ref };
};

/**
 * computeAxisScale
 * @desc computes the axis scale & ticks given the dataset's min/max boundary, and an optional
 *       desired number of steps
 *
 * @param {number}     min          lower bounds of the input value(s)
 * @param {number}     max          upper bounds of the input value(s)
 * @param {number|any} desiredSteps the desired number of steps (optional; defaults to 10)
 *
 * @returns {AlAxisScale} an object specifying the axis scale
 */
export const computeAxisScale = (min: number, max: number, desiredSteps: number = 10): AlAxisScale => {
  const displacement = max - min;
  const epsilon = displacement / 1e6;
  max += epsilon;
  max -= epsilon;

  const approxStep = displacement / Math.max(desiredSteps - 1, 1);
  const powerStep = Math.pow(10, -Math.floor(Math.log10(Math.abs(approxStep))));

  let step = Workspace.AtlasAxisScaling.find((x) => x >= powerStep*approxStep);
  step = typeof step !== 'undefined'
    ? step
    : approxStep;

  step /= powerStep;

  const invStep = 1 / step;
  return {
    Min: Math.floor(min * invStep) * step,
    Max: Math.ceil(max * invStep) * step,
    Step: step,
  };
};

/**
 * binarySearch
 * @desc generic binary search
 *
 * @param {Array<T>}          arr            some target array
 * @param {V}                 obj            some object to find within the target array
 * @param {CompareFunc<V, T>} comparator     a comparator function
 *
 * @returns {number} either...
 *    1. Some positive integer describing the index of the object found within the array
 *    2. OR; a negative integer whose bitwise complement describes the index at which the object would be positioned
 */
export const binarySearch = <T, V>(arr: T[], obj: V, comparator: (a: V, b: T) => number): number => {
  let comp     = 0,
      left     = 0,
      right    = arr.length - 1,
      midpoint = 0;

  while (left <= right) {
    // i.e. ⌊ 0.5*(left + right) ⌋
    midpoint = (left + right) >>> 1;

    // compare & then bit hack to get the integer's sign (assuming 32 bit here)
    //  - i.e. `sgn(x)`
    //  - see ref @ https://graphics.stanford.edu/~seander/bithacks.html#CopyIntegerSign
    //
    comp = comparator(obj, arr[midpoint]);
    comp = Number(comp != 0) | (comp >> 31);

    switch (comp) {
      case -1: {
        right = --midpoint;
      } break;

      case 1: {
        left = ++midpoint;
      } break;

      default:
        return midpoint;
    }
  }

  return ~left;
};


/**
 * binaryInsert
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
  let comp     = 0,
      left     = 0,
      right    = arr.length - 1,
      midpoint = 0;

  loop:
  while (left <= right) {
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
