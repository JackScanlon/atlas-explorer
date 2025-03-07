import { GL } from '@engine/core/webgl/constants';
import { ExplorerError } from '@engine/common';
import { WebGLBufferObject } from './WebGLBufferObject';
import { WebGLRenderPipeline } from './WebGLRenderPipeline';
import { GL_VALUE_TYPE, GL_ATTR_USG, GL_BUF_TRG } from '@engine/core/webgl/parameters';
import { VertexObject, type Attribute, type ValueType } from '@engine/core/resources';

/**
 * A wrapper around a WebGL VAO
 *
 * @class
 * @constructor
 * @extends VertexObject
 */
export class WebGLVertexObject extends VertexObject {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = WebGLVertexObject.name;

  /**
   * @desc a map of buffers associated with this VAO group
   * @type {Record<string, WebGLBufferObject>}
   * @readonly
   */
  declare public readonly buffers: Record<string, WebGLBufferObject>;

  /**
   * @desc a map describing the association between RenderPipelines & VAOs
   * @type {Record<number, WebGLVertexArrayObject>}
   * @protected
   */
  declare protected _resource: Record<number, WebGLVertexArrayObject>;

  /**
   * @desc the WebGL device assoc. with this instance
   * @type {WebGL2RenderingContext}
   * @protected
   * @readonly
   */
  declare protected readonly _handle: WebGL2RenderingContext;

  /**
   * @param {WebGL2RenderingContext} handle some active webgl rendering context
   */
  public constructor(handle: WebGL2RenderingContext) {
    super(handle);
  }

  /**
   * @desc {@link WebGLVertexObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is WebGLVertexObject} specifying whether the input is a {@link WebGLVertexObject}
   */
  public static override Is(obj: unknown): obj is WebGLVertexObject {
    return obj instanceof WebGLVertexObject;
  }

  /**
   * @note varies depending on whether an index buffer is specified, and if that index buffer is unsigned int-like
   *
   * @param {number} [indexType] if applicable, optionally specify the type of an index attr
   *
   * @returns {number} the number of bytes per element
   */
  public static override GetIndexBytesPerElement(indexType?: ValueType | number): number {
    switch (indexType) {
      case 'ubyte':
        return 4;

      case GL.UNSIGNED_BYTE:
        return 4;

      default:
        return 2;
    }
  }

  /**
   * @returns {Record<number, WebGLVertexArrayObject>} returns the WebGL VAOs assoc. with this device
   */
  public override get resource(): Record<number, WebGLVertexArrayObject> {
    return this._resource;
  }

  /**
   * @desc attempts to get a VAO assoc. with a pipeline
   *
   * @param {WebGLRenderPipeline | number} pipeline the assoc. {@link RenderPipeline} or its ID
   *
   * @returns {boolean} specifying if this inst contains a VAO for the given pipeline
   */
  public hasPipelineVAO(pipeline: WebGLRenderPipeline | number): boolean {
    return !!(WebGLRenderPipeline.Is(pipeline) ? this._resource?.[pipeline.id] : this._resource?.[pipeline]);
  }

  /**
   * @desc attempts to get a VAO assoc. with a pipeline
   *
   * @param {WebGLRenderPipeline | number} pipeline the assoc. {@link RenderPipeline} or its ID
   *
   * @returns {WebGLVertexArrayObject | undefined} the VAO if found, otherwise undefined
   */
  public getPipelineVAO(pipeline: WebGLRenderPipeline | number): WebGLVertexArrayObject | undefined {
    return WebGLRenderPipeline.Is(pipeline) ? this._resource?.[pipeline.id] : this._resource?.[pipeline];
  }

  /**
   * @desc unbinds all VAOs from the device context
   *
   * @returns {this}
   */
  public unbind(): this {
    this._handle.bindVertexArray(null);
    return this;
  }

