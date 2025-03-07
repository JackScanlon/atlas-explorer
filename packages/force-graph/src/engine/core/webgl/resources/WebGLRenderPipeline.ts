import { GL } from '@engine/core/webgl/constants';
import { ExplorerError } from '@engine/common';
import { RenderPipeline } from '@engine/core/resources/RenderPipeline';
import { WebGLTextureObject } from './WebGLTextureObject';
import { WebGLUniformBufferObject } from './WebGLUniformBufferObject';

import {
  isTexResourceLike,
  type ShaderType,
  type DeviceType,
  type Uniform,
  type PipelineUniform,
  type PipelineAttribute,
  type RenderPipelineProps,
  type ITexture,
} from '@engine/core/types';

/**
 * @desc pattern to locate include directives in GLSL files; used to assemble shader source from one or more files
 * @see http://www.opengl.org/registry/specs/ARB/shading_language_include.txt
 */
export const GLSLInclDirective = /^[^\S\r\n]*#include\s<([^\s]+)>/gm;

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLUniformLocation
 *
 * @property {WebGLUniformLocation|-1} location redeclares the location property as a {@link WebGLUniformLocation}
 */
export interface WebGLPipelineUniform extends PipelineUniform {
  location: WebGLUniformLocation | -1;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Types
 *
 * @property {GLint} location describes the location of an attribute on a pipeline
 */
export interface WebGLPipelineAttribute extends PipelineAttribute {
  location: GLint;
}

/**
 * @see https://www.khronos.org/opengl/wiki/Core_Language_(GLSL)
 */
export type GLSLVersion = '100' | '300 es';

/**
 * @desc render pipeline constructor props
 *
 * @property {GLSLVersion} [version] describes the desired glsl lang version
 */
export interface WebGLRenderPipelineProps extends RenderPipelineProps {
  version?: GLSLVersion;
}

const /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getShaderInfoLog
   */
  SHADER_RE_ERR = new RegExp(/ERROR:\s*\d+:(\d+)/, 'gi'),
  /**
   * @desc used to split shader source into individual lines
   */
  SHADER_RE_LINE = new RegExp(/\r?\n|\r|\n/, 'g'),
  /**
   * @desc default error message
   */
  SHADER_DEF_MSG = 'Unknown error occurred';

/**
 * Class representing a WebGL2 device
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLProgram
 * @class
 * @constructor
 * @extends RenderPipeline
 */
export class WebGLRenderPipeline extends RenderPipeline {
  /**
   * @desc default properties assoc. with this instance; used to fulfil props requirements on construction
   * @note extended from {@link RenderPipelineProps}
   * @type {Required<WebGLRenderPipelineProps>}
   * @static
   */
  public static override DefaultProps: Required<WebGLRenderPipelineProps> = {
    vs: '',
    fs: '',
    defines: null,
    version: '300 es',
    includes: null,
  };

  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = WebGLRenderPipeline.name;

  /**
   * @desc reference to this inst's device context type
   * @type {DeviceType}
   * @readonly
   */
  public readonly type: DeviceType = 'webgl';

  /**
   * @desc reference to some UBO associated with this instance
   * @type {Record<GLint, WebGLUniformBufferObject>}
   * @readonly
   */
  public readonly ubo: Record<GLint, WebGLUniformBufferObject> = {};

  /**
   * @desc some render pipeline program contained by this instance
   * @type {WebGLProgram}
   * @protected
   */
  declare protected _resource: WebGLProgram;

  /**
   * @desc the WebGL device assoc. with this instance
   * @type {WebGL2RenderingContext}
   * @protected
   * @readonly
   */
  declare protected readonly _handle: WebGL2RenderingContext;

  /**
   * @desc a map of uniforms assoc. with this pipeline instance
   * @type {Record<string, WebGLPipelineUniform>}
   * @protected
   * @readonly
   */
  declare protected readonly _uniformLocs: Record<string, WebGLPipelineUniform>;

  /**
   * @desc a map of attributes assoc. with this pipeline instance
   * @type {Record<string, WebGLPipelineAttribute>}
   * @protected
   * @readonly
   */
  declare protected readonly _attributeLocs: Record<string, WebGLPipelineAttribute>;

  /**
   * @param {WebGL2RenderingContext}   gl    see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext|WebGL rendering context}
   * @param {WebGLRenderPipelineProps} props {@link WebGLRenderPipelineProps}
   */
  public constructor(gl: WebGL2RenderingContext, props: WebGLRenderPipelineProps) {
    super(gl);

    props.version = typeof props.version === 'string' ? props.version : WebGLRenderPipeline.DefaultProps.version;
    props.defines = props.defines ?? null;

    this.initialise(props as Required<WebGLRenderPipelineProps>);
  }

