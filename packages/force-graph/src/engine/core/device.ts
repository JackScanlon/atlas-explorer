import * as Utils from './utils';
import { Camera } from '@engine/objects';
import { Vec2, Vec2Like, Vec3, Vec3Like, NumberUtils } from '@engine/math';

import { LogLevel, DrawMode } from './types';

import type {
  DeviceProps,
  DeviceType,
  CanvasType,
  LoggingFunc,
  LogType,
  FrontFace,
  CullMode,
  DepthComparator,
  BlendFunc,
  BlendOp,
  PipelineDrawObj,
  IMaterialProps,
  CapabilityToggles,
  IFrameBuffer,
  ITexture,
  TypedArray,
} from './types';

import {
  BufferObject,
  FrameBufferObject,
  RenderPipeline,
  TextureObject,
  UniformBufferObject,
  VertexObject,
  type RenderPipelineProps,
  type ValueType,
} from './resources';

import { Signal, Disposable, ExplorerError, isHTMLCanvasElement, isOffscreenCanvas, type BrowserType } from '@engine/common';

/**
 * @desc default log message handler
 * @note default behaviour is to early exit if `LogLevel` is unset, otherwise log behaviour is determined by the message type & the current log level
 *
 * @param {LogType}  type     the type of the message; specifies how to log a particular message
 * @param {LogLevel} logLevel the app's current log level; specifies whether to log a specific message type (or any at all)
 * @param {...*}     args     variadic arguments describing the logging message
 */
const defaultLogger: LoggingFunc = (type: LogType, logLevel: LogLevel = LogLevel.None, ...args: any[]) => {
  if ((logLevel & logLevel) === 0) {
    return;
  }

  switch (type) {
    case 'warn':
      if ((logLevel & LogLevel.Warnings) == LogLevel.Warnings) {
        console.warn(...args);
      }
      break;
    case 'error':
      if ((logLevel & LogLevel.Errors) == LogLevel.Errors) {
        const arg = args?.[0];
        if (arg instanceof ExplorerError) {
          throw arg;
        }

        console.error(...args);
      }
      break;
    case 'message':
    default:
      if ((logLevel & LogLevel.Messages) == LogLevel.Messages) {
        console.log(...args);
      }
      break;
  }
};

/**
 * Class representing some GPU device (ctx)
 *
 * @class
 * @constructor
 * @extends Disposable
 * @abstract
 */
export abstract class Device extends Disposable {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Device.name;

  /**
   * @desc default properties assoc. with this instance; used to fulfil props requirements on construction
   * @type {DeviceProps}
   * @static
   * @readonly
   */
  public static readonly DefaultProps: Required<DeviceProps> = {
    width: 0,
    height: 0,
    hidden: false,
    element: null,
    container: null,

    visible: false,

    autoResize: true,
    useDevicePixels: true,

    minPixelRatio: 1.0,
    maxPixelRatio: 2.0,

    clearAlpha: null,
    clearColor: null,
    premultipliedAlpha: true,

    attributes: null,

    logger: defaultLogger,
    logLevel: LogLevel.Debug,
  };

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
   * @desc properties used to construct this instance
   * @type {Required<DeviceProps>}
   * @readonly
   */
  public readonly props!: Required<DeviceProps>;

  /**
   * @desc this device's handle
   * @type {unknown}
   */
  public handle: unknown;

  /**
   * @desc the canvas element assoc. with this device
   * @type {HTMLCanvasElement | OffscreenCanvas}
   * @readonly
   */
  public readonly element!: HTMLCanvasElement | OffscreenCanvas;

  /**
   * @desc an event dispatcher used to signal changes made to this device and its canvas
   * @type {Signal}
   * @readonly
   */
  public readonly changedSignal!: Signal;

  /**
   * @desc the type of canvas associated with this device
   * @type {CanvasType}
   * @readonly
   */
  public readonly canvasType: CanvasType = 'unknown';

  /**
   * @desc reference to this device's context type
   * @type {DeviceType}
   * @readonly
   */
  public abstract readonly deviceType: DeviceType;

