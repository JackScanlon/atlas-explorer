import { GL } from './constants';
import { Camera } from '@engine/objects';
import { Device } from '@engine/core/device';
import { ExplorerError } from '@engine/common';

import {
  WebGLTextureObject,
  WebGLFrameBufferObject,
  WebGLRenderPipeline,
  WebGLVertexObject,
  WebGLBufferObject,
  WebGLUniformBufferObject,
  type WebGLRenderPipelineProps,
} from './resources';

import { GL_DRAW, GL_BLEND_FUNC, GL_BLEND_OP, GL_DEPTH_COMP, GL_VALUE_TYPE, GL_CAP_TGL, GL_TOGGLEABLE, GL_TEX_FMT } from './parameters';

import type {
  CullMode,
  DeviceProps,
  DrawMode,
  FrontFace,
  DepthComparator,
  BlendFunc,
  BlendOp,
  PipelineDrawObj,
  IMaterialProps,
  ValueType,
  CapabilityToggles,
  FrameBufferProps,
  IFrameBuffer,
  ITexture,
  TypedArray,
  TextureFormat,
} from '@engine/core/types';

/**
 * @desc attempts to resolve a WebGL2RenderingContext from a Canvas element
 * @note the `preserveDrawingBuffer` and `powerPreference` default to `true` and `default` respectively unless otherwise specified
 *
 * @param {HTMLCanvasElement | OffscreenCanvas} canvas     the canvas element
 * @param {WebGLContextAttributes}              attributes some set of WebGL2 context attributes
 *
 * @returns {WebGL2RenderingContext} the WebGL context if resolvable
 */
export const createWebGLContext = (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  attributes?: WebGLContextAttributes | null
): WebGL2RenderingContext => {
  attributes = {
    ...{ powerPreference: 'default' },
    ...(attributes ?? {}),
  };

  let gl: RenderingContext | null = canvas.getContext('webgl2', attributes);
  if (!gl || !(gl instanceof WebGL2RenderingContext)) {
    if (!!canvas.getContext('webgl')) {
      throw new ExplorerError({ code: ExplorerError.Errors.NoWebGL2Support });
    }

    throw new ExplorerError({ code: ExplorerError.Errors.NoWebGLSupport });
  }

  return gl as WebGL2RenderingContext;
};

/**
 * Class representing a WebGL2 device
 *
 * @class
 * @constructor
 * @extends Device
 */
export class WebGLDevice extends Device {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = WebGLDevice.name;

  /**
   * @desc reference to this device's context type
   */
  public readonly deviceType = 'webgl';

  /**
   * @desc this device's handle
   * @type {WebGL2RenderingContext}
   */
  declare public handle: WebGL2RenderingContext;

  /**
   * @desc describes association between geometry and device vertex array object(s)
   * @see {@link WebGLVertexObject}
   * @type {Record<number, WebGLVertexObject>}
   * @readonly
   */
  declare protected readonly _vaos: Record<number, WebGLVertexObject>;

  /**
   * @desc a map of texture uniforms and their texture resources
   * @type {WeakMap<ITexture, WebGLTextureObject>}
   * @protected
   * @readonly
   */
  declare protected readonly _textures: WeakMap<ITexture, WebGLTextureObject>;

  /**
   * @desc describes the assoc. between a RenderTarget and its assoc. frame buffer
   * @see {@link WebGLFrameBufferObject}
   * @see {@link RenderTarget}
   * @see {@link WebGLFrameBufferObject}
   * @type {WeakMap<IFrameBuffer, WebGLFrameBufferObject>}
   * @readonly
   */
  declare protected readonly _fbos: WeakMap<IFrameBuffer, WebGLFrameBufferObject>;

  /**
   * @desc describes association between materials and render pipelines
   * @see {@link WeakMap<IMaterialProps, WebGLRenderPipeline>}
   * @type {WeakMap<IMaterialProps, WebGLRenderPipeline>}
   * @readonly
   */
  declare protected readonly _pipelines: WeakMap<IMaterialProps, WebGLRenderPipeline>;