  /**
   * @desc {@link WebGLRenderPipeline} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is WebGLRenderPipeline} specifying whether the input is a {@link WebGLRenderPipeline}
   */
  public static Is(obj: unknown): obj is WebGLRenderPipeline {
    return obj instanceof WebGLRenderPipeline;
  }

  /**
   * @desc resolves definitions, appends directives etc; could be used to handle incl directives in future
   * @static
   *
   * @param {ShaderType} type the shader type; one of `frag` | `vert`
   * @param {string}     src  the source code of the shader
   *
   * @returns {string} the resolved shader source
   */
  public static override AssembleShader(type: ShaderType, src: string, props: Required<WebGLRenderPipelineProps>): string {
    const assembled: string[] = [];
    if (!src.startsWith('#version')) {
      assembled.push(`#version ${props.version!}`);
    } else {
      const eol = src.match(/\n|;/);
      if (eol) {
        assembled.push(src.substring(0, eol.index!));
        src = src.substring(eol.index! + 1);
      }
    }
    assembled.push(`#define ${type.toUpperCase()}_SHADER\n`);

    if (!!props?.defines && typeof props.defines === 'object') {
      for (const key in props.defines) {
        const value = props.defines[key];
        if (typeof value === 'boolean' && !value) {
          continue;
        }

        assembled.push(`#define ${key} ${value}\n`);
      }
    }

    if (!!props.includes && typeof props.includes === 'object') {
      src = WebGLRenderPipeline.ResolveDependencies(src, props.includes);
    }
    assembled.push(src);
    return assembled.join('\n');
  }

  public static ResolveDependencies(src: string, includes: Record<string, string>): string {
    return src.replace(GLSLInclDirective, (substr: string, match: string): string => {
      const content = includes?.[match];
      if (!content) {
        throw new ExplorerError({
          msg: `Failed to compile WebGLShader with err:\nInclude directive of "${substr}" is used but there is no known replacement`,
          code: ExplorerError.Errors.ShaderError,
        });
      }

      return WebGLRenderPipeline.ResolveDependencies(content, includes);
    });
  }

  /**
   * @desc formats a shader compilation error resolved by `getShaderInfoLog()`
   * @static
   *
   * @param {string} source           the shader source
   * @param {string} [log]            the shader error message
   * @param {string} [defaultMsg]     some default message if we're unable to format it, see `SHADER_DEF_MSG`
   * @param {string} [inclSrcDefault] specify whether to log the shader source if the error can't be formatted
   *
   * @returns {string} the formatted shader error message
   */
  public static override FormatShaderErr(
    source: string,
    log?: Nullable<string>,
    defaultMsg: string = SHADER_DEF_MSG,
    inclSrcDefault: boolean = true
  ): string {
    const errRes = typeof log === 'string' ? Array.from(log.matchAll(SHADER_RE_ERR)) : null;

    if (!errRes || errRes.length < 1) {
      return inclSrcDefault ? defaultMsg + ':\n' + source : defaultMsg;
    }

    const mapped = errRes.reduce(
      (res, entry, i) => {
        const num = parseInt(entry[1]);
        const nxt = errRes?.[i + 1];
        res[num] = (res?.[num] ?? '\n') + '║\n╚⥤ ' + log!.substring(entry.index, nxt ? nxt.index : log!.length);
        return res;
      },
      {} as Record<number, string>
    );

    const lines = source.split(SHADER_RE_LINE);
    const count = lines.length.toString().length;
    return lines
      .map((line, num) => {
        const err = mapped?.[num] ?? '';
        const trg = String(num).padStart(count, '0');
        return `[LINE: ${trg}]: ${line}${err}`;
      })
      .join('\n');
  }

  /**
   * @returns {WebGLProgram} retrieves the render pipeline handle
   */
  public override get resource(): WebGLProgram {
    return this._resource;
  }

  /**
   * @desc retrieves the attributes contained by this uniforms
   */
  public get uniforms(): Record<string, WebGLPipelineUniform> {
    return this._uniformLocs;
  }

  /**
   * @desc retrieves the attributes contained by this program
   */
  public get attributes(): Record<string, WebGLPipelineAttribute> {
    return this._attributeLocs;
  }

  /**
   * @param {string} name the desired target
   *
   * @returns {WebGLPipelineUniform | undefined} this pipeline's definition of the desired uniform, if applicable
   */
  public getUniformInfo(name: string): WebGLPipelineUniform | undefined {
    return this._uniformLocs?.[name];
  }

