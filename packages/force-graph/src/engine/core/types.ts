import { hasTypedProperty } from '@engine/common';
import type { Camera, Geometry } from '@engine/objects';
import type { Uniform, ValueType } from './resources';

export type {
  Attribute,
  AttributePartial,
  AttributeTarget,
  ValueType,
  AttributeUsage,
  PipelineUniform,
  PipelineAttribute,
  BufferLayout,
  RenderPipelineProps,
  UniformBufferObject,
} from './resources';

export type { Uniform };

/**
 * @desc describes some attribute data buffer view
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Data
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
 */
export type TypedArray = Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array;

/**
 * @desc describes some {@link TypedArray} / `DataView` constructor
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
 */
export interface TypedArrayBufferContructor<T extends ArrayBufferLike = ArrayBufferLike> {
  readonly prototype: T;
  new (length: number): T;
  new (array: ArrayLike<number>): T;
  new <TArrayBuffer extends ArrayBufferLike = ArrayBufferLike>(buffer: TArrayBuffer, byteOffset?: number, length?: number): T;
  new (array: ArrayLike<number> | ArrayBuffer): T;
}

/**
 * @desc ArrayBuffer type guard
 *
 * @param {unknown} obj some object to assess
 *
 * @returns {TypedArray} some typed ArrayBuffer derivative
 */
export const isTypedBuffer = (obj: unknown): obj is TypedArray => {
  return ArrayBuffer.isView(obj) && 'BYTES_PER_ELEMENT' in obj;
};

/**
 * @desc the logging message type, varies the behaviour of logged messages via {@link LoggingFunc}
 * @type {string}
 */
export type LogType = 'message' | 'warn' | 'error';

/**
 * @desc app logging level, varies the behaviour of logged messages via {@link LoggingFunc}
 * @type {enum}
 * @note
 *  | Name       | Info                                  | Value |
 *  |------------|---------------------------------------|-------|
 *  | None       | All logs will be ignored              |     0 |
 *  | Messages   | Only messages will be logged          |     1 |
 *  | Warnings   | Only warnings will be logged          |     2 |
 *  | Errors     | Only errors will be logged            |     4 |
 *  | IssuesOnly | Only warnings & errors will be logged |     6 |
 *  | Debug      | All messages will be logged           |     7 |
 */
// prettier-ignore
export enum LogLevel {
  //                         | Binary   | Decimal |
  //                         |----------|---------|
  None       =         0, // | 00000000 |  0      |
  Messages   =    1 << 0, // | 00000001 |  1      |
  Warnings   =    1 << 1, // | 00000010 |  2      |
  Errors     =    1 << 2, // | 00000100 |  4      |
  IssuesOnly =     2 | 4, // | 00000110 |  6      |
  Debug      = 1 | 2 | 4, // | 00000111 |  7      |
}

/**
 * @desc describes some gpu capability that can toggled and queried via the device ctx
 * @note
 *  - e.g. in WebGL these can be tested via `isEnabled()`
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isEnabled
 * @type {string}
 */
export type CapabilityToggles =
  | 'Blend'
  | 'Dither'
  | 'CullFace'
  | 'DepthTest'
  | 'StencilTest'
  | 'ScissorTest'
  | 'SampleCoverage'
  | 'RasterizerDiscard'
  | 'PolygonOffsetFill'
  | 'SampleAlphaToCoverage';

/**
 * @desc a logging function used to transform & propagate/redirect logs given the log type & current logging level
 * @see {@link LogType} and {@link LogLevel}
 * @type {Function}
 */
export type LoggingFunc = (type: LogType, logLevel: number, ...args: any[]) => any;

/**
 * @desc the resolved gpu device type described by some canvas context
 * @note `webgl2` is adapted to `webgl` to simplify the type
 * @type {string}
 */
export type DeviceType = 'unknown' | 'webgl'; // ... future webgpu device

/**
 * @desc specifies the canvas type associated with some device
 * @type {string}
 */
export type CanvasType = 'unknown' | 'OnscreenCanvas' | 'OffscreenCanvas';

