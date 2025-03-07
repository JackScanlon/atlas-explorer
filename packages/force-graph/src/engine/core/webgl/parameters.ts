import { GL } from './constants';
import type {
  DepthComparator,
  BlendFunc,
  BlendOp,
  TextureFilter,
  TextureWrap,
  DrawMode,
  AttributeTarget,
  ValueType,
  AttributeUsage,
  TextureType,
  TextureFormat,
  TextureTarget,
  TextureInternalFmt,
  CapabilityToggles,
} from '@engine/core/types';

/**
 * @desc maps {@link CapabilityToggles} to {@link GL} enum describing some param that can be examined using `isEnabled()`
 * @see {@link GL_TOGGLEABLE}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isEnabled
 * @constant
 */
// prettier-ignore
export const GL_CAP_TGL: Record<CapabilityToggles, number> = {
  'Blend': GL.BLEND,
  'Dither': GL.DITHER,
  'CullFace': GL.CULL_FACE,
  'DepthTest': GL.DEPTH_TEST,
  'StencilTest': GL.STENCIL_TEST,
  'ScissorTest': GL.SCISSOR_TEST,
  'SampleCoverage': GL.SAMPLE_COVERAGE,
  'RasterizerDiscard': GL.RASTERIZER_DISCARD,
  'PolygonOffsetFill': GL.POLYGON_OFFSET_FILL,
  'SampleAlphaToCoverage': GL.SAMPLE_ALPHA_TO_COVERAGE,
};

/**
 * @desc describes WebGL parameters that can only be examined using `isEnabled()`
 * @see {@link GL_CAP_TGL}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isEnabled
 * @constant
 */
// prettier-ignore
export const GL_TOGGLEABLE: Record<number, boolean> = {
  [GL.BLEND]: true,
  [GL.DITHER]: true,
  [GL.CULL_FACE]: true,
  [GL.DEPTH_TEST]: true,
  [GL.SCISSOR_TEST]: true,
  [GL.STENCIL_TEST]: true,
  [GL.SAMPLE_COVERAGE]: true,
  [GL.RASTERIZER_DISCARD]: true,
  [GL.POLYGON_OFFSET_FILL]: true,
  [GL.SAMPLE_ALPHA_TO_COVERAGE]: true,
};

/**
 * @desc specifies the primitive render type
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays#mode
 * @constant
 */