  /**
   * @param {string} name the desired target
   *
   * @returns {WebGLPipelineAttribute | undefined} this pipeline's definition of the desired attribute, if applicable
   */
  public getAttributeInfo(name: string): WebGLPipelineAttribute | undefined {
    return this._attributeLocs?.[name];
  }

  /**
   * @desc updates a specific uniform known by this program
   *
   * @param {string}                                name     the uniform name
   * @param {Uniform}                               uniform  see {@link Uniform}
   * @param {WeakMap<ITexture, WebGLTextureObject>} textures a map describing textures known by the renderer
   */
  public setUniform(name: string, uniform: Uniform, textures: WeakMap<ITexture, WebGLTextureObject>): this {
    const gl = this._handle;
    const rel = this._uniformLocs?.[name];
    if (!rel) {
      return this;
    }

    const value = uniform.value,
      loc = rel.location,
      ubo = rel.blockIndex >= 0 && this.ubo?.[rel.blockIndex] ? this.ubo?.[rel.blockIndex] : undefined;

    if (uniform.needsUpdate && !!ubo) {
      ubo.update(rel, value);
      uniform.needsUpdate = false;
    }

    if (loc === -1) {
      if (!ubo) {
        gl.device?.log?.('warn', `Attempted to set undefined Uniform<name: ${name}> on Pipeline<id: ${this.id}>`);
      }

      return this;
    }

    let texIdx = isTexResourceLike(value) ? this._textureLocs?.[name] : undefined;
    if (typeof texIdx !== 'undefined') {
      gl.activeTexture(GL.TEXTURE0 + texIdx);

      let tex = textures.get(value);
      if (!tex) {
        tex = new WebGLTextureObject(gl, (value as any)?.id - 1);
        textures.set(value, tex);
        uniform.needsUpdate = true;
      }

      const target = WebGLTextureObject.GetTextureTarget(value.target);
      gl.bindTexture(target, tex.resource);

      if (uniform.needsUpdate) {
        tex.setTexture(uniform.value);
        uniform.needsUpdate = false;
      }

      for (let i = 0; i < (value.target === 'cube' ? 6 : 1); ++i) {
        this.setUniformValue(name, rel.type, loc, texIdx + i);
      }

      return this;
    }

    this.setUniformValue(name, rel.type, loc, value);
    return this;
  }

  /**
   * @desc binds some value to the target location
   *
   * @param {string}               name  the uniform name
   * @param {number}               type  the uniform value type
   * @param {WebGLUniformLocation} loc   gpu ref. to the uniform location as recorded during compilation
   * @param {any}                  value the value to bind
   *
   * @returns {this}
   */
  public setUniformValue(name: string, type: number, loc: WebGLUniformLocation, value: any): this {
    const gl = this._handle;
    switch (type) {
      case GL.FLOAT:
        {
          if (value instanceof Object && 'length' in value && value.length) {
            gl.uniform1fv(loc, value);
          } else {
            gl.uniform1f(loc, value);
          }
        }
        break;
      case GL.FLOAT_VEC2:
        gl.uniform2fv(loc, value);
        break;
      case GL.FLOAT_VEC3:
        gl.uniform3fv(loc, value);
        break;
      case GL.FLOAT_VEC4:
        gl.uniform4fv(loc, value);
        break;
      case GL.BOOL:
      case GL.INT:
      case GL.SAMPLER_2D:
      case GL.SAMPLER_CUBE:
      case GL.INT_SAMPLER_2D:
      case GL.UNSIGNED_BYTE:
      case GL.UNSIGNED_INT_SAMPLER_2D:
      case GL.INT_SAMPLER_CUBE:
      case GL.INT_SAMPLER_2D_ARRAY:
        {
          if (value instanceof Object && 'length' in value && value.length) {
            gl.uniform1iv(loc, value);
          } else {
            gl.uniform1i(loc, value);
          }
        }
        break;
      case GL.BOOL_VEC2:
      case GL.INT_VEC2:
        gl.uniform2iv(loc, value);
        break;
      case GL.BOOL_VEC3:
      case GL.INT_VEC3:
        gl.uniform3iv(loc, value);
        break;
      case GL.BOOL_VEC4:
      case GL.INT_VEC4:
        gl.uniform4iv(loc, value);
        break;
      case GL.FLOAT_MAT2:
        gl.uniformMatrix2fv(loc, false, value);
        break;
      case GL.FLOAT_MAT3:
        gl.uniformMatrix3fv(loc, false, value);
        break;
      case GL.FLOAT_MAT4:
        gl.uniformMatrix4fv(loc, false, value);
        break;
      default:
        gl.device?.log?.('warn', `Resolved unknown type ${type} when attemping to set Uniform<name: ${name}> on Shader<id: ${this.id}>`);
        break;
    }

    return this;
  }