/**
 * @desc describes the shader type, one of fragment | vertex shader
 * @see {@link https://www.khronos.org/opengl/wiki/Fragment_Shader|Fragment Shader}
 * @see {@link https://www.khronos.org/opengl/wiki/Vertex_Shader|Vertex Shader}
 * @type {string}
 */
export type ShaderType = 'frag' | 'vert';

/**
 * @desc specifies which side of a face should be drawn
 * @type {string}
 */
export type CullMode = 'front' | 'back' | 'both';

/**
 * @desc describes the winding order of polygons
 * @type {string}
 */
export type FrontFace = 'CCW' | 'CW';

/**
 * @desc describes how to compare pixel depth
 * @type {string}
 */
export type DepthComparator = 'never' | 'less' | 'less-equal' | 'equal' | 'not-equal' | 'greater' | 'greater-equal' | 'always';

/**
 * @desc describes how to blend between pixels
 * @type {string}
 */
export type BlendFunc =
  | 'zero'
  | 'one'
  | 'one-minus-src'
  | 'one-minus-src-alpha'
  | 'one-minus-src1'
  | 'one-minus-src1-alpha'
  | 'one-minus-dst'
  | 'one-minus-dst-alpha'
  | 'one-minus-constant'
  | 'src'
  | 'src-alpha'
  | 'src-alpha-saturated'
  | 'src1'
  | 'src1-alpha'
  | 'dst'
  | 'dst-alpha'
  | 'constant'
  | 'constant-alpha';

/**
 * @desc describes the blend equation
 * @type {string}
 */
export type BlendOp = 'add' | 'sub' | 'rev-sub' | 'min' | 'max';

/**
 * @desc specifies the primitive type when drawing geometry
 * @type {string}
 */
export type DrawMode = 'points' | 'lines' | `line-loop` | `line-strip` | 'triangles' | `triangle-fan` | `triangle-strip`;

/**
 * @desc some image source data
 */
export type ImageType =
  | TypedArray
  | ImageData
  | ImageBitmap
  | HTMLImageElement
  | VideoFrame
  | HTMLVideoElement
  | OffscreenCanvas
  | HTMLCanvasElement;

/**
 * @desc describes the underlying texture data type
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @type {string}
 */
export type TextureType =
  | ValueType
  | 'uint-24-8'
  | 'uint-5-9-9-9-rev'
  | 'uint-10f-11f-11f-rev'
  | 'uint-2-10-10-10-10-rev'
  | 'ushort-5-6-5'
  | 'ushort-5-5-5-1'
  | 'ushort-4-4-4-4'
  | 'float-uint-24-8-rev';

/**
 * @desc describes the texture format
 * @note we don't handle compressed textures as of yet; can add later
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @type {string}
 */
export type TextureFormat =
  | 'red'
  | 'red-int'
  | 'rg'
  | 'rg-int'
  | 'rgb'
  | 'rgb-int'
  | 'rgba'
  | 'rgba-int'
  | 'srgb'
  | 'lum'
  | 'alpha'
  | 'lum-alpha'
  | 'depth'
  | 'depth-stencil';

/**
 * @desc describes the internal texture format
 * @note
 *  1. We don't handle compressed textures as of yet; can add later if required
 *  2. We haven't included all formats, e.g. we're missing 48-bit fmt, 96-bit fmt and some bit-packed fmts etc
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @type {string}
 */
