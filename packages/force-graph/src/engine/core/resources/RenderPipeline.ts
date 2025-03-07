import { Resource } from './Resource';
import { TextureObject } from './TextureObject';
import type { DeviceType, ShaderType, PipelineAttribute, PipelineUniform, RenderPipelineProps, Uniform, ITexture } from '@engine/core/types';

/**
 * An abstract class representing some WebGL/WebGPU render pipeline
 *
 * @class
 * @constructor
 * @abstract
 */
export abstract class RenderPipeline extends Resource {
  /**
   * @desc default properties assoc. with this instance; used to fulfil props requirements on construction
   * @type {Required<RenderPipelineProps>}
   * @static
   */
  public static DefaultProps: Partial<RenderPipelineProps> = {
    vs: '',
    fs: '',
    defines: null,
    includes: null,
  };

  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = RenderPipeline.name;

  /**
   * @desc reference to this inst's device context type
   * @type {DeviceType}
   * @readonly
   * @abstract
   */
  public abstract readonly type: DeviceType;

  /**
   * @desc reference to some UBO associated with this instance
   * @type {unknown}
   * @readonly
   * @abstract
   */
  public abstract readonly ubo: unknown;

  /**
   * @desc some render pipeline program contained by this instance
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
   * @desc a map of uniforms assoc. with this pipeline instance
   * @type {Record<string, PipelineUniform>}
   * @protected
   * @readonly
   */
  protected readonly _uniformLocs: Record<string, PipelineUniform> = {};

  /**
   * @desc a map of attributes assoc. with this pipeline instance
   * @type {Record<string, PipelineAttribute>}
   * @protected
   * @readonly
   */
  protected readonly _attributeLocs: Record<string, PipelineAttribute> = {};

  /**
   * @desc a map of texture uniforms and their texture ids
   * @type {Record<string, number>}
   * @protected
   * @readonly
   */
  protected readonly _textureLocs: Record<string, number> = {};

  /**
   * @desc specifies whether this program is valid or not
   * @type {boolean}
   * @protected
   */
  protected _valid: boolean = false;

  /**
   * @desc constructs a new RenderPipeline; see inherited classes for more information
   *
   * @param {unknown} handle some graphics context
   */
  public constructor(handle: unknown) {
    super(handle);
  }

  /**
   * @desc {@link RenderPipeline} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is RenderPipeline} specifying whether the input is a {@link RenderPipeline}
   */
  public static Is(obj: unknown): obj is RenderPipeline {
    return obj instanceof RenderPipeline;
  }

  /**
   * @desc formats and assembles a shader as described by the given props - see inherited classes for more information
   * @static
   *
   * @param {ShaderType} _type  i.e. one of `'frag' | 'vert'`
   * @param {string}     src    the shader source code
   * @param {unknown}    _props shader compilation properties
   *
   * @returns {string} the assembled shader source
   */
  public static AssembleShader(_type: ShaderType, src: string, _props: unknown): string {
    return src;
  }

  /**
   * @desc formats an err evaluated from a shader during compilation - see inherited classes for more information
   * @static
   *
   * @param {string}  _source
   * @param {string}  [log]
   * @param {string}  [defaultMsg]
   * @param {boolean} [_inclSrcDefault]
   *
   * @returns {string} the formatted error message(s)
   */
  public static FormatShaderErr(
    _source: string,
    log?: Nullable<string>,
    defaultMsg: string = '',
    _inclSrcDefault: boolean = true
  ): string {
    return log ?? defaultMsg;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
   * @type {string}
   * @public
   */
  public get [Symbol.toStringTag](): string {
    return `RenderPipeline<id: ${this.id}, type: ${this.type}, valid: ${this._valid}>`;
  }

  /**
   * @desc retrieves the attributes contained by this uniforms
   */
  public get uniforms(): Record<string, PipelineUniform> {
    return this._uniformLocs;
  }

  /**
   * @desc retrieves the attributes contained by this program
   */
  public get attributes(): Record<string, PipelineAttribute> {
    return this._attributeLocs;
  }

  /**
   * @returns {boolean} specifies whether this device has initialised without error
   */
  public isValid(): boolean {
    return this._valid;
  }

  /**
   * @abstract
   *
   * @param {string} name the desired target
   *
   * @returns {PipelineUniform | undefined} this pipeline's definition of the desired uniform, if applicable
   */
  public abstract getUniformInfo(name: string): PipelineUniform | undefined;

  /**
   * @abstract
   *
   * @param {string} name the desired target
   *
   * @returns {PipelineAttribute | undefined} this pipeline's definition of the desired attribute, if applicable
   */
  public abstract getAttributeInfo(name: string): PipelineAttribute | undefined;

  /**
   * @param {string} name the desired target
   *
   * @returns {boolean} specifying whether the uniform at this target is a texture
   */
  public isUniformTexture(name: string): boolean {
    return typeof this._textureLocs?.[name] === 'number';
  }

  /**
   * @param {string} name the desired target
   *
   * @returns {number | undefined} the index of this texture, if applicable
   */
  public getUniformTexIndex(name: string): number | undefined {
    return this._textureLocs?.[name];
  }

  /**
   * @desc updates a specific uniform known by this program
   * @abstract
   *
   * @param {string}  name    the uniform name
   * @param {Uniform} uniform see {@link Uniform}
   * @param {WeakMap<ITexture, WebGLTextureObject>} textures a map describing textures known by the renderer
   */
  public abstract setUniform(name: string, uniform: unknown, textures: WeakMap<ITexture, TextureObject>): this;

  /**
   * @desc binds some value to the target location
   * @abstract
   *
   * @param {...*} args varargs; see inherited cls
   *
   * @returns {this}
   */
  public abstract setUniformValue(...args: any[]): this;

  /**
   * @abstract
   *
   * @desc destroys this instance
   */
  public abstract dispose(): void;
};