  /**
   * @desc a cache of the limits associated with this device
   * @type {Record<PropertyKey, number>}
   * @protected
   * @readonly
   */
  protected readonly _limits!: Record<PropertyKey, number>;

  /**
   * @desc the type of browser that this client is using
   * @type {BrowserType}
   * @protected
   */
  private _browser?: BrowserType;

  /**
   * @desc the computed width of this instance's (off-screen) canvas / fbo
   * @type {number}
   * @protected
   */
  protected _width: number = 0;

  /**
   * @desc the computed height of this instance's (off-screen) canvas / fbo
   * @type {number}
   * @protected
   */
  protected _height: number = 0;

  /**
   * @desc the computed width of this instance's drawing buffer
   * @type {number}
   * @protected
   */
  protected _drawBufferWidth: number = 1;

  /**
   * @desc the computed height of this instance's drawing buffer
   * @type {number}
   * @protected
   */
  protected _drawBufferHeight: number = 1;

  /**
   * @desc this device's canvas pixel width
   * @type {number}
   * @protected
   */
  protected _devicePixelWidth: number = 1;

  /**
   * @desc this device's canvas pixel height
   * @type {number}
   * @protected
   */
  protected _devicePixelHeight: number = 1;

  /**
   * @desc the computed device pixel ratio of this device, i.e. the ratio of its resolution in pixels
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
   * @type {number}
   * @protected
   */
  protected _devicePixelRatio: number = 1;

  /**
   * @desc specifies whether this device has successfully initialised
   * @type {boolean}
   * @protected
   */
  protected _initialised: boolean = false;

  /**
   * @desc a thenable that is resolved, or rejected, after initialisation
   * @type {Promise<this>}
   * @protected
   */
  protected _initialisedResolver!: Promise<this>;

  /**
   * @desc whether the canvas is visible, or intersects, with the viewport of the client
   * @type {boolean}
   * @protected
   */
  protected _canvasVisible: boolean = false;

  /**
   * @desc whether the document containing this device's canvas is currently visible
   * @type {boolean}
   * @protected
   */
  protected _documentVisible: boolean = true;

  /**
   * @desc this geometry's vertex array object instance
   * @see {@link VertexObject}
   * @type {VertexObject}
   * @readonly
   */
  protected readonly _vaos: Record<number, VertexObject> = {};

  /**
   * @desc a map of texture uniforms and their texture resources
   * @type {WeakMap<ITexture, TextureObject>}
   * @protected
   * @readonly
   */
  protected readonly _textures: WeakMap<ITexture, TextureObject> = new WeakMap<ITexture, TextureObject>();

  /**
   * @desc describes the assoc. between a RenderTarget and its assoc. frame buffer
   * @see {@link WebGLFrameBufferObject}
   * @see {@link RenderTarget}
   * @see {@link WebGLFrameBufferObject}
   * @type {WeakMap<IFrameBuffer, FrameBufferObject>}
   * @readonly
   */
  protected readonly _fbos: WeakMap<IFrameBuffer, FrameBufferObject> = new WeakMap<IFrameBuffer, FrameBufferObject>();

  /**
   * @desc describes association between materials and render pipelines
   * @see {@link WeakMap<IMaterialProps, WebGLRenderPipeline>}
   * @type {WeakMap<IMaterialProps, RenderPipeline>}
   * @readonly
   */
  protected readonly _pipelines: WeakMap<IMaterialProps, RenderPipeline> = new WeakMap<IMaterialProps, RenderPipeline>();