export type TextureInternalFmt =
  // 8-bit fmt(s)
  | 'r8'
  | 'r8-snorm'
  | 'r8-byte'
  | 'r8-ubyte'
  // 16-bit fmt(s)
  | 'r16-short'
  | 'r16-ushort'
  | 'r16-half-float'
  | 'rg8'
  | 'rg8-snorm'
  | 'rg8-byte'
  | 'rg8-ubyte'
  // 24-bit fmt(s)
  | 'rgb8'
  | 'rgb8-snorm'
  // 32-bit fmt(s)
  | 'r32-int'
  | 'r32-uint'
  | 'r32-float'
  | 'rgba8'
  | 'rgba8-snorm'
  | 'srgb8a8-byte'
  | 'rgba8-byte'
  | 'rgba8-ubyte'
  | 'rg16-short'
  | 'rg16-ushort'
  | 'rg16-half-float'
  // 64-bit fmt(s)
  | 'rg32-int'
  | 'rg32-uint'
  | 'rg32-float'
  | 'rgba16-short'
  | 'rgba16-ushort'
  | 'rgba16-half-float'
  // 96-bit fmt(s)
  | 'rgb32-float'
  // 128-bit fmt(s)
  | 'rgba32-int'
  | 'rgba32-uint'
  | 'rgba32-float'
  // Stencil fmt(s)
  | 'stencil8-ubyte'
  // Depth fmt(s)
  | 'depth16-ushort'
  | 'depth24-uint'
  | 'depth32-float'
  | 'depth24_stencil8'
  | 'depth32-float_stencil8';

/**
 * @desc image data, or a set of image data, assoc. with some {@link ITexture}
 */
export type ImageReference = ImageType | Array<ImageType>;

/**
 * @desc specifies whether this texture is a 2d tex or a 3d cube map, and by extension, the dimension of this texture
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @type {string}
 */
export type TextureTarget = 'texture2d' | 'texture2d-array' | 'cube' | 'texture3d';

/**
 * @desc describes how to apply a texture to pixels
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @type {string}
 */
export type TextureFilter = 'nearest' | 'linear';

/**
 * @desc describes how a texture repeats/clamps top the edge of a surface
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @type {string}
 */
export type TextureWrap = 'clamp' | 'repeat' | 'mirror';

/**
 * @desc describes some Texture object
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 *
 * @property {ImageReference}     [image]               optionally specifies some image data; default `undefined`
 * @property {TextureType}        [type]                i.e. descriptor of the gpu type
 * @property {TextureFormat}      [format]              specifying the colour components in the texture
 * @property {TextureInternalFmt} [internalFormat]      internal ref. to the gpu format
 * @property {TextureTarget}      [target='texture2d']  dimension, or target, of this texture
 * @property {TextureFilter}      [magFilter='nearest'] texel sampling behaviour when pixel > 1
 * @property {TextureFilter}      [minFilter='nearest'] texel sampling behaviour when pixel < 1
 * @property {number}             [width=1]             width dimension
 * @property {number}             [height=1]            height dimension
 * @property {number}             [depth=1]             depth dimension (e.g. cube map)
 * @property {TextureWrap}        [wrapU='clamp']       horizontal uv wrapping behaviour
 * @property {TextureWrap}        [wrapV='clamp']       vertical uv wrapping behaviour
 * @property {TextureWrap}        [wrapW='clamp']       depth uv wrapping behaviour
 * @property {boolean}            [mipmaps=true]        whether to generate mipmaps, see webgl reference here: {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/generateMipmap|generateMipmap}
 * @property {number}             [level=0]             specifies the tex mipmap level
 * @property {boolean}            [flipY=true]          whether to flip the texture when pushing the image buffer to the gpu
 * @property {boolean}            [anisotropy=1]        the number of samples for anisotropic filtering, see webgl reference here: {@link https://developer.mozilla.org/en-US/docs/Web/API/EXT_texture_filter_anisotropic|anistropic filtering}
 * @property {boolean}            [needsUpdate=false]   specifies whether this this texture needs to be updated
 * @property {number}             [alignment=4]         specifies how to read the tex. components
 */
export interface ITexture {
  image?: ImageReference | null;
  type: TextureType;
  format: TextureFormat;
  internalFormat: TextureInternalFmt;
  readonly target: TextureTarget;
  magFilter: TextureFilter;
  minFilter: TextureFilter;
  width: number;
  height: number;
  depth: number;
  level: number;
  wrapU: TextureWrap | null;
  wrapV: TextureWrap | null;
  wrapW: TextureWrap | null;
  mipmaps: boolean;
  flipY: boolean;
  anisotropy: number;
  alignment: number;
}

/**
 * @desc describes the content of a render buffer
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderbuffer
 * @type {enum}
 */