  /**
   * @param {DeviceProps} props this device's constructor props; see {@link DeviceProps}
   */
  public constructor(props: DeviceProps) {
    super(props);

    // Initialise device
    const gl = createWebGLContext(this.element, this.props?.attributes);
    if ('device' in gl && !!gl.device) {
      throw new ExplorerError({
        code: ExplorerError.Errors.WebGLAttachmentExists,
        msg: `Device<id: ${gl.device.id}>`,
      });
    }

    gl.device = this;
    this.handle = gl;
    this.setClearColor([...this.props.clearColor!, this.props.clearAlpha!]);

    // Observe context loss
    const contextChangeHandler = this.handleContextChanged.bind(this);
    this.element.addEventListener('webglcontextlost', contextChangeHandler, false);
    this.element.addEventListener('webglcontextrestored', contextChangeHandler, false);
    this.changedSignal.fire('context', !this.contextLost, false);

    // Manage disposables
    this._disposables.push(() => {
      this.element.removeEventListener('webglcontextlost', contextChangeHandler, false);
      this.element.removeEventListener('webglcontextrestored', contextChangeHandler, false);
    });
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'WebGLDevice';
  }

  /**
   * @desc {@link WebGLDevice} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is WebGLDevice} specifying whether the input is a {@link WebGLDevice}
   */
  public static Is(obj: unknown): obj is WebGLDevice {
    return obj instanceof WebGLDevice;
  }

  /**
   * @returns {boolean} whether this device has lost its context
   */
  public get contextLost(): boolean {
    return this.handle.isContextLost();
  }

  /**
   * @see https://github.com/gpuweb/gpuweb/issues/4284
   *
   * @returns {number} max supported buffers
   */
  public get maxVertexBuffers(): number {
    return 16;
  }

  /**
   * @returns {number} max number of attributes in a shader
   */
  public get maxVertexAttributes(): number {
    return this.getDeviceLimit(GL.MAX_VERTEX_ATTRIBS);
  }

  /**
   * @returns {number} max number of varying components in a shader
   */
  public get maxVaryingComponents(): number {
    return this.getDeviceLimit(GL.MAX_VARYING_COMPONENTS);
  }

  /**
   * @returns {number} max num. of color attachments per glsl pipeline
   */
  public get maxDrawBuffers(): number {
    return this.getDeviceLimit(GL.MAX_DRAW_BUFFERS);
  }

  /**
   * @returns {number} max num. of color attachments per glsl pipeline
   */
  public get maxColorAttachments(): number {
    return this.getDeviceLimit(GL.MAX_COLOR_ATTACHMENTS);
  }

  /**
   * @returns {number} max web glsl renderbuffer dimensions
   */
  public get maxRenderBufferSize(): number {
    return this.getDeviceLimit(GL.MAX_RENDERBUFFER_SIZE);
  }

  /**
   * @returns {number} max web glsl 2d texture size
   */
  public get maxTextureDimension2D(): number {
    return this.getDeviceLimit(GL.MAX_TEXTURE_SIZE);
  }

  /**
   * @returns {number} max web glsl 3d texture size
   */
  public get maxTextureDimension3D(): number {
    return this.getDeviceLimit(GL.MAX_3D_TEXTURE_SIZE);
  }

  /**
   * @returns {number} max layers in a 2D texture array
   */
  public get maxTextureArrayLayers(): number {
    return this.getDeviceLimit(GL.MAX_ARRAY_TEXTURE_LAYERS);
  }

  /**
   * @returns {number} max number of texture units a frag shader can reference
   */
  public get maxFragmentTextureUnits(): number {
    return this.getDeviceLimit(GL.MAX_TEXTURE_IMAGE_UNITS);
  }

