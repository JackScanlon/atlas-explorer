import { Texture } from '@engine/core/portable/Texture';
import { RenderBufferType, type ITexture, type IFrameBuffer } from '@engine/core/types';

/**
 * @desc default properties assoc. with this instance; used to fulfil props requirements on construction
 * @type {IFrameBuffer}
 * @static
 */
const DefaultRenderTrgProps: Partial<Omit<IFrameBuffer, 'textures'> & ITexture> = {
  type: 'ubyte',
  target: 'texture2d',
  width: 1,
  height: 1,
  format: 'rgba',
  internalFormat: 'rgba8',
  renderBufferType: RenderBufferType.None,
  attachments: 1,
  wrapU: 'clamp',
  wrapV: 'clamp',
  wrapW: 'clamp',
  magFilter: 'linear',
  minFilter: 'linear',
};

/**
 * Class representing some buffer in which we can draw pixels
 *
 * @class
 * @constructor
 */
export class RenderTarget implements IFrameBuffer {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = RenderTarget.name;

  /**
   * @desc internal ID counter
   * @type {number}
   * @static
   */
  private static _ref: number = 0;

  /**
   * @desc this instance's internal ID
   * @type {number}
   * @readonly
   */
  public readonly id!: number;

  /**
   * @desc specifies whether this this render target needs to be updated
   * @type {boolean}
   */
  public needsUpdate: boolean = true;

  /**
   * @desc an array of tex/colour attachments
   * @see {@link Texture}
   * @type {Array<Texture>}
   * @readonly
   */
  public readonly textures: Array<Texture>;

  /**
   * @desc describes this FBO's render buffer type
   * @type {RenderBufferType}
   */
  public readonly renderBufferType!: RenderBufferType;

  /**
   * @desc internal fbo width ref
   * @type {number}
   * @private
   */
  private _width: number = 0;

  /**
   * @desc internal fbo height ref
   * @type {number}
   * @private
   */
  private _height: number = 0;

  /**
   * @param {Partial<Omit<ITexture, 'textures'> & ITexture>} [props] specify this inst's constructor props; defaults from {@link DefaultRenderTrgProps}
   */
  public constructor(props?: Partial<Omit<IFrameBuffer, 'textures'> & ITexture>) {
    props = props ?? { };

    const opts = { ...DefaultRenderTrgProps, ...props } as Omit<IFrameBuffer, 'textures'> & ITexture;
    this.id = RenderTarget._ref++;
    this._width = opts.width;
    this._height = opts.height;
    this.renderBufferType = opts.renderBufferType;
    this.textures = Array.from({ length: opts.attachments }, () => {
      return new Texture({
        image: null,
        type: opts.type,
        format: opts.format,
        internalFormat: opts.internalFormat,
        target: opts.target,
        magFilter: opts.magFilter,
        minFilter: opts.minFilter,
        width: opts.width,
        height: opts.height,
        depth: 0,
        wrapU: opts.wrapU,
        wrapV: opts.wrapV,
        wrapW: opts.wrapW,
        mipmaps: false,
        level: 0,
        flipY: false,
        anisotropy: 0,
        alignment: props.alignment ?? 1,
      })
    });
  }

  /**
   * @desc {@link RenderTarget} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is RenderTarget} specifying whether the input is a {@link RenderTarget}
   */
  public static Is(obj: unknown): obj is RenderTarget {
    return obj instanceof RenderTarget;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'RenderTarget';
  }

  /**
   * @note resizing the render target will require a new FBO to be instantiated
   *
   * @returns {number} the width of this render target
   */
  public get width(): number {
    return this._width;
  }

  /**
   * @note resizing the render target will require a new FBO to be instantiated
   *
   * @param {number} value the new width of this render target
   */
  public set width(value: number) {
    if (value !== this._width) {
      this._width = value;
      this.needsUpdate = true;
    }
  }

  /**
   * @note resizing the render target will require a new FBO to be instantiated
   *
   * @returns {number} the height of this render target
   */
  public get height(): number {
    return this._height;
  }

  /**
   * @note resizing the render target will require a new FBO to be instantiated
   *
   * @param {number} value the new height of this render target
   */
  public set height(value: number) {
    if (value !== this._height) {
      this._height = value;
      this.needsUpdate = true;
    }
  }

  /**
   * @returns {number} returns the num. of colour/tex attachments
   */
  public get attachments(): number {
    return this.textures.length;
  }

  /**
   * @desc compares equality of this instance's class name to some given class name
   *
   * @param {string} className some class name input
   *
   * @returns {boolean} evaluates to `true` if the class names are equal
   */
  public isA(className: string): boolean {
    return this.ClassName === className;
  }

  /**
   * @desc sets the w/h of this render target
   * @note resizing the render target will require a new FBO to be instantiated
   *
   * @param {number} [w] optionally specify the new width of this render target
   * @param {number} [h] optionally specify the new height of this render target
   *
   * @returns {this}
   */
  public setSize(w: number, h: number): this {
    if (typeof w === 'number' && w !== this._width) {
      this._width = w;
      this.needsUpdate = true;
    }

    if (typeof h === 'number' && h !== this._height) {
      this._height = h;
      this.needsUpdate = true;
    }

    return this;
  }

  /**
   * @desc destroys this inst & its assoc. resources
   */
  public dispose(): void {
    // TODO: destroy assoc. resources? signal renderer?

  }
};
