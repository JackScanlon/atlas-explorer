import { Resource } from './Resource';
import type { TypedArray } from '@engine/core/types';

/**
 * An abstract class wrapping a GPU Buffer resource
 *
 * @class
 * @constructor
 * @abstract
 * @extends Resource
 */
export abstract class BufferObject extends Resource {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = BufferObject.name;

  /**
   * @desc the buffer usage hint
   * @type {number}
   * @readonly
   */
  public readonly usage!: number;

  /**
   * @desc the buffer target hint
   * @type {number}
   * @readonly
   */
  public readonly target!: number;

  /**
   * @desc some buffer object assoc. with this instance
   * @type {unknown}
   * @protected
   */
  declare protected _resource: unknown;

  /**
   * @desc the gpu device assoc. with this instance
   * @type {unknown}
   * @protected
   * @readonly
   */
  declare protected readonly _handle: unknown;

  /**
   * @note see inherited classes
   * @param {unknown} handle     the graphics context
   * @param {number}  target     the buffer target; one of `GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER | GL.UNIFORM_BUFFER`
   * @param {number}  usage      the buffer usage hint; one of `GL.STATIC_DRAW | GL.DYNAMIC_DRAW`
   * @param {unknown} [resource] the buffer assoc. with this inst
   */
  public constructor(handle: unknown, target: number, usage: number, resource?: unknown) {
    super(handle, resource);

    this.usage = usage;
    this.target = target;
  }

  /**
   * @desc {@link BufferObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is BufferObject} specifying whether the input is a {@link BufferObject}
   */
  public static Is(obj: unknown): obj is BufferObject {
    return obj instanceof BufferObject;
  }

  /**
   * @desc binds the buffer to the render pass
   * @abstract
   *
   * @returns {this}
   */
  public abstract bind(): this;

  /**
   * @desc unbinds the buffer from the render pass
   * @abstract
   *
   * @returns {this}
   */
  public abstract unbind(): this;

  /**
   * @desc writes data to the buffer; see implementation in inherited classes for more details
   * @note
   *  | Device | Methods         | Resource |
   *  |--------|-----------------|----------|
   *  | webgpu | `writeBuffer`   | {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeBuffer|MDN}      |
   *  | webgl  | `bufferData`    | {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData|MDN}      |
   *  | webgl  | `bufferSubData` | {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferSubData|MDN}      |
   * @abstract
   *
   * @param {TypedArray} data      some typed array buffer view
   * @param {number}        size      length in bytes of the typed array, see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/byteLength|TypedArray.byteLength}
   * @param {number}        srcOffset start offset, in bytes, of this typed array from the start of its array buffer, used to extract a specific section of this data; defaults to `0`
   * @param {number}        dstOffset the offset, in bytes, of this typed array from the start of its array buffer, used to extract a specific section of data - see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/byteOffset|TypedArray.byteOffset};
   *
   * @returns {this}
   */
  public abstract write(data: TypedArray, size: number, srcOffset: number, dstOffset: number): this;

  /**
   * @desc some cleanup method to destroy this instance
   * @abstract
   */
  public abstract dispose(): void;
};
