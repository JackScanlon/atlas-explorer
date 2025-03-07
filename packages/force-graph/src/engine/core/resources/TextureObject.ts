import { Resource } from './Resource';
import type { ImageReference, ITexture, TextureTarget } from '@engine/core/types';

/**
 * An abstract class representing a WebGL/WebGPU texture resource
 *
 * @class
 * @constructor
 * @abstract
 */
export abstract class TextureObject extends Resource {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = TextureObject.name;

  /**
   * @desc pipeline resource id
   * @type {number}
   */
  public readonly textureId: number;

  /**
   * @desc some gpu texture resource
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
   * @param {unknown} handle the graphics context
   */
  public constructor(handle: unknown, resource: unknown, texId: number) {
    super(handle, resource);

    this.textureId = texId;
  }

  /**
   * @desc {@link TextureObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is TextureObject} specifying whether the input is a {@link TextureObject}
   */
  public static Is(obj: unknown): obj is TextureObject {
    return obj instanceof TextureObject;
  }

  /**
   * @param {TextureTarget} _target specifies the dimension/target of the texture
   *
   * @returns {number} some WebGL gpu texture type
   */
  public static GetTextureTarget(_target: TextureTarget): number {
    return -1;
  }

  /**
   * @param {ImageReference|null} [data] some input data
   *
   * @returns {boolean} specifies whether this tex data can be flipped using the gpu ctx
   */
  public static IsFlippable(data?: ImageReference | null): boolean {
    return (
      (data instanceof HTMLElement) ||
      (data instanceof ImageData) ||
      (data instanceof ImageBitmap)
    );
  }

  /**
   * @desc updates some texture target resource
   * @abstract
   *
   * @param {...*} args varargs; see inherited cls
   *
   * @returns {this}
   */
  public abstract setTexture(...args: any[]): this;

  /**
   * @desc binds the texture to the render pass
   *
   * @param {Required<ITexture>} tex
   *
   * @returns {this}
   */
  public abstract bind(tex: ITexture): this;

  /**
   * @desc unbinds the texture from the render pass
   * @abstract
   *
   * @returns {this}
   */
  public abstract unbind(): this;

  /**
   * @desc some cleanup method to destroy this instance
   * @abstract
   */
  public abstract dispose(): void;
};
