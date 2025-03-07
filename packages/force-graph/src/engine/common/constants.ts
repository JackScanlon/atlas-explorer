export const
  /**
   * @desc primitive object type names
   * @see https://developer.mozilla.org/en-US/docs/Glossary/Primitive
   */
  PRIMITIVE_TYPES: Array<Exclude<PrimitiveTypeNames, 'symbol'>> = ['string', 'number', 'bigint', 'boolean', 'undefined', 'null'],
  /**
   * @desc Constant ref to 0.5π
   * @type {number}
   * @constant
   */
  PI_HALF: number = Math.PI * 0.5,
  /**
   * @desc Ratio between circumference & radius of a circle, i.e. 2π
   * @type {number}
   * @constant
   */
  TAU: number = Math.PI * 2,
  /**
   * @desc Constant to convert degrees to radians
   * @type {number}
   * @constant
   */
  DEG2RAD: number = Math.PI * 2 / 360,
  /**
   * @desc Constant to convert radians to degrees
   * @type {number}
   * @constant
   */
  RAD2DEG: number = 1 / (Math.PI * 2 / 360),
  /**
   * @desc some tiny value for FP approximation
   * @type {number}
   * @constant
   */
  EPSILON: number = 1e-6,
  /**
   * @desc some less tiny value for FP approximation
   * @type {number}
   * @constant
   */
  EPSILON_LP: number = 1e-4,
  /**
   * @desc max int32 size, used for logic similar to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger|Number.isSafeInteger}
   * @type {number}
   * @constant
   */
  SAFE_I32: number = Math.pow(2, 31),
  /**
   * @desc Max supoorted powers-of-two (POT) size of
   *       textures
   *
   *       For POT reference, see the following:
   *         - https://www.khronos.org/opengl/wiki/texture
   * @type {number}
   * @constant
   */
  MAX_POT_SIZE: number = 4096;
