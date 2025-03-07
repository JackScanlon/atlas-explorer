import { ExplorerError } from '@engine/common';

import {
  isTypedBuffer,
  type ITexture,
  type ImageReference,
  type TextureTarget,
  type TextureFilter,
  type TextureWrap,
  type ImageType,
  type TypedArray,
  type TextureFormat,
  type TextureInternalFmt,
  type TextureType,
} from '@engine/core/types';

/**
 * @desc default constructor props for {@link Texture}
 * @see {@link ITexture}
 * @type {Required<ITexture>}
 */
export const DefaultTexProps: Required<ITexture> = {
  image: null,
  type: 'ubyte', // default `Uint8ClampedArray`
  format: 'rgba', // default `rgba` channels
  internalFormat: 'rgba8', // default `rgba` 8-bit channels
  target: 'texture2d',
  magFilter: 'nearest',
  minFilter: 'nearest',
  width: 1,
  height: 1,
  depth: 1,
  wrapU: 'clamp',
  wrapV: 'clamp',
  wrapW: 'clamp',
  mipmaps: false,
  level: 0,
  flipY: true,
  anisotropy: 1,
  alignment: 4,
};

/**
 * Class describing some Texture resource
 * @note
 *  - See type/format/internalFormat spec for WebGL on Page 131 here: https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf
 *
 * @class
 * @constructor
 */
export class Texture implements ITexture {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Texture.name;

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
   * @desc the type of texture assoc. with this instance
   * @type {TextureTarget}
   * @readonly
   */
  public readonly target!: TextureTarget;

  /**
   * @desc optionally specifies some image data
   * @type {ImageReference | null}
   */
  public image?: ImageReference | null;

  /**
   * @desc depth dimension (e.g. cube map)
   * @type {number}
   */
  public depth!: number;

  /**
   * @desc i.e. some descriptor of the gpu type
   * @type {TextureType}
   */
  public type!: TextureType;

  /**
   * @desc specifies the colour components of the texture
   * @type {TextureFormat}
   */
  public format!: TextureFormat;

  /**
   * @desc internal ref. to the gpu format
   * @type {TextureInternalFmt}
   */
  public internalFormat!: TextureInternalFmt;

  /**
   * @desc texel sampling behaviour when pixel > 1
   * @type {TextureFilter}
   */
  public magFilter!: TextureFilter;

  /**
   * @desc texel sampling behaviour when pixel < 1
   * @type {TextureFilter}
   */
  public minFilter!: TextureFilter;

  /**
   * @desc horizontal uv wrapping behaviour
   * @type {TextureWrap|null}
   */
  public wrapU!: TextureWrap | null;

  /**
   * @desc vertical uv wrapping behaviour
   * @type {TextureWrap|null}
   */
  public wrapV!: TextureWrap | null;

  /**
   * @desc depth uv wrapping behaviour
   * @type {TextureWrap|null}
   */
  public wrapW!: TextureWrap | null;

  /**
   * @desc whether to flip the texture when pushing the image buffer to the gpu
   * @note ignored if underlying data type cannot be flipped (e.g. some {@link TypedArray})
   * @type {boolean}
   */
  public flipY!: boolean;

  /**
   * @desc specifies the tex mipmap level
   * @type {number}
   */
  public level!: number;

  /**
   * @desc whether to generate mipmaps, see webgl reference here: {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/generateMipmap|generateMipmap}
   * @type {boolean}
   */
  public mipmaps!: boolean;

  /**
   * @desc the number of samples for anisotropic filtering, see webgl reference here: {@link https://developer.mozilla.org/en-US/docs/Web/API/EXT_texture_filter_anisotropic|anistropic filtering}
   * @type {number}
   */
  public anisotropy!: number;

  /**
   * @desc specifies how to read the tex. components
   * @type {number}
   */
  public alignment!: number;

  /**
   * @desc whether this transform inst has any updates that need to be processed
   * @type {boolean}
   */
  public needsUpdate: boolean = true;

  /**
   * @desc the pixel width of this texture resource
   * @type {number}
   * @private
   */
  private _width!: number;

  /**
   * @desc the pixel height of this texture resource
   * @type {number}
   * @private
   */
  private _height!: number;