  /**
   * @descs binds this VAO to some {@link WebGLRenderPipeline} if not bound
   *
   * @param {WebGLRenderPipeline} pipeline   some render pipeline
   * @param {Attribute}           attributes a list of attributes to bind to this VAO & pipeline
   *
   * @returns {WebGLVertexArrayObject} the bound VAO
   */
  public bindToPipeline(pipeline: WebGLRenderPipeline, attributes?: Record<string, Attribute>): WebGLVertexArrayObject {
    const gl = this._handle;
    attributes = attributes ?? {};

    let vao = this._resource?.[pipeline.id];
    if (vao) {
      gl.bindVertexArray(vao);
      this.update(attributes);
      return vao;
    }

    this.unbind();
    this.update(attributes);

    vao = gl.createVertexArray()!;
    this._resource[pipeline.id] = vao;
    gl.bindVertexArray(vao);

    let attr: Attribute | undefined, buffer: WebGLBufferObject | undefined;
    for (const [name, attrLoc] of Object.entries(pipeline.attributes)) {
      attr = attributes?.[name];
      if (!attr || attrLoc.location === -1) {
        gl.device?.log?.('warn', `Program expected an undefined Attribute<name: ${name}, loc: ${attrLoc.location}>`);
        continue;
      }

      buffer = this.buffers?.[name];
      if (!buffer) {
        throw new ExplorerError({
          code: ExplorerError.Errors.Unknown,
          msg: `Failed to bind Attribute<name: ${name}>, expected the assoc. buffer to be defined - check call order`,
        });
      }

      let num!: number;
      switch (attrLoc.type) {
        case GL.FLOAT_MAT2:
          num = 2;
          break;
        case GL.FLOAT_MAT3:
          num = 3;
          break;
        case GL.FLOAT_MAT4:
          num = 4;
          break;
        default:
          num = 1;
          break;
      }

      const size = attr.size / num,
        stride = num === 1 ? 0 : num * num * 4,
        offset = num * 4;

      buffer.bind();

      for (let i = 0; i < num; ++i) {
        gl.enableVertexAttribArray(attrLoc.location);

        if (attr.data instanceof Float32Array) {
          gl.vertexAttribPointer(
            attrLoc.location + i,
            size,
            GL_VALUE_TYPE[attr.type],
            attr.normalised,
            attr.stride + stride,
            attr.offset + i * offset
          );
        } else {
          gl.vertexAttribIPointer(attrLoc.location + i, size, GL_VALUE_TYPE[attr.type], attr.stride + stride, attr.offset + i * offset);
        }

        if (attr.divisor) {
          gl.vertexAttribDivisor(attrLoc.location + i, attr.divisor);
        }
      }
    }

    this.buffers?.index?.bind?.();
    return vao;
  }

  /**
   * @param {Record<string, Attribute>} attributes a list of geom. assoc. attributes to attach & update to this buf
   *
   * @returns {this}
   */
  public update(attributes: Record<string, Attribute>): this {
    let attr!: Attribute;
    for (const name in attributes) {
      attr = attributes?.[name];
      if (typeof attr === 'undefined' || (!attr.needsUpdate && this.buffers?.[attr.name])) {
        continue;
      }

      this.updateAttribute(attr);
    }

    return this;
  }

  /**
   * @param {Attribute} attr some attribute to update
   *
   * @returns {WebGLBufferObject} returns the updated buffer obj
   */
  public updateAttribute(attr: Attribute): WebGLBufferObject {
    let buf = this.buffers?.[attr.name];
    attr.needsUpdate = false;

    if (!buf) {
      buf = new WebGLBufferObject(this._handle, GL_BUF_TRG[attr.target], GL_ATTR_USG[attr.usage], attr.data);
      this.buffers[attr.name] = buf;
      return buf;
    }

    buf.write(attr.data);
    return buf;
  }

  /**
   * @desc destroys this instance & associated resources
   */
  public dispose(): void {
    for (const name in this._resource) {
      this._handle.deleteVertexArray(this._resource[name]);
      delete this._resource[name];
    }

    for (const name in this.buffers) {
      this.buffers[name].dispose();
      delete this.buffers[name];
    }
  }
}
