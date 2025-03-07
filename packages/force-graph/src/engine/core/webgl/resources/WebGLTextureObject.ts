import { GL } from '@engine/core/webgl/constants';
import { TextureObject } from '@engine/core/resources';
import type { ImageType, ITexture, TextureTarget } from '@engine/core/types';
import {
  GL_TEX_FILTER, GL_TEX_FMT,
  GL_TEX_IFMT, GL_TEX_MIPMAP_FILTER,
  GL_TEX_TRG, GL_TEX_TYPE, GL_TEX_WRAP
} from '@engine/core/webgl/parameters';

/**
 * Class representing a WebGL resource
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLTexture
 * @class
 * @constructor
 * @extends RenderPipeline
 */
export class WebGLTextureObject extends TextureObject {
  /**
   * @desc empty pixel data for null values
   * @type {Uint8Array}
   * @static
   * @readonly
   */
  public static readonly EMPTY_TEX: Uint8Array = new Uint8Array(4);

  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = WebGLTextureObject.name;

  /**
   * @desc some WebGLTexture object assoc. with this instance
   * @type {WebGLTexture}
   * @protected
   */
  declare protected _resource: WebGLTexture;

  /**
   * @desc the WebGL2RenderingContext device assoc. with this instance
   * @type {WebGL2RenderingContext}
   * @protected
   * @readonly
   */
  declare protected readonly _handle: WebGL2RenderingContext;

  /**
   * @param {WebGL2RenderingContext} handle the WebGL2 context
   */
  public constructor(handle: WebGL2RenderingContext, texId: number) {
    super(handle, handle.createTexture()!, texId);
  }

  /**
   * @desc {@link WebGLTextureObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is WebGLTextureObject} specifying whether the input is a {@link WebGLTextureObject}
   */
  public static Is(obj: unknown): obj is WebGLTextureObject {
    return obj instanceof WebGLTextureObject;
  }

  /**
   * @returns {WebGLTexture} retrieves the render pipeline handle; see inherited classes for more details
   */
  public override get resource(): WebGLTexture {
    return this._resource;
  }

  /**
   * @param {TextureTarget} target specifies the dimension/target of the texture
   *
   * @returns {number} some WebGL gpu texture type
   */
  public static override GetTextureTarget(target: TextureTarget): number {
    return GL_TEX_TRG?.[target] ?? GL.TEXTURE_2D;
  }

  /**
   * @desc binds the texture to the render pass
   *
   * @param {Required<ITexture>} tex
   *
   * @returns {this}
   */
  public bind(tex: ITexture): this {
    const target = GL_TEX_TRG?.[tex.target] ?? GL.TEXTURE_2D;
    this._handle.bindTexture(target, this._resource);
    return this;
  }

  /**
   * @desc unbinds the texture from the render pass
   *
   * @returns {this}
   */
  public unbind(): this {
    this._handle.bindTexture(this._handle.TEXTURE_2D, null)
    return this;
  }

  /**
   * @desc updates some texture target resource
   *
   * @param {ITexture} data udf uniform describing the texture
   *
   * @returns {this}
   */
  public setTexture(data: ITexture): this {
    const gl = this._handle;
    const target = GL_TEX_TRG[data.target];

    const img = data?.image;
    gl.pixelStorei(GL.UNPACK_ALIGNMENT, data.alignment);
    gl.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, WebGLTextureObject.IsFlippable(img) && data.flipY);

    // TODO: aniostropy???

    const vfmt = GL_TEX_FMT[data.format];
    const ifmt = GL_TEX_IFMT[data.internalFormat];
    const vtype = GL_TEX_TYPE[data.type];
    if (typeof img !== 'undefined' && img != null) {
      if ('width' in img && img.width >= 0) {
        data.width = img.width;
        data.height = img.height;
      }

      const level = (data.mipmaps && data.width > 0 && data.height > 0) ? data.level : 0;
      if (target === GL.TEXTURE_CUBE_MAP || Array.isArray(img)) {
        for (let i = 0; i < 6; i++) {
          gl.texImage2D(GL.TEXTURE_CUBE_MAP_POSITIVE_X + i, level, ifmt, vfmt, vtype, (img as ImageType[])[i] as any);
        }
      } else if (ArrayBuffer.isView(img)) {
        if (target === GL.TEXTURE_2D) {
          gl.texImage2D(target, level, ifmt, data.width, data.height, 0, vfmt, vtype, img);
        } else if (target === GL.TEXTURE_2D_ARRAY || target === GL.TEXTURE_3D) {
          gl.texImage3D(target, level, ifmt, data.width, data.height, data.depth, 0, vfmt, vtype, img);
        }
      } else if (target === GL.TEXTURE_2D) {
        gl.texImage2D(target, level, ifmt, vfmt, vtype, img);
      } else {
        gl.texImage3D(target, level, ifmt, data.width, data.height, data.depth, 0, vfmt, vtype, img);
      }

      if (data.mipmaps && data.width > 0 && data.height > 0) {
        gl.generateMipmap(target);
      }
    } else if (target === GL.TEXTURE_CUBE_MAP) {
      for (let i = 0; i < 6; i++) {
        gl.texImage2D(GL.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, GL.RGBA, 1, 1, 0, GL.RGBA, GL.UNSIGNED_BYTE, WebGLTextureObject.EMPTY_TEX);
      }
    } else if (data.width) {
      if (target === GL.TEXTURE_2D) {
        gl.texImage2D(target, 0, ifmt, data.width, data.height, 0, vfmt, vtype, null);
      } else {
        gl.texImage3D(target, 0, ifmt, data.width, data.height, data.depth, 0, vfmt, vtype, null);
      }
    } else {
      gl.texImage2D(target, 0, GL.RGBA, 1, 1, 0, GL.RGBA, GL.UNSIGNED_BYTE, WebGLTextureObject.EMPTY_TEX);
    }

    gl.texParameteri(target, GL.TEXTURE_MAG_FILTER, GL_TEX_FILTER[data.magFilter]);
    gl.texParameteri(target, GL.TEXTURE_MIN_FILTER, data.mipmaps ? GL_TEX_MIPMAP_FILTER[data.minFilter] : GL_TEX_FILTER[data.minFilter]);

    if (data.wrapU) {
      gl.texParameteri(target, GL.TEXTURE_WRAP_S, GL_TEX_WRAP[data.wrapU]);
    }

    if (data.wrapV) {
      gl.texParameteri(target, GL.TEXTURE_WRAP_T, GL_TEX_WRAP[data.wrapV]);
    }

    if (data.wrapW) {
      gl.texParameteri(target, GL.TEXTURE_WRAP_R, GL_TEX_WRAP[data.wrapW]);
    }

    return this;
  }

  /**
   * @desc some cleanup method to destroy this instance
   */
  public dispose(): void {
    this._handle.deleteTexture(this._resource);
  }
};
