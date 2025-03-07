import { AdapterUtils, type DrawMode, type Attribute, type AttributePartial } from '@engine/core';

/**
 * @desc an object describing a set of attributes associated with some generated {@link Geometry}
 * @note used to encapsulate the results of a geometry's `GenerateGeometry` static method
 *
 * @property {Float32Array} position specifies the 3D vertices assoc. with this geometry instance
 * @property {Float32Array} [uv]     optionally specifies the 2D UV texture mapping coordinates
 * @property {Float32Array} [index]  optionally specifies the triangle indices of this geometry
 * @property {Float32Array} [normal] optionally specifies the vertex normals of this geometry
 */
export interface IGeometryShape {
  position: Float32Array,
  uv?: Float32Array,
  index?: Float32Array,
  normal?: Float32Array,
};

/**
 * @desc {@link Geometry} constructor props
 *
 * @property {DrawMode}                drawMode        specifies the primitive type when drawing geometry
 * @property {Array<AttributePartial>} attributes      a map of attributes associated with this geom
 * @property {boolean}                 instanced       specifies whether this geometry is instanced
 * @property {number}                  instanceCount   specifies the number of instanced objects described by this geometry
 * @property {number}                  drawRangeStart  specifies the starting index to draw from
 */
export interface GeometryProps {
  drawMode?: DrawMode,
  attributes?: Array<AttributePartial>,
  instanced?: boolean,
  instanceCount?: number,
  drawRangeStart?: number,
};

/**
 * Class representing some geometry and its attributes
 *
 * @class
 * @constructor
 */
export class Geometry {
  /**
   * @desc this class' type name
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Geometry.name;

  /**
   * @desc default constructor properties
   * @type {GeometryProps}
   * @static
   */
  public static readonly DefaultProps: GeometryProps = {
    drawMode: 'triangles',
    instanced: false,
    instanceCount: 0,
    drawRangeStart: 0,
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
   * @desc specifies the primitive type when drawing geometry
   * @type {string}
   * @readonly
   */
  public readonly drawMode!: DrawMode;

  /**
   * @desc specifies whether this geometry is instanced
   * @type {boolean}
   * @readonly
   */
  public readonly instanced: boolean = false;

  /**
   * @desc specifies the number of instanced objects described by this geometry
   * @type {number}
   * @readonly
   */
  public readonly instanceCount: number = 0;

  /**
   * @desc specifies the starting index to draw from
   * @type {number}
   */
  public drawRangeStart: number = 0;

  /**
   * @desc specifies the draw range of this object
   * @type {number}
   */
  public drawRangeLength: number = 0;

  /**
   * @desc a map of attributes associated with this geometry's VAO group
   * @type {Record<string, Attribute>}
   * @readonly
   */
  public readonly attributes: Record<string, Attribute> = {};

  /**
   * @param {GeometryProps} [props] geometry properties
   */
  public constructor(props?: GeometryProps) {
    props = props ?? ({ instanced: false, attributes: []} as GeometryProps);
    props.attributes = props.attributes ?? [];

    const opts = {
      ...Geometry.DefaultProps,
      ...props,
    } as Required<GeometryProps>;

    this.id = Geometry._ref++;
    this.drawMode = opts.drawMode;
    this.instanced = opts.instanced;
    this.instanceCount = opts.instanceCount;
    this.drawRangeStart = opts.drawRangeStart;

    for (let i = 0; i < opts.attributes.length; ++i) {
      const attr = Geometry.ProcessAttribute(opts.attributes[i]);
      this.attributes[attr.name] = attr;
    }

    const index = this.attributes?.index;
    if (index) {
      this.drawRangeLength = index.count;
    }

    for (const name in this.attributes) {
      const attr = this.attributes[name];
      if (attr.divisor) {
        this.instanced = true;

        const attrInstLen = attr.count*attr.divisor;
        const varyingAttrLen = this.instanceCount > 0 && this.instanceCount !== attrInstLen;
        if (varyingAttrLen) {
          this.instanceCount = Math.min(this.instanceCount, attrInstLen);
        } else {
          this.instanceCount = attrInstLen;
        }
      } else if (!index) {
        this.drawRangeLength = Math.max(this.drawRangeLength, attr.count);
      }
    }
  }

  /**
   * @desc {@link Geometry} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Geometry} specifying whether the input is a {@link Geometry}
   */
  public static Is(obj: unknown): obj is Geometry {
    return obj instanceof Geometry;
  }

  /**
   * @static
   *
   * @param {AttributePartial} obj a list of desired attributes; note that these must include a `data` and `name` prop
   *
   * @returns {Attribute} a finalised attribute obj
   */
  public static ProcessAttribute(obj: AttributePartial): Attribute {
    obj.size = obj?.size ?? 1;
    obj.stride = obj?.stride ?? 0;
    obj.offset = obj?.offset ?? 0;
    obj.divisor = obj?.divisor ?? 0;

    obj.usage = obj?.usage ?? 'static';
    obj.target = obj?.name !== 'index'
      ? 'array-buffer'
      : 'element-array-buffer';

    obj.normalised = obj?.normalised ?? false;
    obj.needsUpdate = true;

    if (typeof obj?.type !== 'string') {
      obj.type = AdapterUtils.getAttrDataType(obj.data) ?? 'float';
    }

    if (obj?.count === null || typeof obj?.count === 'undefined') {
      obj.count = obj?.stride
        ? obj.data.byteLength / obj.stride
        : obj.data.length / obj.size;
    }

    return obj as Attribute;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Geometry';
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
   * @param {Attribute|AttributePartial} attr some attr to add to this geom inst
   *
   * @returns {this}
   */
  public addAttribute(attr: Attribute | AttributePartial): this {
    this.attributes[attr.name] = Geometry.ProcessAttribute(attr);
    return this;
  }
};