  /**
   * @param {Partial<ITexture>} [props] specify this inst's constructor props; defaults to {@link DefaultTexProps}
   */
  public constructor(props?: Partial<ITexture>) {
    this.id = Texture._ref++;

    const opts: Required<ITexture> = !!props ? ({ ...DefaultTexProps, ...props } as Required<ITexture>) : DefaultTexProps;

    Object.assign(this, opts);
  }

  /**
   * @desc {@link Texture} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Texture} specifying whether the input is a {@link Texture}
   */
  public static Is(obj: unknown): obj is Texture {
    return obj instanceof Texture;
  }

  /**
   * @desc tests whether the specified width/height are both positive, finite numbers
   * @note will return false if either one of the lengths aren't provided
   * @static
   *
   * @param {number} [width]  optionally specify a width to test
   * @param {number} [height] optionally specify a height to test
   *
   * @returns {boolean} describing whether the specified values were finite numbers
   */
  public static IsSafeSize(width?: number, height?: number): boolean {
    return (
      typeof width === 'number' &&
      width > 0 &&
      Number.isFinite(width) &&
      !Number.isNaN(width) &&
      typeof height === 'number' &&
      height > 0 &&
      Number.isFinite(height) &&
      !Number.isNaN(height)
    );
  }

  /**
   * @desc attempts to normalise the width/height props of a texture, i.e.
   * @static
   *
   * @param {Partial<ITexture>} [props] an obj optionally specifying the `image`, `width`, and `height`
   *
   * @returns {Partial<ITexture>} returns the same obj after being normalised in-place
   */
  public static NormaliseTexSize(props: Partial<ITexture>): Partial<ITexture> {
    let image = props.image,
      width = props.width,
      height = props.height;

    if (isTypedBuffer(image)) {
      const size = image.byteLength / image.BYTES_PER_ELEMENT;
      width = size;
      height = size;
    } else if (typeof width === 'number' || typeof height === 'number') {
      width = (width ?? height)!;
      height = (height ?? width)!;
    }

    if (Number.isFinite(width) && Number.isFinite(height)) {
      props.width = Math.trunc(Math.max(1, width!));
      props.height = Math.trunc(Math.max(1, height!));
    } else {
      props.width = undefined;
      props.height = undefined;
    }

    return props;
  }

  /**
   * @desc grabs the ImageData contained by some {@link ImageType} | {@link Texture} object
   * @async
   * @static
   *
   * @param {Texture|ImageType} input    some image buf container
   * @param {number}            [width]  specify the input width; defaults to specified input's width otherwise
   * @param {number}            [height] specify the input height; defaults to specified input's height otherwise
   *
   * @returns {Promise<ImageData>}
   */
  public static async GetImageData(input?: Texture | ImageType, width?: number, height?: number): Promise<ImageData> {
    if (Texture.Is(input) && typeof input.image !== null && typeof input.image !== 'undefined') {
      return Texture.GetImageData(Array.isArray(input.image) ? input.image[0] : input.image!, input.width, input.height);
    } else if (input instanceof ImageData) {
      return input;
    }

    const props = Texture.NormaliseTexSize({
      image: !Texture.Is(input) ? input : null,
      width,
      height,
    });

    width = props.width;
    height = props.height;

    if (input instanceof OffscreenCanvas || input instanceof HTMLCanvasElement) {
      return new Promise<ImageData>(resolve => {
        const context = input.getContext('2d')! as CanvasRenderingContext2D;
        width = width ?? input.width;
        height = height ?? input.height;
        resolve(context.getImageData(0, 0, width, height));
      });
    }

    return new Promise<ImageData>((resolve, reject) => {
      if (input instanceof HTMLImageElement) {
        width = width ?? input.width;
        height = height ?? input.height;

        const image = new Image(width!, height!);
        image.crossOrigin = '';
        image.src = input.src;
        image.width = width!;
        image.height = height!;
        image.onerror = reject;

        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d')!;
        if (image.complete) {
          context.drawImage(image, 0, 0);
          resolve(context.getImageData(0, 0, width, height));
          return;
        }

        image.onload = () => {
          context.drawImage(image, 0, 0);

          resolve(context.getImageData(0, 0, width!, height!));
          return;
        };
      } else if (input instanceof ImageData) {
        resolve(input);
      }

      resolve(new ImageData(new Uint8ClampedArray(1), 1, 1));
    });
  }

