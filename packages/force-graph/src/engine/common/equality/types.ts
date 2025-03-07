/**
 * @desc limited prim types
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Primitive
 */
type PrimitiveKeys = Exclude<PrimitiveTypeNames, 'null'>;

/**
 * @desc hashmap of primitive types
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Primitive
 */
const MAP_PRIMITIVES: Record<PrimitiveKeys, boolean> = {
  'string': true,
  'number': true,
  'symbol': true,
  'bigint': true,
  'boolean': true,
  'undefined': true,
};

/**
 * @desc string descriptor of a function's likely subtype
 * @see
 *  - {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions|Conventional, strict, arrow functions}
 *  - {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function|Async functions}
 *  - {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*|Generator functions}
 *  - {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_classes|ES5 / ES6 class constructors}
 * @type {string}
 */
export type FuncSubtype =
  | 'Func'
  | 'AsyncFunc'
  | 'ArrowFunc'
  | 'AsyncArrowFunc'
  | 'GenFunc'
  | 'AsyncGenFunc'
  | 'ConstructorES5'
  | 'ConstructorES6';

/**
 * @desc a function-like object that does not describe a {@link ClassLike} object
 */
export type FuncLike = Function;

/**
 * @desc an array-like object
 */
export type ArrayLike = Array<unknown>;

/**
 * @desc a class-like object, describing either (a) the class itself or (b) an instance of a class
 */
export type ClassLike = object | Function;

/**
 * @desc some object with key-value pair properties
 */
export type ObjectLike = Record<PropertyKey, unknown>;

/**
 * @desc primitive object type
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Primitive
 */
export type PrimitiveLike = string | number | symbol | bigint | boolean | undefined | null;

/**
 * @desc some `ArrayBuffer` object
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
 */
export type ArrayBufferViewLike = NodeJS.ArrayBufferView;

/**
 * @desc `null` type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is null} specifying whether the input is a `null`
 */
export const isNull = (object: unknown): object is null => {
  return object === null;
};

/**
 * @desc {@link ObjectLike} type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is ObjectLike} specifying whether the input is `ObjectLike`
 */
export const isObjectLike = (object: unknown): object is ObjectLike => {
  return !isNull(object) && typeof object === 'object' || (typeof object === 'function' && !isFuncLike(object));
};

/**
 * @desc {@link ClassLike} type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is ClassLike} specifying whether the input is `ClassLike`
 */
export const isClassLike = (object: unknown): object is ClassLike => {
  if (object === null || (typeof object !== 'object' && typeof object !== 'function')) {
    return false;
  }

  let proto = Object.getPrototypeOf(object);
  if (Object.prototype === proto) {
    return false;
  } else if (object?.constructor === Function && !object?.hasOwnProperty('prototype')) {
    return false;
  }

  proto = 'prototype' in object ? object?.prototype : proto;
  if (Object.getOwnPropertyNames(proto).length > 1) {
    return true;
  } else if (typeof proto.constructor === 'function' && proto.constructor.toString().startsWith('class')) {
    return true;
  }

  const desc = Object.getOwnPropertyDescriptors(proto);
  if (desc && 'constructor' in desc && typeof desc.constructor === 'object') {
    const obj = desc.constructor as Object;
    const val = 'value' in obj && typeof obj.value === 'function'
      ? obj.value.toString()
      : undefined;

    if (!!val) {
      return val.includes('extends') || val.startsWith('[class');
    }
  }

  return false;
};

/**
 * @desc {@link FuncLike} type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is FuncLike} specifying whether the input is `FuncLike`
 */
export const isFuncLike = (object: unknown): object is FuncLike => {
  return typeof object === 'function' && !isClassLike(object);
};

/**
 * @desc {@link ArrayLike} type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is ArrayLike} specifying whether the input is `ArrayLike`
 */
export const isArrayLike = (object: unknown): object is ArrayLike => {
  return Array.isArray(object);
};

/**
 * @desc `ArrayBuffer` type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is ArrayBuffer} specifying whether the input is `ArrayBuffer`
 */
export const isArrayBuffer = (object: unknown): object is ArrayBuffer => {
  return object instanceof ArrayBuffer;
};

/**
 * @desc {@link ArrayBufferViewLike} type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is ArrayBufferViewLike} specifying whether the input is `ArrayBufferViewLike`
 */
export const isArrayBufferViewLike = (object: unknown): object is ArrayBufferViewLike => {
  return ArrayBuffer.isView(object);
};

/**
 * @desc {@link PrimitiveLike} type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is PrimitiveLike} specifying whether the input is `PrimitiveLike`
 */
export const isPrimitiveLike = (object: unknown): object is PrimitiveLike => {
  return isNull(object) || !!MAP_PRIMITIVES[typeof object as PrimitiveKeys];
};

/**
 * @desc `Date` type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is Date} specifying whether the input is a `Date` object
 */
export const isDate = (object: unknown): object is Date => {
  return typeof object === 'object' && object instanceof Date && Object.getPrototypeOf(this).constructor.name === 'Date';
};

/**
 * @desc `RegExp` type-guard
 *
 * @param {unknown} object some object to consider
 *
 * @returns {object is isRegex} specifying whether the input is a `RegExp` object
 */
export const isRegex = (object: unknown): object is RegExp => {
  return typeof object === 'object' && object instanceof RegExp && Object.getPrototypeOf(this).constructor.name === 'RegExp';
};

/**
 * @desc best-guess at a function's underlying subtype
 * @see {@link FuncSubtype}
 *
 * @param {unknown} object
 *
 * @returns {Nullable<FuncSubtype>} string descriptor of this func's subtype, if applicable; otherwise returns null
 */
export const getFunctionType = (object: unknown): FuncSubtype | null => {
  if (typeof object !== 'function') {
    return null;
  }

  let proto = Object.getPrototypeOf(object);
  if (!proto || Object.prototype === proto) {
    return null;
  }

  switch (object.constructor.name) {
    case 'Function': {
      if (object.toString().startsWith('class')) {
        return 'ConstructorES6';
      }

      const desc = Object.getOwnPropertyDescriptor(object, 'prototype');
      proto = 'prototype' in object ? object?.prototype : proto;
      if (!!desc && desc.writable) {
        return Object.getOwnPropertyNames(proto).length < 2 ? 'Func' : 'ConstructorES5';
      }
    } break;

    case 'AsyncFunction':
      return object.toString().startsWith('async function') ? 'AsyncFunc' : 'AsyncArrowFunc';

    case 'GeneratorFunction':
      return 'GenFunc';

    case 'AsyncGeneratorFunction':
      return 'AsyncGenFunc';

    default:
      break;
  }

  return 'ArrowFunc';
};