// prettier-ignore
export enum RenderBufferType {
  //                           | Binary   | Decimal |
  //                           |----------|---------|
  None            =      0, // | 00000000 |  0      |
  Depth           = 1 << 0, // | 00000001 |  1      |
  Stencil         = 1 << 1, // | 00000010 |  2      |
  DepthAndStencil =  1 | 2, // | 00000011 |  3      |
}

/**
 * @desc describes properties assoc. with some RenderTarget
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLFramebuffer
 * @see {@link RenderTarget}
 * @see {@link FrameBufferObject}
 * @see {@link WebGLFrameBufferObject}
 *
 * @property {number}           width            specifies the width of the render buffer
 * @property {number}           height           specifies the height of the render buffer
 * @property {Array<ITexture>}  textures         specifies the textures associated with this fbo
 * @property {number}           attachments      specifies the number of attachments expected by this fbo
 * @property {RenderBufferType} renderBufferType specifies whether to use depth/stencil buffers (if any)
 * @property {boolean}          [needsUpdate]    describes whether this fbo and assoc. attachments needs to be updated
 */
export interface IFrameBuffer {
  width: number;
  height: number;
  textures: Array<ITexture>;
  attachments: number;
  renderBufferType: RenderBufferType;
  needsUpdate?: boolean;
}

/**
 * @desc describes properties assoc. with some FBO
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLFramebuffer
 * @see {@link FrameBufferObject}
 * @see {@link WebGLFrameBufferObject}
 */
export type FrameBufferProps = Omit<IFrameBuffer, 'attachments'>;

/**
 * @desc describes props used to construct some gpu context
 * @desc {@link Device} constructor props
 * @see {@link Device} and {@link Adapter}
 *
 * @property {number|null}                 [width]              initial width of the canvas
 * @property {number|null}                 [height]             initial height of the canvas
 * @property {boolean|null}                [hidden]             det. whether to hide the canvas on init (ignored if automatic management flagged)
 * @property {HTMLElement|string|null}     [element]            either (a) some {@link HTMLCanvasElement} or its derivative, or (b) a reference to said canvas - created automatically if not specified
 * @property {HTMLElement|string|null}     [container]          the container in which to insert a {@link HTMLCanvasElement} if not specified by the `element` property
 * @property {boolean|null}                [visible]            describes whether this canvas is visible to the client; can be used to set initial state but will be updated if managed by the {@link Device}
 * @property {boolean|null}                [autoResize]         specifies whether the {@link Device} should manage listening to canvas & window size/dpr changes
 * @property {boolean|null}                [useDevicePixels]    specifies whether to use pixel sizing / device pixel ratio instead of relying on the HTML size of the canvas
 * @property {number}                      [minPixelRatio]      specifies the minimum allowed value of the `devicePixelRatio` when calculated by the {@link Device}
 * @property {number}                      [maxPixelRatio]      specifies the maximum allowed value of the `devicePixelRatio` when calculated by the {@link Device}
 * @property {number}                      [clearAlpha]         specifies the alpha channel clear value; defaults to `0`
 * @property {Array<number>}               [clearColor]         describes an array of at 3 numbers that specify the rgb channel clear values; defaults to `[0, 0, 0]`
 * @property {boolean|null}                [premultipliedAlpha] specifies whether to use straight alpha or premultiplied alpha; see {@link https://microsoft.github.io/Win2D/WinUI3/html/PremultipliedAlpha.htm|Premultiplied Alpha}
 * @property {WebGLContextAttributes|null} [attributes]         specifies the {@link https://registry.khronos.org/webgl/specs/latest/1.0/#2|GPU Context Attributes}
 * @property {LoggingFunc}                 [logger]             specifies the func used to log events to stdout
 * @property {LogLevel}                    [logLevel]           specifies the message filter for the `logger` property
 */
export interface DeviceProps {
  width?: number | null;
  height?: number | null;
  hidden?: boolean | null;
  element?: HTMLCanvasElement | OffscreenCanvas | string | null;
  container?: HTMLElement | string | null;

  visible?: boolean | null;

  autoResize?: boolean | null;
  useDevicePixels?: boolean | null;

