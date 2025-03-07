import { GL } from '@engine/core/webgl/constants';
import { BufferObject } from '@engine/core/resources';
import type { TypedArray } from '@engine/core/types';

/**
 * Class wrapping a WebGL Buffer resource
 *
 * @class
 * @constructor
 * @extends BufferObject
 */
export class WebGLBufferObject extends BufferObject {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = WebGLBufferObject.name;

  /**
   * @desc the buffer usage hint; one of `GL.STATIC_DRAW | GL.DYNAMIC_DRAW`
   * @type {number}
   * @readonly
   */
  declare public readonly usage: GL.STATIC_DRAW | GL.DYNAMIC_DRAW;

  /**
   * @desc the buffer target hint; one of `GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER | GL.UNIFORM_BUFFER`
   * @type {number}
   * @readonly
   */
  declare public readonly target: GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER | GL.UNIFORM_BUFFER;

  /**
   * @desc some WebGLBuffer object assoc. with this instance
   * @type {WebGLBuffer}
   * @protected
   */
  declare protected _resource: WebGLBuffer;

  /**
   * @desc the WebGL2RenderingContext device assoc. with this instance
   * @type {WebGL2RenderingContext}
   * @protected
   * @readonly
   */
  declare protected readonly _handle: WebGL2RenderingContext;

  /**
   * @todo need to use an intermediate type instead of raw GL params
   *
   * @param {WebGL2RenderingContext} handle                   the WebGL2 context
   * @param {number}                 [target=GL.ARRAY_BUFFER] the buffer target; one of `GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER | GL.UNIFORM_BUFFER`
   * @param {number}                 [usage=GL.STATIC_DRAW]   the buffer usage hint; one of `GL.STATIC_DRAW | GL.DYNAMIC_DRAW`
   * @param {TypedArray}             [data]                   optionally specify the initialisation data
   */
  public constructor(
    handle: WebGL2RenderingContext,
    target: GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER | GL.UNIFORM_BUFFER = GL.ARRAY_BUFFER,
    usage: GL.STATIC_DRAW | GL.DYNAMIC_DRAW = GL.STATIC_DRAW,
    data?: TypedArray
  ) {
    super(handle, target, usage, handle.createBuffer()!);

    if (data) {
      this.write(data);
    }
  }

  /**
   * @desc {@link WebGLBufferObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is WebGLBufferObject} specifying whether the input is a {@link WebGLBufferObject}
   */
  public static Is(obj: unknown): obj is WebGLBufferObject {
    return obj instanceof WebGLBufferObject;
  }

  /**
   * @returns {WebGLBuffer} retrieves the buffer contained by this inst
   */
  public override get resource(): WebGLBuffer {
    return this._resource;
  }

  /**
   * @desc binds the buffer to the render pass
   *
   * @returns {this}
   */
  public bind(): this {
    this._handle.bindBuffer(this.target, this._resource);
    return this;
  }

  /**
   * @desc unbinds the buffer from the render pass
   *
   * @returns {this}
   */
  public unbind(): this {
    this._handle.bindBuffer(this.target, null);
    return this;
  }

  /**
   * @desc writes data to the buffer
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferSubData
   *
   * @param {TypedArray} data                        some typed array buffer view
   * @param {number}     [size=data.byteLength]      length in bytes of the typed array, see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/byteLength|TypedArray.byteLength}; defaults to `data.byteLength`
   * @param {number}     [srcOffset=0]               start offset, in bytes, of this typed array from the start of its array buffer, used to extract a specific section of this data; defaults to `0`
   * @param {number}     [dstOffset=data.byteOffset] the offset, in bytes, of this typed array from the start of its array buffer, used to extract a specific section of data - see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/byteOffset|TypedArray.byteOffset}; defaults to `data.byteOffset`
   *
   * @returns {this}
   */
  public write(
    data: TypedArray,
    size: number = data.byteLength,
    srcOffset: number = 0,
    dstOffset: number = data.byteOffset
  ): this {
    this.bind();

    const gl = this._handle;
    const dstUsage = gl.getBufferParameter(this.target, GL.BUFFER_USAGE);
    const dstByteLength = gl.getBufferParameter(this.target, GL.BUFFER_SIZE);
    if (dstOffset === 0 && (data.byteLength > dstByteLength || this.usage !== dstUsage)) {
      gl.bufferData(this.target, data, this.usage);
      return this;
    }

    const invBytePerElem = 1 / data.BYTES_PER_ELEMENT;
    gl.bufferSubData(
      this.target,
      dstOffset,
      data,
      srcOffset*invBytePerElem,
      size*invBytePerElem,
    );

    return this;
  }

  /**
   * @desc some cleanup method to destroy this instance
   */
  public dispose(): void {
    this._handle.deleteBuffer(this._resource);
  }
};