// prettier-ignore
export const GL_DRAW: Record<DrawMode, number> = {
  'points': GL.POINTS,
  'lines': GL.LINES,
  'line-loop': GL.LINE_LOOP,
  'line-strip': GL.LINE_STRIP,
  'triangles': GL.TRIANGLES,
  'triangle-fan': GL.TRIANGLE_FAN,
  'triangle-strip': GL.TRIANGLE_STRIP,
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc
 * @constant
 */
// prettier-ignore
export const GL_DEPTH_COMP: Record<DepthComparator, number> = {
  'never': GL.NEVER,
  'less': GL.LESS,
  'less-equal': GL.LEQUAL,
  'equal': GL.EQUAL,
  'not-equal': GL.NOTEQUAL,
  'greater': GL.GREATER,
  'greater-equal': GL.GEQUAL,
  'always': GL.ALWAYS,
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFuncSeparate
 * @constant
 */
// prettier-ignore
export const GL_BLEND_FUNC: Record<BlendFunc, number> = {
  'zero': GL.ZERO,
  'one': GL.ONE,
  'one-minus-src': GL.ONE_MINUS_SRC_COLOR,
  'one-minus-src-alpha': GL.ONE_MINUS_SRC_ALPHA,
  'one-minus-src1': GL.ONE_MINUS_SRC1_COLOR_WEBGL,
  'one-minus-src1-alpha': GL.ONE_MINUS_SRC1_ALPHA_WEBGL,
  'one-minus-dst': GL.ONE_MINUS_DST_COLOR,
  'one-minus-dst-alpha': GL.ONE_MINUS_DST_ALPHA,
  'one-minus-constant': GL.ONE_MINUS_CONSTANT_COLOR,
  'src': GL.SRC_COLOR,
  'src-alpha': GL.SRC_ALPHA,
  'src-alpha-saturated': GL.SRC_ALPHA_SATURATE,
  'src1': GL.SRC1_COLOR_WEBGL,
  'src1-alpha': GL.SRC1_ALPHA_WEBGL,
  'dst': GL.DST_COLOR,
  'dst-alpha': GL.DST_ALPHA,
  'constant': GL.CONSTANT_COLOR,
  'constant-alpha': GL.CONSTANT_ALPHA,
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquation
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendEquationSeparate
 * @constant
 */
// prettier-ignore
export const GL_BLEND_OP: Record<BlendOp, number> = {
  'add': GL.FUNC_ADD,
  'sub': GL.FUNC_SUBTRACT,
  'rev-sub': GL.FUNC_REVERSE_SUBTRACT,
  'min': GL.MIN,
  'max': GL.MAX,
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @constant
 */
// prettier-ignore
export const GL_TEX_FILTER: Record<TextureFilter, number> = {
  'nearest': GL.NEAREST,
  'linear': GL.LINEAR,
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @constant
 */
// prettier-ignore
export const GL_TEX_MIPMAP_FILTER: Record<TextureFilter, number> = {
  'nearest': GL.LINEAR_MIPMAP_NEAREST,
  'linear': GL.NEAREST_MIPMAP_LINEAR,
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @constant
 */
// prettier-ignore
export const GL_TEX_WRAP: Record<TextureWrap, number> = {
  'clamp': GL.CLAMP_TO_EDGE,
  'repeat': GL.REPEAT,
  'mirror': GL.MIRRORED_REPEAT,
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData#target
 * @constant
 */
// prettier-ignore
export const GL_BUF_TRG: Record<AttributeTarget, number> = {
  'array-buffer': GL.ARRAY_BUFFER,
  'element-array-buffer': GL.ELEMENT_ARRAY_BUFFER,
  'uniform-buffer': GL.UNIFORM_BUFFER,
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData#usage
 * @constant
 */
// prettier-ignore
export const GL_ATTR_USG: Record<AttributeUsage, number> = {
  'static': GL.STATIC_DRAW,
  'dynamic': GL.DYNAMIC_DRAW,
  'stream': GL.STREAM_DRAW,
};

/**
 * @desc attribute/texture/value data type
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer#type
 * @constant
 */
// prettier-ignore
export const GL_VALUE_TYPE: Record<ValueType, number> = {
  'byte': GL.BYTE,
  'ubyte': GL.UNSIGNED_BYTE,
  'short': GL.SHORT,
  'ushort': GL.UNSIGNED_SHORT,
  'int': GL.INT,
  'uint': GL.UNSIGNED_INT,
  'float': GL.FLOAT,
  'half-float': GL.HALF_FLOAT,
};

/**
 * @desc texture binding target map
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @constant
 */
// prettier-ignore
export const GL_TEX_TRG: Record<TextureTarget, number> = {
  'cube': GL.TEXTURE_CUBE_MAP,
  'texture3d': GL.TEXTURE_3D,
  'texture2d': GL.TEXTURE_2D,
  'texture2d-array': GL.TEXTURE_2D_ARRAY,
};

/**
 * @desc texture data type map
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @constant
 */
// prettier-ignore
export const GL_TEX_TYPE: Record<TextureType, number> = {
  'byte': GL.BYTE,
  'ubyte': GL.UNSIGNED_BYTE,
  'short': GL.SHORT,
  'ushort': GL.UNSIGNED_SHORT,
  'int': GL.INT,
  'uint': GL.UNSIGNED_INT,
  'float': GL.FLOAT,
  'half-float': GL.HALF_FLOAT,
  'uint-24-8': GL.UNSIGNED_INT_24_8,
  'uint-5-9-9-9-rev': GL.UNSIGNED_INT_5_9_9_9_REV,
  'uint-10f-11f-11f-rev': GL.UNSIGNED_INT_10F_11F_11F_REV,
  'uint-2-10-10-10-10-rev': GL.UNSIGNED_INT_2_10_10_10_REV,
  'ushort-5-6-5': GL.UNSIGNED_SHORT_5_6_5,
  'ushort-5-5-5-1': GL.UNSIGNED_SHORT_5_5_5_1,
  'ushort-4-4-4-4': GL.UNSIGNED_SHORT_4_4_4_4,
  'float-uint-24-8-rev': GL.FLOAT_32_UNSIGNED_INT_24_8_REV,
};

/**
 * @desc texture format map
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @constant
 */
// prettier-ignore
export const GL_TEX_FMT: Record<TextureFormat, number> = {
  'red': GL.RED,
  'red-int': GL.RED_INTEGER,
  'rg': GL.RG,
  'rg-int': GL.RG_INTEGER,
  'rgb': GL.RGB,
  'rgb-int': GL.RGB_INTEGER,
  'rgba': GL.RGBA,
  'rgba-int': GL.RGBA_INTEGER,
  'srgb': GL.SRGB,
  'alpha': GL.ALPHA,
  'depth': GL.DEPTH_COMPONENT,
  'depth-stencil': GL.DEPTH_STENCIL,
  'lum': GL.LUMINANCE,
  'lum-alpha': GL.LUMINANCE_ALPHA,
};

/**
 * @desc texture internal format map
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
 * @constant
 */
// prettier-ignore
export const GL_TEX_IFMT: Record<TextureInternalFmt, number> = {
  // 8-bit fmt(s)
  'r8': GL.R8,
  'r8-snorm': GL.R8_SNORM,
  'r8-byte': GL.R8I,
  'r8-ubyte': GL.R8UI,
  // 16-bit fmt(s)
  'r16-short': GL.R16I,
  'r16-ushort': GL.R16UI,
  'r16-half-float': GL.R16F,
  'rg8': GL.RG8,
  'rg8-snorm': GL.RG8_SNORM,
  'rg8-byte': GL.RG8I,
  'rg8-ubyte': GL.RG8UI,
  // 24-bit fmt(s)
  'rgb8': GL.RGB8,
  'rgb8-snorm': GL.RGB8_SNORM,
  // 32-bit fmt(s)
  'r32-int': GL.R32I,
  'r32-uint': GL.R32UI,
  'r32-float': GL.R32F,
  'rgba8': GL.RGBA8,
  'rgba8-snorm': GL.RGBA8_SNORM,
  'srgb8a8-byte': GL.SRGB8_ALPHA8,
  'rgba8-byte': GL.RGBA8I,
  'rgba8-ubyte': GL.RGBA8UI,
  'rg16-short': GL.RG16I,
  'rg16-ushort': GL.RG16UI,
  'rg16-half-float': GL.RG16F,
  // 64-bit fmt(s)
  'rg32-int': GL.RG32I,
  'rg32-uint': GL.RG32UI,
  'rg32-float': GL.RG32F,
  'rgba16-short': GL.RGBA16I,
  'rgba16-ushort': GL.RGBA16UI,
  'rgba16-half-float': GL.RGBA16F,
  // 96-bit fmt(s)
  'rgb32-float': GL.RGB32F,
  // 128-bit fmt(s)
  'rgba32-int': GL.RGBA32I,
  'rgba32-uint': GL.RGBA32UI,
  'rgba32-float': GL.RGBA32F,
  // Stencil fmt(s)
  'stencil8-ubyte': GL.STENCIL_INDEX8,
  // Depth fmt(s)
  'depth16-ushort': GL.DEPTH_COMPONENT16,
  'depth24-uint': GL.DEPTH_COMPONENT24,
  'depth32-float': GL.DEPTH_COMPONENT32F,
  'depth24_stencil8': GL.DEPTH24_STENCIL8,
  'depth32-float_stencil8': GL.DEPTH32F_STENCIL8,
};
