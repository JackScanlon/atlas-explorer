import type { TypedArray } from '@engine/core/types';

/**
 * @desc some uniform descriptor
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getUniform
 *
 * @property {any}     [value]       specifies the value of the uniform
 * @property {boolean} [needsUpdate] specifies that the uniform needs to be updated
 */
export interface Uniform {
  value?: any;
  needsUpdate?: boolean;
}

/**
 * @desc specifies the binding point target of the buffer; see webgl ref below
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData#target
 */
export type AttributeTarget = 'array-buffer' | 'element-array-buffer' | 'uniform-buffer';

/**
 * @desc specifies the usage pattern of the data; see webgl ref below
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData#usage
 */
export type AttributeUsage = 'static' | 'dynamic' | 'stream';

/**
 * @desc specifies the data type of the given array buffer view elements; see webgl ref below
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer#type
 */
export type ValueType = 'byte' | 'ubyte' | 'short' | 'ushort' | 'int' | 'uint' | 'float' | 'half-float';

/**
 * @desc describes some shader attribute
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Data
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer
 *
 * @property {string}          [name]        the name of this attribute
 * @property {ValueType}       [type]        gpu type; can be optionally specified - set internally otherwise
 * @property {AttributeTarget} [target]      the buffer target (set internally)
 * @property {TypedArray}      data          some data buffer view
 * @property {number}          size          the per vertex size of the view; default `1`
 * @property {number}          [divisor]     the per instance size of the view; default `0` - used for instancing
 * @property {number}          [count]       specifies the draw range; default `undefined`
 * @property {number}          [stride]      specifies the offset in bytes between consecutive attribs; default `0`
 * @property {number}          [offset]      specifies the offset in bytes of the first component in the attrib; default `0`
 * @property {AttributeUsage}  [usage]       specifies the attribute usage pattern
 * @property {boolean}         [normalised]  specifies whether the `int` data values should be normalised when casting to float; default `false`
 * @property {boolean}         [needsUpdate] specifies that the attribute needs to be updated; default `false`
 */
export interface Attribute {
  name: string;
  type: ValueType;
  target: AttributeTarget;
  data: TypedArray;
  size: number;
  divisor: number;
  count: number;
  stride: number;
  offset: number;
  usage: AttributeUsage;
  normalised: boolean;
  needsUpdate: boolean;
}

/**
 * @desc partial attribute object that has - at minimum - its `data` and `name` props defined
 */
export type AttributePartial = PartialExcept<Attribute, 'name'> & PartialExcept<Attribute, 'data'>;

/**
 * @see https://www.khronos.org/opengl/wiki/Uniform_Buffer_Object
 *
 * @property {string}     name       the name of this ubo
 * @property {TypedArray} data       the associated buffer
 * @property {number}     blockIndex specifies corresponding active uniform block in the render pipeline
 * @property {Function}   update     a public method used to update the underlying uniform
 * @property {Function}   bindBase   a public method used to bind this ubo at the specified index
 */
export interface UniformBufferObject {
  name: string;
  data: TypedArray;
  blockIndex: number;
  update(uniform: any, value: any): this;
  bindBase(index?: number): this;
}

/**
 * @desc per instance shader data
 * @see {@link Uniform}
 *
 * @property {number} type       the type associated with this uniform
 * @property {number} size       the expected size of this uniform's data
 * @property {number} offset     specifies the offset in the layout; see {@link https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)#Layout_query|Layout Query}
 * @property {number} location   specifies the location of this uniform in the render pipeline
 * @property {number} blockIndex specifies corresponding active uniform block in the render pipeline
 */
export interface PipelineUniform {
  type: number;
  size: number;
  offset: number;
  location: unknown;
  blockIndex: number;
}

/**
 * @desc per vertex shader data
 * @see {@link Attribute}
 *
 * @property {number} type the type associated with this attribute
 * @property {number} size the expected size of this attribute's data
 */
export interface PipelineAttribute {
  type: number;
  size: number;
}

/**
 * @desc describes the layout of a buffer object
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLBuffer
 *
 * @property {string}                    name         the type associated with this attribute
 * @property {string}                    [mode]       per vertex / per instance buffer; one of `vertex` or `instance`
 * @property {number}                    [stride]     specifies the offset in bytes between consecutive elements
 * @property {Record<string, Attribute>} [attributes] specifies the attributes associated with this layout
 */
export interface BufferLayout {
  name: string;
  mode?: 'vertex' | 'instance';
  stride?: number;
  attributes?: Record<string, Attribute>;
}

/**
 * @desc render pipeline constructor props
 * @see {@link RenderPipeline}
 *
 * @property {number}                     id         an instance's internal ID
 * @property {string}                     vs         the vertex shader source assoc. with this material
 * @property {string}                     fs         the fragment shader source assoc. with this material
 * @property {string}                     [version]  the desired shader language version; defaults to `300 es` if device is `webgl`
 * @property {Record<string, any> | null} [defines]  any defines that should be appended to the shader on assembly
 * @property {Record<string, string>}     [includes] include directive lookup
 */
export interface RenderPipelineProps {
  vs: string;
  fs: string;
  version?: string;
  defines?: Record<string, any> | null;
  includes?: Record<string, string> | null;
}