  /**
   * @desc asynchronously constructs a {@link Texture} by creating a bitmap from the given data with the specified shape
   * @async
   * @static
   *
   * @param {TypedArray}        data   an array buffer view describing the image data
   * @param {number}            width  the width of the image that the data describes
   * @param {height}            height the height of the image that the data describes
   * @param {Partial<ITexture>} [opts] optionally specify texture props
   *
   * @returns {Promise<Texture>} a thenable that will resolve a newly constructed {@link Texture} when resolved
   */
  public static async BuildBitmapFromData(data: TypedArray, width: number, height: number, opts?: Partial<ITexture>): Promise<Texture> {
    opts = Texture.NormaliseTexSize({
      ...(opts ?? {}),
      ...{ width: width, height: height, image: data },
    });

    const src = new ImageData(new Uint8ClampedArray(data.buffer), width, height);
    return createImageBitmap(src, { resizeWidth: width, resizeHeight: height }).then(bitmap => {
      opts.image = bitmap;

      return new Texture(opts);
    });
  }

  /**
   * @desc asynchronously constructs a {@link Texture} from a {@link HTMLOrSVGElement}
   * @async
   * @static
   *
   * @param {HTMLOrSVGImageElement} image  some html element describing an image or an SVG
   * @param {Partial<ITexture>}     [opts] optionally specify texture props
   *
   * @returns {Promise<Texture>} a thenable that will resolve a newly constructed {@link Texture} when resolved
   */
  public static async FromImage(image: HTMLOrSVGImageElement, opts?: Partial<ITexture>): Promise<Texture> {
    opts = Texture.NormaliseTexSize(opts ?? {});

    return await new Promise<HTMLImageElement | ImageBitmap>((resolve, reject) => {
      if (image instanceof HTMLImageElement) {
        image.width = opts?.width ?? image.width;
        image.height = opts?.height ?? image.height;
        image.onerror = reject;

        if (image.complete) {
          if (!Texture.IsSafeSize(opts?.width, opts?.height)) {
            image.width = Math.max(image.naturalWidth, image.width);
            image.height = Math.max(image.naturalHeight, image.height);
            image.complete ? resolve(image) : (image.onload = () => resolve(image));
            return;
          }

          resolve(image);
          return;
        }

        image.crossOrigin = '';
        image.onload = () => {
          if (!Texture.IsSafeSize(opts?.width, opts?.height)) {
            image.width = Math.max(image.naturalWidth, image.width);
            image.height = Math.max(image.naturalHeight, image.height);
            image.complete ? resolve(image) : (image.onload = () => resolve(image));
            return;
          }

          resolve(image);
        };
        image.onerror = reject;
        return;
      }

      return createImageBitmap(image, { resizeWidth: opts?.width, resizeHeight: opts?.height });
    }).then(result => {
      opts = Texture.NormaliseTexSize({ ...opts, ...{ width: result.width, height: result.height, image: result } });
      return new Texture(opts);
    });
  }

