import { WebGLBufferObject } from './WebGLBufferObject';
import { UniformBufferObject } from '@engine/core/resources';
import type { WebGLPipelineUniform } from './WebGLRenderPipeline';

/**
 * A class wrapping a WebGL2 UBO
 *
 * @class
 * @constructor
 * @extends WebGLBufferObject
 * @implements {UniformBufferObject}
 */
export class WebGLUniformBufferObject extends WebGLBufferObject implements UniformBufferObject {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = WebGLUniformBufferObject.name;

  /**
   * @desc the name of this uniform buffer obj
   * @type {string}
   * @readonly
   */
  public readonly name!: string;

  /**
   * @desc the data assoc. with this ubo
   * @type {Float32Array}
   * @readonly
   */
  public readonly data!: Float32Array;

  /**
   * @desc the uniform block index
   * @type {number}
   * @readonly
   */
  public readonly blockIndex!: number;

  /**
   * @desc constructs a new UniformBufferObject
   * @param {WebGL2RenderingContext} gl         some WebGL2 rendering context
   * @param {string}                 name       the name of this uniform
   * @param {number}                 byteLength the byte length of this uniform's buffer
   * @param {number}                 blockIndex the uniform block index
   */
  public constructor(gl: WebGL2RenderingContext, name: string, byteLength: number, blockIndex: number) {
    const data = new Float32Array(byteLength / Float32Array.BYTES_PER_ELEMENT);
    super(gl, gl.UNIFORM_BUFFER, gl.DYNAMIC_DRAW, data);

    this.name = name;
    this.data = data;
    this.blockIndex = blockIndex;
  }

  /**
   * @desc {@link WebGLUniformBufferObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is WebGLUniformBufferObject} specifying whether the input is a {@link WebGLUniformBufferObject}
   */
  public static Is(obj: unknown): obj is WebGLUniformBufferObject {
    return obj instanceof WebGLUniformBufferObject;
  }

  /**
   * @desc binds a buffer to the given binding target at some index
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/bindBufferBase
   *
   * @param {number} [index=this.blockIndex] specifying the binding point index for this target at which to bind
   *
   * @returns {this}
   */
  public bindBase(index?: number): this {
    this._handle.bindBufferBase(this.target, index ?? this.blockIndex, this.resource);
    return this;
  }

  /**
   * @desc sets this instance's buffer to the given value
   *
   * @param {WebGLPipelineUniform} uniform the uniform defined by the render pipeline
   * @param {any}                  value   some new value
   *
   * @returns {this}
   */
  public update(uniform: WebGLPipelineUniform, value: any): this {
    let len!: number;
    if (typeof value === 'number') {
      len = 1;
      this.data[uniform.offset] = value;
    } else {
      len = value.length;
      this.data.set(value, uniform.offset);
    }

    const byteOffset = uniform.offset * this.data.BYTES_PER_ELEMENT;
    this.write(this.data, length * this.data.BYTES_PER_ELEMENT, byteOffset, byteOffset);
    return this;
  }
};
