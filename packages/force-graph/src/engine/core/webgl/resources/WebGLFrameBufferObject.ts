import { GL } from '@engine/core/webgl/constants';
import { GL_TEX_TRG } from '@engine/core/webgl/parameters';
import { FrameBufferObject } from '@engine/core/resources';
import { WebGLTextureObject } from './WebGLTextureObject';
import { RenderBufferType, type IFrameBuffer, type FrameBufferProps, type ITexture } from '@engine/core/types';

/**
 * A class wrapping a WebGL Frame Buffer resource
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLFramebuffer
 *
 * @class
 * @constructor
 * @extends FrameBufferObject
 */
export class WebGLFrameBufferObject extends FrameBufferObject {
  public static readonly DefaultProps: Omit<FrameBufferProps, 'textures'> = {
    width: 1,
    height: 1,
    renderBufferType: RenderBufferType.None,
    needsUpdate: false,
  };

  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = WebGLFrameBufferObject.name;

  /**
   * @desc some WebGLFramebuffer object assoc. with this instance
   * @type {WebGLFramebuffer}
   * @protected
   */
  declare protected _resource: WebGLFramebuffer;

  /**
   * @desc some assoc. render buffer containing an img/src; might contain a stencil, depth or stencil & depth buffer depending on config
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderbuffer
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/createRenderbuffer
   * @type {WebGLRenderbuffer}
   */
  declare protected _renderBuffer: WebGLRenderbuffer;

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
  public constructor(handle: WebGL2RenderingContext, props: FrameBufferProps) {
    const opts = { ...WebGLFrameBufferObject.DefaultProps, ...(props ?? { }) } as FrameBufferProps;
    super(handle, handle.createFramebuffer()!, opts);
  }

  /**
   * @desc {@link WebGLFrameBufferObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is WebGLFrameBufferObject} specifying whether the input is a {@link WebGLFrameBufferObject}
   */
  public static Is(obj: unknown): obj is WebGLFrameBufferObject {
    return obj instanceof WebGLFrameBufferObject;
  }

  /**
   * @returns {WebGLFramebuffer} retrieves the frame buffer contained by this inst
   */
  public override get resource(): WebGLFramebuffer {
    return this._resource;
  }

  /**
   * @returns {WebGLFramebuffer} retrieves the render buffer assoc. with this FBO
   */
  public override get renderBuffer(): WebGLFramebuffer {
    return this._renderBuffer;
  }

  /**
   * @desc binds the buffer to the render pass
   *
   * @returns {this}
   */
  public bind(): this {
    this._handle.bindFramebuffer(GL.FRAMEBUFFER, this._resource);
    return this;
  }

  /**
   * @desc unbinds the buffer from the render pass
   *
   * @returns {this}
   */
  public unbind(): this {
    this._handle.bindFramebuffer(GL.FRAMEBUFFER, null);
    return this;
  }

  /**
   * @desc attempts to update this frame buffer's dependencies
   *
   * @param {IFrameBuffer}                          props    some assoc. fbo / render target props
   * @param {WeakMap<ITexture, WebGLTextureObject>} textures a map of textures known by the renderer
   *
   * @returns {this}
   */
  public update(props: IFrameBuffer, textures: WeakMap<ITexture, WebGLTextureObject>): this {
    const gl = this._handle;
    if (this.width !== props.width || this.height !== props.height) {
      this.width = props.width ?? this.width;
      this.height = props.height ?? this.height;
      props.needsUpdate = true;
    }

    this.bind();

    if (!props.needsUpdate) {
      return this;
    }

    const targets = props.textures;
    props.needsUpdate = false;

    let trgTex!: ITexture,
        intTex: WebGLTextureObject | undefined;
    for (let i = 0; i < targets.length; ++i) {
      trgTex = targets[i];
      intTex = textures.get(trgTex);
      if (!intTex) {
        intTex = new WebGLTextureObject(gl, (trgTex as any)?.id ?? -1);
        textures.set(trgTex, intTex);
        this.drawBufferTargets.push(GL.COLOR_ATTACHMENT0 + i);
      }

      intTex.bind(trgTex);
      intTex.setTexture(trgTex);
      gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0 + i, GL_TEX_TRG[trgTex.target], intTex.resource, 0);
    }

    if (this.drawBufferTargets.length > 1) {
      this._handle.drawBuffers(this.drawBufferTargets);
    }

    if ((this.renderBufferType & this.renderBufferType) !== 0) {
      let renderBuffer = this._renderBuffer;
      if (!!renderBuffer) {
        renderBuffer = gl.createRenderbuffer()!;
        this._renderBuffer = renderBuffer;
      }

      switch (this.renderBufferType) {
        case RenderBufferType.Depth: {
          gl.bindRenderbuffer(GL.RENDERBUFFER, renderBuffer);
          gl.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, this.width, this.height);
          gl.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, renderBuffer);
        } break;

        case RenderBufferType.Stencil: {
          gl.bindRenderbuffer(GL.RENDERBUFFER, renderBuffer);
          gl.renderbufferStorage(GL.RENDERBUFFER, GL.STENCIL_INDEX8, this.width, this.height);
          gl.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.STENCIL_ATTACHMENT, GL.RENDERBUFFER, renderBuffer);
        } break;

        case RenderBufferType.DepthAndStencil: {
          gl.bindRenderbuffer(GL.RENDERBUFFER, renderBuffer);
          gl.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_STENCIL, this.width, this.height);
          gl.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_STENCIL_ATTACHMENT, GL.RENDERBUFFER, renderBuffer);
        } break;
      }
    }

    return this;
  }

  /**
   * @desc some cleanup method to destroy this instance
   */
  public dispose(): void {
    this._handle.deleteFramebuffer(this._resource);

    if (typeof this._renderBuffer !== 'undefined') {
      this._handle.deleteRenderbuffer(this._renderBuffer);
    }
  }
};