  /**
   * @desc initialises the WebGLProgram
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLProgram
   * @private
   *
   * @param {Required<WebGLRenderPipelineProps>} props a complete set of pipeline props
   */
  private initialise(props: Required<WebGLRenderPipelineProps>): void {
    const gl = this._handle;
    props.vs = WebGLRenderPipeline.AssembleShader('vert', props.vs, props);
    props.fs = WebGLRenderPipeline.AssembleShader('frag', props.fs, props);

    const vs = this.createWebGLShader(GL.VERTEX_SHADER, props.vs);
    const fs = this.createWebGLShader(GL.FRAGMENT_SHADER, props.fs);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    const programLog = gl.getProgramInfoLog(program);
    if (!success) {
      gl.deleteProgram(program);
      throw new ExplorerError({
        msg: `Failed to create WebGLProgram with err:\n${programLog ?? 'Unknown error occurred'}`,
        code: ExplorerError.Errors.PipelineError,
      });
    }
    this._resource = program;

    if (typeof programLog === 'string' && programLog.length > 0) {
      gl.device?.log?.('warn', `WebGLProgram creation warning:\n${programLog}`);
    }

    gl.detachShader(program, vs);
    gl.deleteShader(vs);

    gl.detachShader(program, fs);
    gl.deleteShader(fs);

    let textureIndex: GLint = 0;
    const uniformsLength = gl.getProgramParameter(program, GL.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformsLength; i++) {
      const activeUniform = gl.getActiveUniform(program, i);
      if (!activeUniform) {
        continue;
      }

      let { name, size, type } = activeUniform;
      if (name.endsWith(']')) {
        name = name.replace(/\[\d+\]/, '');
      }

      const location = gl.getUniformLocation(program, name) ?? -1;
      const blockIndex = gl.getActiveUniforms(program, [i], GL.UNIFORM_BLOCK_INDEX)[0];
      this._uniformLocs[name] = {
        size,
        type,
        location,
        blockIndex,
        offset: gl.getActiveUniforms(program, [i], GL.UNIFORM_OFFSET)[0] / Float32Array.BYTES_PER_ELEMENT,
      };

      if (type === GL.SAMPLER_2D) {
        this._textureLocs[name] = textureIndex;
        textureIndex++;
      } else if (type === GL.SAMPLER_CUBE) {
        this._textureLocs[name] = textureIndex;
        textureIndex += 6;
      }

      if (blockIndex !== -1 && !this.ubo?.[blockIndex]) {
        const ubo = new WebGLUniformBufferObject(
          gl,
          gl.getActiveUniformBlockName(program, blockIndex)!,
          gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE),
          blockIndex
        );

        this.ubo[blockIndex] = ubo;
      }
    }

    const attributesLength = gl.getProgramParameter(program, GL.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributesLength; i++) {
      const attribute = gl.getActiveAttrib(program, i);
      if (!attribute) {
        continue;
      }

      const location = gl.getAttribLocation(program, attribute.name);
      if (location === -1) {
        continue;
      }

      this._attributeLocs[attribute.name] = { type: attribute.type, size: attribute.size, location };
    }
  }

  /**
   * @desc destroys this instance
   */
  public dispose(): void {
    if (!(this._resource instanceof WebGLProgram)) {
      return;
    }

    for (const name in this.ubo) {
      this.ubo[name].dispose();
      delete this.ubo[name];
    }

    this._handle.deleteProgram(this._resource);
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/createShader
   *
   * @param {WebGLShaderTypes}       type shader type; one of vertex or fragment - see {@link GL}
   * @param {string}                 src  shader source
   *
   * @returns {WebGLShader} a compiled WebGL shader resource
   */
  private createWebGLShader(type: GL.FRAGMENT_SHADER | GL.VERTEX_SHADER, src: string): WebGLShader {
    const gl = this._handle;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new ExplorerError({
        msg: 'Failed to initialise shader',
        code: ExplorerError.Errors.ShaderError,
      });
    }

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    let shaderLog = gl.getShaderInfoLog(shader);
    if (!success) {
      gl.deleteShader(shader);

      shaderLog = WebGLRenderPipeline.FormatShaderErr(src, shaderLog);
      throw new ExplorerError({
        msg: 'Failed to compile WebGLShader with err:\n' + shaderLog,
        code: ExplorerError.Errors.ShaderError,
      });
    }

    if (typeof shaderLog === 'string' && shaderLog.length > 0) {
      gl.device?.log?.('warn', `WebGLShader compilation warning:\n${shaderLog}`);
    }

    return shader;
  }
}
