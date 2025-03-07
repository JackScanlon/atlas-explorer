import { WebGLDevice } from '@engine/core';
import { PRIMITIVE_TYPES } from './constants';

declare global {
  /**
   * @desc global window element used to measure device pixel ratio on safari devices
   * @see https://bugs.webkit.org/show_bug.cgi?id=124862
   */
  interface Window {
    explorer__ZoomElement: any;
  }

  /**
   * @desc devices are attached to the canvas gl context
   * @see {@link WebGLDevice}
   */
  interface WebGL2RenderingContext {
    device?: WebGLDevice;
  }
}

/**
 * @desc describes the device pixel ratio as queried by `matchMedia()`
 */
export interface PixelRatioMediaQuery {
  ratio?: number;
  fixed?: string;
  media?: MediaQueryList;
}

/**
 * @desc describes this client's browser
 */
// prettier-ignore
export enum BrowserType {
  NoBrowser      = -1,
  UnknownBrowser =  0,
  Chrome         =  1,
  Chromium       =  2,
  Firefox        =  3,
  Safari         =  4,
  Edge           =  5,
  Opera          =  6,
  IE             =  7,
}

/**
 * @desc an enum describing the requested by a {@link Transform3d}
 * @note
 *  | Name       | Info                                                               | Value |
 *  |------------|--------------------------------------------------------------------|-------|
 *  | None       | No update needed                                                   |     0 |
 *  | TRS        | Position, rotation or scale has changed                            |     1 |
 *  | Transform  | Transform component has changed, requires Matrix update            |     2 |
 *  | Appearance | Object rendering/appearance props have been varied                 |     4 |
 *  | Hierarchy  | Position in scene hierarchy has been varied                        |     8 |
 *  | Rendering  | Render state changed; mostly used for camera(s)                    |    16 |
 *  | All        | The transform `needsUpdate` property set to `true` flagged by user |    31 |
 * @type {enum}
 */
// prettier-ignore
export enum TransformUpdate {
  //                             | Binary   | Decimal |
  //                             |----------|---------|
  None       =             0, // | 00000000 |       0 |
  TRS        =        1 << 0, // | 00000001 |       1 |
  Transform  =        1 << 1, // | 00000001 |       2 |
  Appearance =        1 << 2, // | 00000010 |       4 |
  Hierarchy  =        1 << 4, // | 00000100 |       8 |
  Rendering  =        1 << 5, // | 00001000 |      16 |
  All        = 1 | 2 | 4 | 8, // | 00011111 |      31 |
}

/**
 * @desc {@link HTMLCanvasElement} type-guard
 *
 * @param {unknown} obj some object to consider
 *
 * @returns {obj is HTMLCanvasElement} specifying whether the input is a {@link HTMLCanvasElement}
 */
export const isHTMLCanvasElement = (obj: unknown): obj is HTMLCanvasElement => {
  return typeof HTMLCanvasElement !== 'undefined' && obj instanceof HTMLCanvasElement;
};

/**
 * @desc {@link OffscreenCanvas} type-guard
 *
 * @param {unknown} obj some object to consider
 *
 * @returns {obj is OffscreenCanvas} specifying whether the input is a {@link OffscreenCanvas}
 */
export const isOffscreenCanvas = (obj: unknown): obj is OffscreenCanvas => {
  return typeof OffscreenCanvas !== 'undefined' && obj instanceof OffscreenCanvas;
};

/**
 * @desc templated type-guard
 *
 * @param {unknown} obj  some input value
 * @param {string}  type the name of the desired type to guard
 *
 * @returns {obj is U} specifying whether the object is the type specified
 */
export const isTypedValue = <T extends string, U extends `${T}`>(obj: unknown, type: T): obj is U => {
  if (PRIMITIVE_TYPES.findIndex((k: any) => k == type) > -1) {
    return typeof obj === type;
  } else if (type.startsWith('Array')) {
    return Array.isArray(obj);
  }

  switch (type) {
    case 'Object':
      return obj instanceof Object;
    case 'Symbol':
      return obj instanceof Symbol;
    case 'Error':
      return obj instanceof Error;
    default:
      return false;
  }
};

/**
 * @desc deterermines whether some obj has
 *
 * @param obj       some object to test
 * @param prop      some property to
 * @param [type]    optionally specify the expected type
 * @param [allowed] optionally specify the expected values
 *
 * @returns obj[prop] is U
 */
export const hasTypedProperty = <Obj, P extends string, T extends string, U extends `${T}`>(
  obj: Obj,
  prop: P,
  type?: T,
  allowed?: any
): obj is Obj & Record<P, U> => {
  if (!(obj instanceof Object)) {
    return false;
  } else if (!(prop in obj)) {
    return false;
  }

  const test = obj as { [key: string]: unknown };
  if (typeof type !== 'undefined' && !isTypedValue(test?.[prop], type)) {
    return false;
  }

  if (Array.isArray(allowed)) {
    return allowed.includes(test?.[prop]);
  } else if (typeof allowed !== 'undefined') {
    return test?.[prop] === allowed;
  }

  return true;
};