  /**
   * @param {DeviceProps} props this device's constructor props; see {@link DeviceProps}
   */
  public constructor(props: DeviceProps) {
    super();

    props = { ...Device.DefaultProps, ...props };
    props.clearAlpha = props.clearAlpha ?? 0;
    props.clearColor = props.clearColor ?? [0, 0, 0];

    this.id = Device._ref++;
    this.props = props as Required<DeviceProps>;
    this._limits = {};

    // Manage signals
    this.changedSignal = new Signal({ bufferLast: true });
    this._disposables.push(() => this.changedSignal.dispose());

    // Initialise canvas
    if (!props.element) {
      this.element = Utils.createCanvasElement(props);
      this.canvasType = 'OnscreenCanvas';
    } else if (typeof props.element === 'string') {
      const element = document.querySelector(props.element);
      if (!element) {
        throw new ExplorerError({
          code: ExplorerError.Errors.InvalidCanvasElement,
          msg: `Failed to find canvas matching Selector<'${props.element}'>`,
        });
      }

      if (!isHTMLCanvasElement(element)) {
        throw new ExplorerError({
          code: ExplorerError.Errors.InvalidCanvasElement,
          msg: `Expected HTMLCanvasElement on Selector<'${props.element}'> but got ${element.nodeType}`,
        });
      }
      this.element = element;
      this.canvasType = 'OnscreenCanvas';
    } else if (isHTMLCanvasElement(props.element)) {
      this.element = props.element;
      this.canvasType = 'OnscreenCanvas';
    } else if (isOffscreenCanvas(props.element)) {
      this.element = props.element;
      this.canvasType = 'OffscreenCanvas';
    }

    // Manage device
    this.initialise();
  }