  /**
   * @desc asynchronously constructs a {@link Texture} by fetching a resource at the specified URL
   * @async
   * @static
   *
   * @param {string}            url    a URL that target some image resource
   * @param {Partial<ITexture>} [opts] optionally specify texture props
   *
   * @returns {Promise<Texture>} a thenable that will resolve a newly constructed {@link Texture} when resolved
   */
  public static async FromURL(url: string, opts?: Partial<ITexture>): Promise<Texture> {
    opts = Texture.NormaliseTexSize(opts ?? {});

    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(opts?.width ?? opts?.height, opts?.height ?? opts?.width);
      img.crossOrigin = '';
      img.src = url;
      img.width = opts?.width ?? img.width;
      img.height = opts?.height ?? img.height;
      img.onerror = reject;

      if (img.complete) {
        if (!Texture.IsSafeSize(opts?.width, opts?.height)) {
          img.width = Math.max(img.naturalWidth, img.width);
          img.height = Math.max(img.naturalHeight, img.height);
          img.complete ? resolve(img) : (img.onload = () => resolve(img));
          return;
        }

        resolve(img);
        return;
      }

      img.onload = () => {
        if (!Texture.IsSafeSize(opts?.width, opts?.height)) {
          img.width = Math.max(img.naturalWidth, img.width);
          img.height = Math.max(img.naturalHeight, img.height);
          img.complete ? resolve(img) : (img.onload = () => resolve(img));
          return;
        }

        resolve(img);
      };
    }).then(img => {
      opts = Texture.NormaliseTexSize({ ...opts, ...{ width: img.width, height: img.height, image: img } });
      return new Texture(opts);
    });
  }

  /**
   * @desc asynchronously constructs a {@link Texture} containing a cubemap from a set of image URLs
   * @async
   * @static
   *
   * @param {Array<string>}     urls   a list of URLs that target some image resource
   * @param {Partial<ITexture>} [opts] optionally specify texture props
   *
   * @returns {Promise<Texture>} a thenable that will resolve a newly constructed {@link Texture} when resolved
   */
  public static async FromCubeMap(urls: Array<string>, opts?: Partial<ITexture>): Promise<Texture> {
    if (urls.length < 6) {
      throw new ExplorerError({
        msg: `Expected at 6 image urls when generating a cubemap but got ${urls.length}`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    opts = Texture.NormaliseTexSize(opts ?? {});

    let width: number = 0,
      height: number = 0,
      hasSize: boolean = false;

    hasSize = Texture.IsSafeSize(opts?.width, opts?.height);
    return Promise.all<HTMLImageElement>(
      urls.map(url => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image(opts?.width ?? opts?.height, opts?.height ?? opts?.width);
          img.crossOrigin = '';
          img.src = url;
          img.width = opts?.width ?? img.width;
          img.height = opts?.height ?? img.height;

          if (img.complete) {
            if (!hasSize) {
              img.width = Math.max(img.naturalWidth, img.width);
              img.height = Math.max(img.naturalHeight, img.height);
              img.complete ? resolve(img) : (img.onload = () => resolve(img));
              return;
            }

            resolve(img);
            return;
          }

          img.onload = () => {
            if (!hasSize) {
              width = Math.max(img.width, img.naturalWidth);
              height = Math.max(img.height, img.naturalHeight);
              img.complete ? resolve(img) : (img.onload = () => resolve(img));
              return;
            }
            resolve(img);
          };
          img.onerror = reject;
        });
      })
    ).then((imgs: Array<HTMLImageElement>) => {
      opts = Texture.NormaliseTexSize({ ...opts, ...{ width, height } });
      if (!hasSize) {
        return Texture.FromCubeMap(urls, opts);
      }

      opts.image = imgs;
      return new Texture(opts);
    });
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Texture';
  }

  /**
   * @returns {number} the width of this texture
   */
  public get width(): number {
    return this._width;
  }

  /**
   * @param {number} value the new width of this texture
   */
  public set width(value: number) {
    this._width = value;
    this.needsUpdate = true;

    if (typeof this.image !== 'undefined' && !(this.image instanceof HTMLImageElement)) {
      return;
    }

    this.image!.width = value;
  }

  /**
   * @returns {number} the height of this texture
   */
  public get height(): number {
    return this._height;
  }

  /**
   * @param {number} value the new height of this texture
   */
  public set height(value: number) {
    this._height = value;
    this.needsUpdate = true;

    if (typeof this.image !== 'undefined' && !(this.image instanceof HTMLImageElement)) {
      return;
    }

    this.image!.height = value;
  }

  /**
   * @desc sets the w/h of this image (assuming it's a resizable {@link HTMLImageElement})
   *
   * @param {number} [w] optionally specify the new width of this texture
   * @param {number} [h] optionally specify the new height of this texture
   *
   * @returns {this}
   */
  public setSize(w?: number, h?: number): this {
    if (typeof this.image !== 'undefined' && !(this.image instanceof HTMLImageElement)) {
      return this;
    }

    if (typeof w === 'number' && w !== this._width) {
      this._width = w;
      this.image!.width = w;
    }

    if (typeof h === 'number' && h !== this._height) {
      this._height = h;
      this.image!.height = h;
    }

    return this;
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
   * @desc destroys this inst & its assoc. resources
   */
  public dispose(): void {
    if (this.image instanceof ImageBitmap) {
      this.image.close();
    } else if (Array.isArray(this.image)) {
      let data: ImageType | undefined;
      while ((data = this.image.shift()) && typeof data !== 'undefined') {
        if (data instanceof ImageBitmap) {
          data.close();
        }
      }
    }
  }
}
