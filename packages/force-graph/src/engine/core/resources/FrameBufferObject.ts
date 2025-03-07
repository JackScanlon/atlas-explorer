import { Resource } from './Resource';
import { TextureObject } from './TextureObject';
import type { FrameBufferProps, IFrameBuffer, ITexture, RenderBufferType } from '@engine/core/types';

/**
 * An abstract class wrapping a GPU Frame Buffer resource
 *
 * @class
 * @constructor
 * @abstract
 * @extends Resource
 */
export abstract class FrameBufferObject extends Resource {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = FrameBufferObject.name;

  /**
   * @desc specifying the colour/tex attachment format in this FBO
   * @type {number}
   */
  public internalFormat!: number;

  /**
   * @desc this frame buffer's width
   * @type {number}
   */
  public width!: number;

  /**
   * @desc this frame buffer's height
   * @type {number}
   */
  public height!: number;

  /**
   * @desc describes this FBO's render buffer type
   * @type {RenderBufferType}
   */
  public readonly renderBufferType!: RenderBufferType;

  /**
   * @desc bound & active texture draw buffer IDs
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawBuffers
   * @type {Array<number>}
   * @readonly
   */
  public readonly drawBufferTargets: Array<number> = [];

  /**
   * @desc some frame buffer object assoc. with this instance
   * @type {unknown}
   * @protected
   */
  declare protected _resource: unknown;

  /**
   * @desc some assoc. render buffer containing an img/src
   * @type {unknown}
   */
  protected _renderBuffer?: unknown;

  /**
   * @desc the gpu device assoc. with this instance
   * @type {unknown}
   * @protected
   * @readonly
   */
  declare protected readonly _handle: unknown;

  /**
   * @note see inherited classes
   * @param {unknown} handle   the graphics context
   * @param {unknown} resource the buffer assoc. with this inst
   */
  public constructor(handle: unknown, resource: unknown, opts: FrameBufferProps) {
    super(handle, resource);

    this.width = opts.width;
    this.height = opts.height;
    this.renderBufferType = opts.renderBufferType;
  }

  /**
   * @returns {unknown} the render buffer assoc. with this FBO
   */
  public get renderBuffer(): unknown {
    return this._renderBuffer;
  }

  /**
   * @desc {@link FrameBufferObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is FrameBufferObject} specifying whether the input is a {@link FrameBufferObject}
   */
  public static Is(obj: unknown): obj is FrameBufferObject {
    return obj instanceof FrameBufferObject;
  }

  /**
   * @desc binds the frame buffer to the render pass
   * @abstract
   *
   * @returns {this}
   */
  public abstract bind(target: number): this;

  /**
   * @desc unbinds the frame buffer from the render pass
   * @abstract
   *
   * @returns {this}
   */
  public abstract unbind(target: number): this;

  /**
   * @desc attempts to update this frame buffer's dependencies
   *
   * @param {IFrameBuffer}                     props    some assoc. fbo / render target props
   * @param {WeakMap<ITexture, TextureObject>} textures a map of textures known by the renderer
   *
   * @returns {this}
   */
  public abstract update(props: IFrameBuffer, textures: WeakMap<ITexture, TextureObject>): this;

  /**
   * @desc some cleanup method to destroy this instance
   * @abstract
   */
  public abstract dispose(): void;
};