  /**
   * @returns {number} max number of texture units a vertex shader can reference
   */
  public get maxVertexTextureUnits(): number {
    return this.getDeviceLimit(GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
  }

  /**
   * @returns {number} max number of texture units that exist
   */
  public get maxCombinedTextureUnits(): number {
    return this.getDeviceLimit(GL.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
  }

  /**
   * @returns {number} max number of UBOs that can be bound
   */
  public get maxUniformBufferBindings(): number {
    return this.getDeviceLimit(GL.MAX_UNIFORM_BUFFER_BINDINGS);
  }

  /**
   * @returns {number} max size of the UBO memory block
   */
  public get maxUniformBufferBindingSize(): number {
    return this.getDeviceLimit(GL.MAX_UNIFORM_BLOCK_SIZE);
  }

  /**
   * @returns {number} min alignment between UBO struct layouts
   */
  public get minUniformBufferOffsetAlignment(): number {
    return this.getDeviceLimit(GL.UNIFORM_BUFFER_OFFSET_ALIGNMENT);
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
   * @desc constructor a render pipeline (program in WebGL case)
   *
   * @param {WebGLRenderPipelineProps} props {@link WebGLRenderPipelineProps}
   *
   * @returns {WebGLRenderPipeline} the constructed pipeline
   */
  public createRenderPipeline(props: WebGLRenderPipelineProps): WebGLRenderPipeline {
    return new WebGLRenderPipeline(this.handle, props);
  }

  /**
   * @desc constructs a VAO
   *
   * @param {Array<AttributePartial>} attributes a list of desired attributes; note that these must include a `data` and `name` prop
   *
   * @returns {WebGLVertexObject} a wrapper containing one or more VAOs
   */
  public createVertexArrayObject(): WebGLVertexObject {
    return new WebGLVertexObject(this.handle);
  }

  /**
   * @desc constructs UBO
   *
   * @param {string} name       the name of this uniform
   * @param {number} byteLength the byte length of this uniform's buffer
   * @param {number} blockIndex specifies corresponding active uniform block in the render pipeline
   *
   * @returns {WebGLUniformBufferObject} class wrapping a WebGL UBO
   */
  public createUniformBufferObject(name: string, byteLength: number, blockIndex: number): WebGLUniformBufferObject {
    return new WebGLUniformBufferObject(this.handle, name, byteLength, blockIndex);
  }

  /**
   * @desc constructs a GPU buffer resource
   *
   * @param {number}     [target=GL.ARRAY_BUFFER] the buffer target; one of `GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER | GL.UNIFORM_BUFFER`
   * @param {number}     [usage=GL.STATIC_DRAW]   the buffer usage hint; one of `GL.STATIC_DRAW | GL.DYNAMIC_DRAW`
   * @param {TypedArray} [data]                   optionally specify the initialisation data
   *
   * @returns {WebGLBufferObject} class wrapping a WebGL Buffer resource
   */
  public createBuffer(target?: number, usage?: number, data?: TypedArray): WebGLBufferObject {
    return new WebGLBufferObject(this.handle, target, usage, data);
  }

  /**
   * @desc constructs a GPU texture resource
   *
   * @param {ITexture} props properties describing some texture or the texture itself
   *
   * @returns {WebGLTextureObject} class representing a WebGL resource
   */
  public createTexture(props: ITexture & { id?: number }): WebGLTextureObject {
    return new WebGLTextureObject(this.handle, props.id ?? -1);
  }

  /**
   * @desc constructs a GPU frame buffer, its render buffer and other assoc. resources
   *
   * @param {FrameBufferProps} props props describing some FBO
   *
   * @returns {WebGLFrameBufferObject} class representing a WebGL FBO
   */
  public createFrameBuffer(props: FrameBufferProps): WebGLFrameBufferObject {
    return new WebGLFrameBufferObject(this.handle, props);
  }

  /**
   * @desc renders a primitive from array data
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays
   *
   * @param {DrawMode} drawMode specifies the primitive type to render
   * @param {number}   first    specifies the start index in the array
   * @param {number}   count    specifies the number of indices to be rendered
   *
   * @returns {this}
   */
  public drawArrays(drawMode: DrawMode, first: number, count: number): this {
    this.handle.drawArrays(GL_DRAW[drawMode], first, count);

    return this;
  }

  /**
   * @desc renders a primitive from array data
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced
   *
   * @param {DrawMode} drawMode  specifies the primitive type to render
   * @param {number}   first     specifies the start index in the array
   * @param {number}   count     specifies the number of indices to be rendered
   * @param {offset}   instCount specifies the number of instances of the element buf
   *
   * @returns {this}
   */
  public drawArraysInstanced(drawMode: DrawMode, first: number, count: number, instCount: number): this {
    this.handle.drawArraysInstanced(GL_DRAW[drawMode], first, count, instCount);

    return this;
  }

  /**
   * @desc renders a primitive from array data
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawElements
   *
   * @param {DrawMode}  drawMode specifies the primitive type to render
   * @param {number}    count    specifies the number of elements bound to the elem. array
   * @param {ValueType} type     specifies the type of values contained by the buffer
   * @param {offset}    offset   specifies the byte offset in the element array
   *
   * @returns {this}
   */
  public drawElements(drawMode: DrawMode, count: number, type: ValueType, offset: number): this {
    this.handle.drawElements(GL_DRAW[drawMode], count, GL_VALUE_TYPE[type], offset);

    return this;
  }

  /**
   * @desc renders a primitive from array data
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawElementsInstanced
   *
   * @param {DrawMode}  drawMode  specifies the primitive type to render
   * @param {number}    count     specifies the number of elements bound to the elem. array
   * @param {ValueType} type      specifies the type of values contained by the buffer
   * @param {offset}    offset    specifies the byte offset in the element array
   * @param {offset}    instCount specifies the number of instances of the element buf
   *
   * @returns {this}
   */
  public drawElementsInstanced(drawMode: DrawMode, count: number, type: ValueType, offset: number, instCount: number): this {
    this.handle.drawElementsInstanced(GL_DRAW[drawMode], count, GL_VALUE_TYPE[type], offset, instCount);
    return this;
  }

  /**
   * @desc renders some object
   *
   * @param {PipelineDrawObj} obj      the obj to render
   * @param {Camera}          [camera] optionally specify the camera; used to compute the view transform, projection matrix
   *
   * @returns {this}
   */
  public drawObject(obj: PipelineDrawObj, camera?: Camera): this {
    const { material, geometry } = obj;
    if (camera) {
      obj.updateRender?.(camera);
    }

    if (!material) {
      return this;
    }

    const {
      uniforms,
      cullMode,
      frontFace,
      depthTest,
      depthComp,
      depthWrite,
      blendSrc,
      blendDst,
      blendSrcAlpha,
      blendDstAlpha,
      blendOp,
      blendOpAlpha,
    } = material;

    let pipeline = this._pipelines.get(material);
    if (!pipeline) {
      pipeline = this.createRenderPipeline(material as WebGLRenderPipelineProps);
      this._pipelines.set(material, pipeline);
    }

    this.handle.useProgram(pipeline.resource);

    if (uniforms) {
      for (const name in uniforms) {
        pipeline.setUniform(name, uniforms[name], this._textures);
      }
    }

    if (geometry) {
      let vao = this._vaos?.[geometry.id];
      if (!vao) {
        vao = this.createVertexArrayObject();
        this._vaos[geometry.id] = vao;
      }

      const mode = geometry.drawMode,
        instanced = geometry.instanced,
        instanceCount = geometry.instanceCount,
        drawRangeStart = geometry.drawRangeStart,
        drawRangeLength = geometry.drawRangeLength;

      const index = geometry.attributes?.index;
      const indexBytesPerElement = WebGLVertexObject.GetIndexBytesPerElement(index?.type);
      vao.bindToPipeline(pipeline, geometry.attributes);

      this.toggleDepthTest(!!depthTest);
      this.toggleCullMode(!!cullMode);
      this.toggleBlending(!!blendSrc);

      this.setCullMode(cullMode);
      this.setFrontFace(frontFace);
      this.setDepthMask(depthWrite);
      this.setDepthFunc(depthComp);
      this.setBlendFunc(blendSrc, blendDst, blendSrcAlpha, blendDstAlpha);
      this.setBlendOp(blendOp, blendOpAlpha);

      if (index) {
        if (!instanced) {
          this.drawElements(mode, drawRangeLength, index.type, index.offset + drawRangeStart * indexBytesPerElement);
        } else {
          this.drawElementsInstanced(
            mode,
            drawRangeLength,
            index.type,
            index.offset + drawRangeStart * indexBytesPerElement,
            instanceCount
          );
        }
      } else if (!instanced) {
        this.drawArrays(mode, drawRangeStart, drawRangeLength);
      } else {
        this.drawArraysInstanced(mode, drawRangeStart, drawRangeLength, instanceCount);
      }

      this.handle.bindVertexArray(null);
    }

    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace
   *
   * @param {boolean} enabled specifies if this feature should be enabled
   *
   * @returns {this}
   */
  public toggleCullMode(enabled: boolean): this {
    this.handle[enabled ? 'enable' : 'disable'](GL.CULL_FACE);
    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants#enabling_and_disabling
   *
   * @param {boolean} enabled specifies if this feature should be enabled
   *
   * @returns {this}
   */
  public toggleDepthTest(enabled: boolean): this {
    this.handle[enabled ? 'enable' : 'disable'](GL.DEPTH_TEST);
    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants#enabling_and_disabling
   *
   * @param {boolean} enabled specifies if this feature should be enabled
   *
   * @returns {this}
   */
  public toggleBlending(enabled: boolean): this {
    this.handle[enabled ? 'enable' : 'disable'](GL.BLEND);
    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthMask
   *
   * @param {boolean} [value] specifies whether we should write to the depth buffer
   *
   * @returns {this}
   */
  public setDepthMask(value?: boolean): this {
    this.handle.depthMask(value ?? false);
    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc
   *
   * @param {DepthComparator} value specifies a fn to compare pixel depths in the depth buffer
   *
   * @returns {this}
   */
  public setDepthFunc(value: DepthComparator = 'less'): this {
    this.handle.depthFunc(GL_DEPTH_COMP[value]);
    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate
   *
   * @param {BlendOp} [src]      src rgb mode
   * @param {BlendOp} [dst]      dst rgb mode
   * @param {BlendOp} [srcAlpha] src alpha mode
   * @param {BlendOp} [dstAlpha] dst alpha mode
   *
   * @returns {this}
   */
  public setBlendFunc(src?: BlendFunc, dst?: BlendFunc, srcAlpha?: BlendFunc, dstAlpha?: BlendFunc): this {
    if (typeof src === 'undefined') {
      return this;
    }

    dst = dst ?? 'zero';
    if (typeof srcAlpha !== 'undefined' && typeof dstAlpha !== 'undefined') {
      this.handle.blendFuncSeparate(GL_BLEND_FUNC[src], GL_BLEND_FUNC[dst], GL_BLEND_FUNC[srcAlpha], GL_BLEND_FUNC[dstAlpha]);
    } else {
      this.handle.blendFunc(GL_BLEND_FUNC[src], GL_BLEND_FUNC[dst]);
    }

    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquation
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquationSeparate
   *
   * @param {BlendOp} [color] rgb mode
   * @param {BlendOp} [alpha] alpha mode
   *
   * @returns {this}
   */
  public setBlendOp(color?: BlendOp, alpha?: BlendOp): this {
    if (typeof color === 'undefined') {
      return this;
    }

    if (typeof alpha !== 'undefined') {
      this.handle.blendEquationSeparate(GL_BLEND_OP[color], GL_BLEND_OP[alpha]);
    } else {
      this.handle.blendEquation(GL_BLEND_OP[color]);
    }

    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace
   *
   * @param {CullMode} [value] specifies the faces that are candidates for culling
   *
   * @returns {this}
   */
  public setCullMode(value?: CullMode): this {
    switch (value) {
      case 'front':
        this.handle.cullFace(GL.FRONT);
        break;

      case 'back':
        this.handle.cullFace(GL.BACK);
        break;

      case 'both':
        this.handle.cullFace(GL.FRONT_AND_BACK);
        break;

      default:
        break;
    }

    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace
   *
   * @param {CullMode} [value='CCW'] specifies winding orientation
   *
   * @returns {this}
   */
  public setFrontFace(value: FrontFace = 'CCW'): this {
    this.handle.frontFace(GL[value]);
    return this;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/viewport
   *
   * @param {CullMode} [x0] horizontal lower-left corner coord
   * @param {CullMode} [y0] vertical lower-left corner coord
   * @param {CullMode} [x1] width
   * @param {CullMode} [y1] height
   *
   * @returns {this}
   */
  public setViewport(x0: number = 0, y0: number = 0, x1: number = this.drawBufferWidth, y1: number = this.drawBufferHeight): this {
    this.handle.viewport(x0, y0, x1, y1);
    return this;
  }

  /**
   * @desc binds the specified FBO or sets the target to the current canvas
   *
   * @param {IFrameBuffer|null} [target] a FrameBuffer descriptor, or `null|undefined` if the canvas is desired
   *
   * @returns {this}
   */
  public setRenderTarget(target?: IFrameBuffer | null): this {
    if (target != null && typeof target !== 'undefined') {
      let fbo = this._fbos.get(target);
      if (typeof fbo === 'undefined') {
        fbo = this.createFrameBuffer(target);
        this._fbos.set(target, fbo);
      }

      fbo.update(target, this._textures);
      this.setViewport(0, 0, fbo.width, fbo.height);

      return this;
    }

    this.handle.bindFramebuffer(GL.FRAMEBUFFER, null);
    this.setViewport();

    return this;
  }

  /**
   * @desc reads a block of pixels into a {@link TypedArray} from the current framebuffer
   *
   * @param {number}          x      starting horizontal pixel of the read rect (lower-left)
   * @param {number}          y      starting vertical pixel of the read rect (lower-left)
   * @param {number}          w      pixel width of the read rect
   * @param {number}          h      pixel height of the read rect
   * @param {TextureFormat}   format expected format of the pixel data
   * @param {ValueType}       type   expected data type of the pixel data
   * @param {ArrayBufferView} dst    some {@link TypedArray} or {@link ArrayBufferView} in which to store the pixels
   *
   * @returns {this}
   */
  public readPixels(x: number, y: number, w: number, h: number, format: TextureFormat, type: ValueType, dst: ArrayBufferView): this {
    this.handle.readPixels(x, y, w, h, GL_TEX_FMT[format], GL_VALUE_TYPE[type], dst);
    return this;
  }

  /**
   * @todo need to impl. a wrapper around GL extensions to cache known availability
   *
   * @desc
   * @abstract
   */
  public getExtension(): void {
    // WebGLExtension?
  }

  /**
   * @todo need to impl. a wrapper around GL extensions to cache known availability
   *
   * @desc asserts that a set of extensions exists and are contained by this device's gpu context
   * @see {https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getExtension|getExtension()}
   *
   * @param {...*} exts a list of extension names required by the downstream app
   */
  public expectExtensions(...exts: string[]): void {
    // WebGLExtension?
    const gl = this.handle;
    for (let i = 0; i < exts.length; ++i) {
      const res = gl.getExtension(exts[i]);
      if (!res) {
        throw new ExplorerError({
          msg: `Extension Ext<name: ${exts[i]}> is not available for this device, with result:\n\n ${res}`,
          code: ExplorerError.Errors.DeviceExtUnavailable,
        });
      }
    }
  }

  /**
   * @todo need to impl. wrapper around webgl parameters + impl. caching
   *
   * @desc
   * @abstract
   */
  public getParameters(): void {
    // WebGLParameter?
  }

  /**
   * @todo need to impl. wrapper around webgl parameters + impl. caching
   *
   * @desc
   * @abstract
   */
  public setParameters(): void {
    // WebGLParameter?
  }

  /**
   * @todo need to impl. wrapper around webgl parameters + impl. caching
   *
   * @desc
   * @abstract
   */
  public resetParameters(): void {
    // WebGLParameter?
  }

  /**
   * @param {CapabilityToggles|number} cap some capability to examine
   *
   * @returns {boolean} specifying whether this capability is currently enabled
   */
  public isEnabled(cap: CapabilityToggles | number): boolean {
    if (typeof cap === 'string') {
      cap = GL_CAP_TGL?.[cap];
    } else if (typeof cap === 'number' && !(cap in GL_TOGGLEABLE)) {
      this.log('warn', `Unable to test state of unknown Capability<value: ${cap}>`);
      return false;
    }

    return this.handle.isEnabled(cap);
  }

  /**
   * @desc attempts to resolve the limit assoc. with some device parameter
   *
   * @param {any} parameter the parameter to query
   *
   * @returns {number} the assoc. numeric limit
   */
  public getDeviceLimit(parameter: any): number {
    let lim: number = this._limits?.[parameter];
    if (typeof lim === 'undefined') {
      try {
        lim = this.handle.getParameter(parameter);
        this._limits[parameter] = lim;
      } catch (e: any) {
        return 0;
      }
    }

    return lim || 0;
  }

  /**
   * @desc sets the clear colour
   *
   * @param {number | Array<number>} color specify either (a) a scalar or (b) rgba values
   *
   * @returns {this}
   */
  public setClearColor(color: number | Array<number>): this {
    const clearColor = this.props.clearColor!;
    if (typeof color === 'number') {
      clearColor[0] = clearColor[1] = clearColor[2] = this.props.clearAlpha = color;
    } else {
      clearColor[0] = color[0] ?? clearColor[0];
      clearColor[1] = color[1] ?? clearColor[1];
      clearColor[2] = color[2] ?? clearColor[2];
      this.props.clearAlpha = color[3] ?? this.props.clearAlpha;
    }

    const m = this.alphaMultiplier;
    this.handle.clearColor(clearColor[0] * m, clearColor[1] * m, clearColor[2] * m, this.clearAlpha);

    return this;
  }

  /**
   * @desc clears the device's canvas
   * @note the clear colour is derived from the {@link DeviceProps}
   *
   * @todo need to use an intermediate type instead of raw GL params
   *
   * @param {number} mask the mask used to clear the canvas
   *
   * @returns {this}
   */
  public clear(mask: number = GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT | GL.STENCIL_BUFFER_BIT): this {
    this.handle.clear(mask);
    return this;
  }

  /**
   * @desc destroys this instance
   */
  public override dispose(): void {
    super.dispose();

    // TODO: destroy all GPU resources
  }

  /**
   * @desc handles events dispatched when the context of a graphics device changes
   *
   * @param {Event} event some context event
   */
  private handleContextChanged(event: Event): void {
    const currentState = event.type === 'webglcontextlost';
    if (!currentState) {
      event.preventDefault();
    }

    this.changedSignal.fire('context', currentState, !currentState);
  }
}
