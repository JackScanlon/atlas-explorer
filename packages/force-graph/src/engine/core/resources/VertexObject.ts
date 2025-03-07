import { Resource } from './Resource';
import { BufferObject } from './BufferObject';
import type { Attribute } from './types';
import type { RenderPipeline } from './RenderPipeline';

/**
 * A wrapper around a WebGL/WebGPU VAO
 *
 * @class
 * @constructor
 * @abstract
 * @extends Resource
 */
export abstract class VertexObject extends Resource {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = VertexObject.name;

  /**
   * @desc a map of buffers associated with this VAO group
   * @type {Record<string, BufferObject>}
   * @readonly
   */
  public readonly buffers: Record<string, BufferObject> = {};

  /**
   * @desc a map describing the association between RenderPipelines & VAOs
   * @type {Record<number, unknown>}
   * @protected
   */
  declare protected _resource: Record<number, unknown>;

  /**
   * @desc the gpu device assoc. with this instance
   * @type {unknown}
   * @protected
   * @readonly
   */
  declare protected readonly _handle: unknown;

  /**
   * @param {unknown} handle some rendering context
   */
  public constructor(handle: unknown) {
    super(handle, { });
  }

  /**
   * @desc {@link VertexObject} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is VertexObject} specifying whether the input is a {@link VertexObject}
   */
  public static Is(obj: unknown): obj is VertexObject {
    return obj instanceof VertexObject;
  }

  /**
   * @note varies depending on whether an index buffer is specified, and if that index buffer is unsigned int-like
   *
   * @param {number} [_indexType] if applicable, optionally specify the type of an index attr
   *
   * @returns {number} the number of bytes per element
   */
  public static GetIndexBytesPerElement(_indexType?: number): number {
    return 2;
  }

  /**
   * @returns {Record<number, unknown>} returns the VAOs assoc. with this inst
   */
  public override get resource(): Record<number, unknown> {
    return this._resource;
  }

  /**
   * @desc attempts to get a VAO assoc. with a pipeline
   * @note see inherited classes for implementation
   * @abstract
   *
   * @param {RenderPipeline | number} pipeline the assoc. {@link RenderPipeline} or its ID
   *
   * @returns {boolean} specifying if this inst contains a VAO for the given pipeline
   */
  public abstract hasPipelineVAO(pipeline: RenderPipeline | number): boolean;

  /**
   * @desc attempts to get a VAO assoc. with a pipeline
   * @note see inherited classes for implementation
   * @abstract
   *
   * @param {RenderPipeline | number} pipeline the assoc. {@link RenderPipeline} or its ID
   *
   * @returns {unknown | undefined} the VAO if found
   */
  public abstract getPipelineVAO(pipeline: RenderPipeline | number): unknown | undefined;

  /**
   * @desc unbinds all VAOs from the device context
   * @abstract
   *
   * @returns {this}
   */
  public abstract unbind(): this;

  /**
   * @desc binds the VAO to some render pipeline
   * @abstract
   *
   * @param {unknown}                   pipeline     the pipeline that this VAO will be attached to
   * @param {Record<string, Attribute>} [attributes] optionally specify a list of attributes to bind
   *
   * @returns {unknown} the internal GPU VAO obj
   */
  public abstract bindToPipeline(pipeline: unknown, attributes?: Record<string, Attribute>): unknown;

  /**
   * @abstract
   *
   * @param {Record<string, Attribute>} attributes a list of geom. assoc. attributes to attach & update to this buf
   *
   * @returns {this}
   */
  public abstract update(attributes: Record<string, Attribute>): this;

  /**
   * @abstract
   *
   * @param {Attribute} attr some attribute to update
   *
   * @returns {BufferObject} returns the updated buffer obj
   */
  public abstract updateAttribute(attr: Attribute): BufferObject;

  /**
   * @desc some cleanup method to destroy assoc. resources
   * @abstract
   */
  public abstract dispose(): void;
};