  /**
   * @desc {@link Device} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Device} specifying whether the input is a {@link Device}
   */
  public static Is(obj: unknown): obj is Device {
    return obj instanceof Device;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Device';
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
   * @type {string}
   * @public
   */
  public get [Symbol.toStringTag](): string {
    return `Device<id: ${this.id}, device: ${this.deviceType}, canvas: ${this.canvasType}>`;
  }

  /**
   * @returns {number} computes this instance's clear colour alpha value
   */
  public get clearAlpha(): number {
    return NumberUtils.clamp(this.props.clearAlpha ?? 0, 0, 1);
  }

  /**
   * @returns {number} computes this instance's clear colour alpha multiplier
   */
  public get alphaMultiplier(): number {
    if (this.props.premultipliedAlpha) {
      return this.clearAlpha;
    }

    return 1;
  }

  /**
   * @abstract
   *
   * @returns {boolean} whether this device has lost its context
   */
  public abstract get contextLost(): boolean;

  /**
   * @see https://github.com/gpuweb/gpuweb/issues/4284
   * @abstract
   *
   * @returns {number} max supported buffers
   */
  public abstract get maxVertexBuffers(): number;

  /**
   * @abstract
   *
   * @returns {number} max number of attributes in a shader
   */
  public abstract get maxVertexAttributes(): number;

  /**
   * @abstract
   *
   * @returns {number} max number of varying components in a shader
   */
  public abstract get maxVaryingComponents(): number;

  /**
   * @abstract
   *
   * @returns {number} max num. of color attachments per glsl pipeline
   */
  public abstract get maxDrawBuffers(): number;

  /**
   * @abstract
   *
   * @returns {number} max num. of color attachments per glsl pipeline
   */
  public abstract get maxColorAttachments(): number;

  /**
   * @abstract
   *
   * @returns {number} max renderbuffer dimensions
   */
  public abstract get maxRenderBufferSize(): number;

  /**
   * @abstract
   *
   * @returns {number} max 2d texture size
   */
  public abstract get maxTextureDimension2D(): number;

  /**
   * @abstract
   *
   * @returns {number} max web glsl 3d texture size
   */
  public abstract get maxTextureDimension3D(): number;

  /**
   * @abstract
   *
   * @returns {number} max layers in a 2D texture array
   */
  public abstract get maxTextureArrayLayers(): number;

  /**
   * @abstract
   *
   * @returns {number} max number of texture units a fragment shader can reference
   */
  public abstract get maxFragmentTextureUnits(): number;

  /**
   * @abstract
   *
   * @returns {number} max number of texture units a vertex shader can reference
   */
  public abstract get maxVertexTextureUnits(): number;

  /**
   * @abstract
   *
   * @returns {number} max number of texture units that exist
   */
  public abstract get maxCombinedTextureUnits(): number;

  /**
   * @abstract
   *
   * @returns {number} max number of UBOs that can be bound
   */
  public abstract get maxUniformBufferBindings(): number;

  /**
   * @abstract
   *
   * @returns {number} max size of the UBO memory block
   */
  public abstract get maxUniformBufferBindingSize(): number;

  /**
   * @abstract
   *
   * @returns {number} min alignment between UBO struct layouts
   */
  public abstract get minUniformBufferOffsetAlignment(): number;

  /**
   * @returns {boolean} whether this device has been successfully initialised
   */
  public get isInitialised(): boolean {
    return this._initialised;
  }

  /**
   * @returns {boolean} whether this device's canvas is currently visible
   */
  public get visible(): boolean {
    return !!this.props.visible;
  }

  /**
   * @returns {BrowserType} the browser associated with this device's canvas
   */
  public get browser(): BrowserType {
    let browser = this._browser;
    if (typeof browser === 'undefined') {
      browser = Utils.getBrowserType();
      this._browser = browser;
    }

    return browser;
  }

  /**
   * @returns {number} the width of this device's canvas / fbo
   */
  public get width(): number {
    return this._width;
  }

  /**
   * @returns {number} the height of this device's canvas / fbo
   */
  public get height(): number {
    return this._height;
  }

  /**
   * @returns {number} the computed aspect ratio of this device's canvas / fbo
   */
  public get aspectRatio(): number {
    return this._width / this._height;
  }

  /**
   * @returns {[number, number]} the size of this device's canvas / fbo
   */
  public get size(): [number, number] {
    return [this._width, this._height];
  }

  /**
   * @returns {number} the width of this device's drawing buffer
   */
  public get drawBufferWidth(): number {
    return this._drawBufferWidth;
  }

  /**
   * @returns {number} the height of this drawing buffer
   */
  public get drawBufferHeight(): number {
    return this._drawBufferHeight;
  }

  /**
   * @returns {[number, number]} the size of this device's drawing buffer
   */
  public get drawBufferSize(): [number, number] {
    return [this._drawBufferWidth, this._drawBufferHeight];
  }

  /**
   * @returns {number} the maximum drawing buffer size of this device
   */
  public get maxDrawBufferSize(): number {
    return this.maxTextureDimension2D;
  }

  /**
   * @returns {number} the pixel width of this device's canvas / fbo
   */
  public get devicePixelWidth(): number {
    return this._devicePixelWidth;
  }

  /**
   * @returns {number} the pixel height of this device's canvas / fbo
   */
  public get devicePixelHeight(): number {
    return this._devicePixelHeight;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
   * @returns {number} the computed device pixel ratio of this device, i.e. the ratio of its resolution in pixels
   */
  public get devicePixelRatio(): number {
    return this._devicePixelRatio;
  }

  /**
   * @returns {[number, number]} the pixel size of this device's canvas / fbo
   */
  public get devicePixelSize(): [number, number] {
    return [this._devicePixelWidth, this._devicePixelHeight];
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
   * @abstract
   *
   * @param {RenderPipelineProps} props {@link RenderPipelineProps}
   *
   * @returns {RenderPipeline} the constructed pipeline
   */
  public abstract createRenderPipeline(props: RenderPipelineProps): RenderPipeline;

  /**
   * @desc constructs a GPU VAO resource
   * @abstract
   *
   * @returns {VertexObject} a wrapper containing one or more VAOs
   */
  public abstract createVertexArrayObject(): VertexObject;

  /**
   * @desc constructs a GPU UBO resource
   * @abstract
   *
   * @param {string} name       the name of this uniform
   * @param {number} byteLength the byte length of this uniform's buffer
   * @param {number} blockIndex specifies corresponding active uniform block in the render pipeline
   *
   * @returns {UniformBufferObject} class wrapping a UBO
   */
  public abstract createUniformBufferObject(name: string, byteLength: number, blockIndex: number): UniformBufferObject;

  /**
   * @desc constructs a GPU buffer resource
   * @abstract
   *
   * @param {number}     [target] the buffer target; one of `GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER | GL.UNIFORM_BUFFER`
   * @param {number}     [usage]  the buffer usage hint; one of `GL.STATIC_DRAW | GL.DYNAMIC_DRAW`
   * @param {TypedArray} [data]   optionally specify the initialisation data
   *
   * @returns {BufferObject} class wrapping a buffer resource
   */
  public abstract createBuffer(target?: number, usage?: number, data?: TypedArray): BufferObject;

  /**
   * @desc constructs a GPU texture resource
   * @abstract
   *
   * @param {ITexture} props properties describing some texture or the texture itself
   *
   * @returns {TextureObject} class representing a texture resource
   */
  public abstract createTexture(props: ITexture): TextureObject;

  /**
   * @desc constructs a GPU frame buffer, its render buffer and other assoc. resources
   * @abstract
   *
   * @param {FrameBufferProps} props props describing some FBO
   *
   * @returns {FrameBufferObject} class wrapping some FBO
   */
  public abstract createFrameBuffer(props: any): FrameBufferObject;

  /**
   * @desc renders a primitive from array data
   * @abstract
   *
   * @param {DrawMode} drawMode specifies the primitive type to render
   * @param {number}   first    specifies the start index in the array
   * @param {number}   count    specifies the number of indices to be rendered
   *
   * @returns {this}
   */
  public abstract drawArrays(drawMode: DrawMode, first: number, count: number): this;

  /**
   * @desc renders a primitive from array data
   * @abstract
   *
   * @param {DrawMode} drawMode  specifies the primitive type to render
   * @param {number}   first     specifies the start index in the array
   * @param {number}   count     specifies the number of indices to be rendered
   * @param {offset}   instCount specifies the number of instances of the element buf
   *
   * @returns {this}
   */
  public abstract drawArraysInstanced(drawMode: DrawMode, first: number, count: number, instCount: number): this;

  /**
   * @desc renders a primitive from array data
   * @abstract
   *
   * @param {DrawMode}  drawMode specifies the primitive type to render
   * @param {number}    count    specifies the number of elements bound to the elem. array
   * @param {ValueType} type     specifies the type of values contained by the buffer
   * @param {offset}    offset   specifies the byte offset in the element array
   *
   * @returns {this}
   */
  public abstract drawElements(drawMode: DrawMode, count: number, type: ValueType, offset: number): this;

  /**
   * @desc renders a primitive from array data
   * @abstract
   *
   * @param {DrawMode}  drawMode  specifies the primitive type to render
   * @param {number}    count     specifies the number of elements bound to the elem. array
   * @param {ValueType} type      specifies the type of values contained by the buffer
   * @param {offset}    offset    specifies the byte offset in the element array
   * @param {offset}    instCount specifies the number of instances of the element buf
   *
   * @returns {this}
   */
  public abstract drawElementsInstanced(drawMode: DrawMode, count: number, type: ValueType, offset: number, instCount: number): this;

  /**
   * @desc renders some object
   * @note see inherited classes
   * @abstract
   *
   * @param {PipelineDrawObj} obj      the obj to render
   * @param {Camera}          [camera] optionally specify the camera; used to compute the view transform, projection matrix etc
   *
   * @returns {this}
   */
  public abstract drawObject(obj: PipelineDrawObj, camera?: Camera): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {boolean} enabled specifies if this feature should be enabled
   *
   * @returns {this}
   */
  public abstract toggleCullMode(enabled: boolean): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {boolean} enabled specifies if this feature should be enabled
   *
   * @returns {this}
   */
  public abstract toggleDepthTest(enabled: boolean): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {boolean} enabled specifies if this feature should be enabled
   *
   * @returns {this}
   */
  public abstract toggleBlending(enabled: boolean): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {boolean} value desired state of the depth mask; i.e. whether to write to the depth buf
   *
   * @returns {this}
   */
  public abstract setDepthMask(value?: boolean): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {DepthComparator} value specifies a fn to compare pixel depths in the depth buffer
   *
   * @returns {this}
   */
  public abstract setDepthFunc(value?: DepthComparator): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {BlendOp} [src]      src rgb mode
   * @param {BlendOp} [dst]      dst rgb mode
   * @param {BlendOp} [srcAlpha] src alpha mode
   * @param {BlendOp} [dstAlpha] dst alpha mode
   *
   * @returns {this}
   */
  public abstract setBlendFunc(src?: BlendFunc, dst?: BlendFunc, srcAlpha?: BlendFunc, dstAlpha?: BlendFunc): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {BlendOp} [color] rgb mode
   * @param {BlendOp} [alpha] alpha mode
   *
   * @returns {this}
   */
  public abstract setBlendOp(color?: BlendOp, alpha?: BlendOp): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {CullMode} [value] specifies the faces that are candidates for culling
   *
   * @returns {this}
   */
  public abstract setCullMode(value?: CullMode): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {FrontFace} [value] specifies winding orientation
   *
   * @returns {this}
   */
  public abstract setFrontFace(value?: FrontFace): this;

  /**
   * @note see inherited classes
   * @abstract
   *
   * @param {CullMode} [x0] horizontal lower-left corner coord
   * @param {CullMode} [y0] vertical lower-left corner coord
   * @param {CullMode} [x1] width
   * @param {CullMode} [y1] height
   *
   * @returns {this}
   */
  public abstract setViewport(x0?: number, y0?: number, x1?: number, y1?: number): this;

  /**
   * @desc binds the specified FBO or sets the target to the current canvas
   * @abstract
   *
   * @param {any|null} [target] a FrameBuffer descriptor, or `null|undefined` if the canvas is desired
   *
   * @returns {this}
   */
  public abstract setRenderTarget(target?: IFrameBuffer | null): this;

  /**
   * @desc reads a block of pixels into a {@link TypedArray} from the current framebuffer
   * @abstract
   *
   * @param {number}          x      starting horizontal pixel of the read rect (lower-left)
   * @param {number}          y      starting vertical pixel of the read rect (lower-left)
   * @param {number}          w      pixel width of the read rect
   * @param {number}          h      pixel height of the read rect
   * @param {unknown}         format expected format of the pixel data
   * @param {unknown}         type   expected data type of the pixel data
   * @param {ArrayBufferView} dst    some {@link TypedArray} or {@link ArrayBufferView} in which to store the pixels
   *
   * @returns {this}
   */
  public abstract readPixels(x: number, y: number, w: number, h: number, format: unknown, type: unknown, dst: ArrayBufferView): this;

  /**
   * @todo need to impl. a wrapper around GL extensions to cache known availability
   *
   * @desc
   * @abstract
   */
  public abstract getExtension(): void; // WebGLExtension?

  /**
   * @todo need to impl. a wrapper around GL extensions to cache known availability
   *
   * @desc asserts that a set of extensions are contained by this device and are available for use
   * @abstract
   */
  public abstract expectExtensions(...exts: string[]): void; // WebGLExtension?

  /**
   * @todo need to impl. wrapper around webgl parameters + impl. caching
   *
   * @desc
   * @abstract
   */
  public abstract getParameters(): void; // WebGLParameter?

  /**
   * @todo need to impl. wrapper around webgl parameters + impl. caching
   *
   * @desc
   * @abstract
   */
  public abstract setParameters(): void; // WebGLParameter?

  /**
   * @desc
   * @abstract
   */
  public abstract resetParameters(): void; // WebGLParameter?

  /**
   * @abstract
   *
   * @param {CapabilityToggles|number} cap some capability to examine
   *
   * @returns {boolean} specifying whether this capability is currently enabled
   */
  public abstract isEnabled(cap: CapabilityToggles | number): boolean;

  /**
   * @desc attempts to resolve the limit assoc. with some device parameter
   * @abstract
   *
   * @param {any} parameter the parameter to query
   *
   * @returns {number} the assoc. numeric limit
   */
  public abstract getDeviceLimit(parameter: any): number; // WebGLDeviceLimit | WebGPUDeviceLimit

  /**
   * @desc sets the clear colour
   *
   * @param {number | Array<number>} color specify either (a) a scalar or (b) rgba values
   *
   * @returns {this}
   */
  public abstract setClearColor(color: number | Array<number>): this;

  /**
   * @desc clears the device's canvas
   * @note the clear colour is derived from the {@link DeviceProps}
   * @abstract
   *
   * @param {number} mask the mask used to clear the canvas
   *
   * @returns {this}
   */
  public abstract clear(mask?: number): this;

  /**
   * @desc logs a message
   *
   * @param {LogType} type the type of the message
   * @param {...*}    args variadic arguments to be passed to the message handler(s)
   */
  public log(type: LogType, ...args: any[]): this {
    this.props?.logger?.(type, this.props.logLevel, ...args);
    return this;
  }

  /**
   * @desc a thenable that is resolved once the device is initialised; including its width, height and device pixel ratio
   *
   * @returns {Promise<this>} a promise that resolves upon device initialisation
   */
  public initialised(): Promise<this> {
    if (this._initialised) {
      return Promise.resolve(this);
    }

    return this._initialisedResolver;
  }

  /**
   * @desc attempts to resize the drawing buffer
   *
   * @param {number} [width]  optional drawing buffer width
   * @param {number} [height] optional drawing buffer height
   *
   * @returns {this} this class
   */
  public setDrawBufferSize(width?: number, height?: number): this {
    width = typeof width === 'number' ? width : !this.props.useDevicePixels ? this._width : this._devicePixelWidth;

    this.element.width = width;
    this._drawBufferWidth = width;

    height = typeof height === 'number' ? height : !this.props.useDevicePixels ? this._height : this._devicePixelHeight;

    this.element.height = height;
    this._drawBufferHeight = height;

    return this;
  }

  /**
   * @desc copies the drawing buffer w/h into a {@link Vec2Like} object (or creates a new {@link Vec2} if unspecified)
   *
   * @param {T} [vec] optionally specify some vector; `Vec2` is constructed if no vector/arr is specified
   *
   * @returns {T} some Vec2(-like) | Vec3(-like) whose x/y components describe the draw buffer size
   */
  public copyDrawBufferSize<T extends Vec2Like | Vec3Like>(vec?: T): T {
    if (typeof vec === 'undefined') {
      vec = Vec2.Zero() as T;
    }

    if (Vec2.Is(vec) || Vec3.Is(vec)) {
      vec.set(this._drawBufferWidth, this._drawBufferWidth);
    } else {
      vec[0] = this._drawBufferWidth;
      vec[1] = this._drawBufferWidth;
    }

    return vec;
  }

  /**
   * @desc this device's initialisation method
   * @protected
   */
  protected initialise(): void {
    const width = this.element.width;
    const height = this.element.height;

    this._drawBufferWidth = width;
    this._drawBufferHeight = height;
    this._devicePixelWidth = width;
    this._devicePixelHeight = height;
    this._devicePixelRatio = Utils.getDevicePixelRatio({ browser: this.browser });

    switch (this.canvasType) {
      case 'OnscreenCanvas':
        const canvas = this.element as HTMLCanvasElement;
        this._width = canvas.clientWidth;
        this._height = canvas.clientHeight;

        // Create initialiser
        let deviceResolver!: (value: void | PromiseLike<void>) => void;
        this._initialisedResolver = new Promise<void>(resolve => {
          deviceResolver = resolve;
        }).then(() => {
          this._initialised = true;
          return this;
        });

        // Observe canvas size
        const resizeObserver = new ResizeObserver(entries => this.handleResize(entries));
        this._disposables.push(() => resizeObserver.disconnect());

        try {
          resizeObserver.observe(canvas, { box: 'device-pixel-content-box' });
        } catch {
          resizeObserver.observe(canvas, { box: 'content-box' });
        }

        // Observe canvas visibility
        const intersectionObserver = new IntersectionObserver(entries => this.handleIntersection(entries));
        intersectionObserver.observe(canvas);

        this._disposables.push(() => intersectionObserver.disconnect());

        // Observe document visibility
        const visibilityHandle = this.handleDocVisibility.bind(this);
        document.addEventListener('visibilitychange', visibilityHandle);

        this._disposables.push(() => document.removeEventListener('visibilitychange', visibilityHandle));

        // Observe device pixel ratio
        let ratioInitialised: boolean = false;
        const pixelRatioDisposable = Utils.listenToDevicePixelRatio({
          browser: this.browser,
          callback: (pixelRatio: number, _lastPixelRatio: number): void => {
            this.handleDevicePixelRatio(pixelRatio, !ratioInitialised);

            if (!ratioInitialised) {
              ratioInitialised = !ratioInitialised;
              deviceResolver();
            }
          },
        });

        this._disposables.push(() => pixelRatioDisposable());
        break;

      case 'OffscreenCanvas':
      default:
        this._width = width;
        this._height = height;

        this._initialised = true;
        this._initialisedResolver = Promise.resolve(this);
        break;
    }
  }

  /**
   * @desc handles resize events observed from this class' canvas element
   * @protected
   *
   * @param {ResizeObserverEntry[]} entries the `ResizeObserver` entries
   */
  protected handleResize(entries: ResizeObserverEntry[]): void {
    const entry = entries.find(e => e.target === this.element);
    if (!entry) {
      return;
    }

    const pixelRatio = Utils.getDevicePixelRatio({ browser: this.browser });
    const contentBoxSize = entry.contentBoxSize[0];
    const pixelContentSize = entry.devicePixelContentBoxSize?.[0];
    this._width = contentBoxSize.inlineSize;
    this._height = contentBoxSize.blockSize;

    let pixelWidth!: number;
    let pixelHeight!: number;
    if (pixelContentSize) {
      pixelWidth = pixelContentSize.inlineSize;
      pixelHeight = pixelContentSize.blockSize;
    } else {
      pixelWidth = contentBoxSize.inlineSize * pixelRatio;
      pixelHeight = contentBoxSize.blockSize * pixelRatio;
    }

    const lastPixelWidth = this._devicePixelWidth;
    const lastPixelHeight = this._devicePixelHeight;

    const maxSize = this.maxDrawBufferSize;
    this._devicePixelWidth = NumberUtils.clamp(pixelWidth, 1, maxSize);
    this._devicePixelHeight = NumberUtils.clamp(pixelHeight, 1, maxSize);

    if (lastPixelWidth !== this._devicePixelWidth || lastPixelHeight !== this._devicePixelHeight) {
      if (this.props.autoResize) {
        this.setDrawBufferSize();
      }

      this.changedSignal.fire('viewportSize', this.devicePixelSize, [lastPixelWidth, lastPixelHeight]);
    }
  }

  /**
   * @desc handles document visibility
   * @note merged with `handleIntersection` to describe canvas visibility
   */
  protected handleDocVisibility(): void {
    const docVisibility = document.visibilityState === 'visible' && typeof document?.hidden === 'boolean' && !document.hidden;
    if (docVisibility !== this._documentVisible) {
      this._documentVisible = docVisibility;
    }

    const visible = docVisibility && this._canvasVisible;
    const lastVisibility = !!this.props.visible;
    if (visible !== lastVisibility) {
      this.props.visible = visible;
      this.changedSignal.fire('visibility', visible, lastVisibility);
    }
  }

  /**
   * @desc handles canvas element intersection events
   * @note merged with `handleDocVisibility` to describe canvas visibility
   * @protected
   *
   * @param {IntersectionObserverEntry[]} entries the `IntersectionObserver` entries
   */
  protected handleIntersection(entries: IntersectionObserverEntry[]): void {
    const entry = entries.find(e => e.target === this.element);
    if (!entry) {
      return;
    }

    const visible = !!entry.isIntersecting;
    const lastVisibility = this._canvasVisible;
    if (visible !== lastVisibility) {
      this._canvasVisible = visible;
      this.handleDocVisibility();
    }
  }

  /**
   * @desc handles device pixel ratio resize events derived from
   *       this class' canvas listener
   * @protected
   *
   * @param {number}      pixelRatio          the resolved device pixel ratio value
   * @param {forceSignal} [forceSignal=false] optionally specify whether to signal without testing inequality
   */
  protected handleDevicePixelRatio(pixelRatio: number, forceSignal: boolean = false): void {
    const lastPixelRatio = this._devicePixelRatio;
    if (forceSignal || lastPixelRatio !== pixelRatio) {
      this._devicePixelRatio = pixelRatio;
      this.changedSignal.fire('devicePixelRatio', pixelRatio, lastPixelRatio);
    }
  }
}