  minPixelRatio?: number;
  maxPixelRatio?: number;

  clearAlpha?: number | null;
  clearColor?: [number, number, number] | null;
  premultipliedAlpha?: boolean | null;

  attributes?: WebGLContextAttributes | null;

  logger?: LoggingFunc;
  logLevel?: LogLevel;
}

/**
 * @desc {@link Adapter} constructor props
 * @see {@link Device} and {@link Adapter}
 *
 * @property {DeviceType|null} [type] describes the desired GPU context type for the instantiable {@link Device}
 */
export interface AdapterProps extends DeviceProps {
  type?: DeviceType | null;
}

/**
 * @desc {@link ITexture} type-guard
 *
 * @param {unknown} obj some object to consider
 *
 * @returns {obj is ITexture} specifying whether the input is a {@link ITexture}
 */
export const isTexResourceLike = (obj: unknown): obj is ITexture => {
  return obj instanceof Object && hasTypedProperty(obj, 'target', 'string', ['texture2d', 'cube']);
};

/**
 * @desc describes props. used to construct a Material augmenting some render pipeline
 * @see {@link Material}
 *
 * @property {number}                     id              an instance's internal ID
 * @property {string}                     vs              the vertex shader source assoc. with this material
 * @property {string}                     fs              the fragment shader source assoc. with this material
 * @property {Record<string, any> | null} [defines]       any defines that should be appended to the shader on assembly
 * @property {Record<string, string>}     [includes]      include directive lookup
 * @property {string}                     [version]       the desired shader language version; defaults to `300 es` if device is `webgl`
 * @property {Record<string, Uniform>}    [uniforms]      the uniforms assoc. with this material and its render pipeline
 * @property {CullMode}                   [cullMode]      specifies how to cull the geometry
 * @property {FrontFace}                  frontFace       specifies the polygon winding order of any assoc. geometry
 * @property {boolean}                    depthTest       specifies whether to test a fragments depth against the depth sampler its being written to
 * @property {boolean}                    depthWrite      specifies whether to write to the depth buffer/sampler
 * @property {DepthComparator}            depthComp       specifies how to compare depth values
 * @property {boolean}                    transparent     specifies whether this material should support transparency
 * @property {BlendFunc}                  [blendSrc]      specifies the mechanism used to blend the fragment's output colour vector
 * @property {BlendFunc}                  [blendDst]      specifies the mechanism used to blend the current (destination) colour vector
 * @property {BlendFunc}                  [blendSrcAlpha] specifies the mechanism used to blend the current (destination) alpha scalar
 * @property {BlendFunc}                  [blendDstAlpha] specifies the mechanism used to blend the current (destination) alpha scalar
 * @property {BlendOp}                    [blendOp]       specifies the colour vector blend equation
 * @property {BlendOp}                    [blendOpAlpha]  specifies the alpha scalar blend equation
 */
export interface IMaterialProps {
  id: number;
  vs: string;
  fs: string;
  defines?: Record<string, any> | null;
  includes?: Record<string, string> | null;
  version?: string;
  uniforms: Record<string, Uniform>;
  cullMode?: CullMode;
  frontFace: FrontFace;
  depthTest: boolean;
  depthWrite: boolean;
  depthComp: DepthComparator;
  transparent: boolean;
  blendSrc?: BlendFunc;
  blendDst?: BlendFunc;
  blendSrcAlpha?: BlendFunc;
  blendDstAlpha?: BlendFunc;
  blendOp?: BlendOp;
  blendOpAlpha?: BlendOp;
}

/**
 * @desc describes some renderable object to be drawn by a {@link Device}
 *
 * @property {Material} material       specifies the material (and render pipeline) associated with some renderable obj
 * @property {Geometry} [geometry]     optionally specify some geometry (and attributes) associated with some renderable obj
 * @property {Function} [updateRender] optionally specify some function to update the geometry, material & transform assoc. with the object before rendering
 */
export interface PipelineDrawObj {
  ClassName?: string;
  material?: IMaterialProps;
  geometry?: Geometry;

  isA?(className: string): boolean;
  updateRender?(camera: Camera): this;
}
