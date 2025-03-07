import { Geometry, IGeometryShape, type GeometryProps } from './Geometry';

/**
 * @desc specifies the shape of the geom
 * @note tri is preferred as default due to quad overshading/inefficient caching
 */
export type FullscreenGeomType = 'tri' | 'quad';

/**
 * @desc constructor props
 * @see {@link GeometryProps}
 * @extends GeometryProps
 *
 * @property {number} [shape='tri'] specifies whether to build this geom as a Tri or a Quad (2x tri)
 */
export interface FullscreenGeomProps extends GeometryProps {
  shape?: FullscreenGeomType,
};

/**
 * @desc default constructor props
 * @type {FullscreenGeomProps}
 * @constant
 */
export const DefaultFullscreenGeomProps: FullscreenGeomProps = {
  shape: 'tri',
};

/**
 * Class representing a fullscreen tri/quad
 * @see {Geometry}
 *
 * @class
 * @constructor
 * @extends Geometry
 */
export class FullscreenGeometry extends Geometry {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = FullscreenGeometry.name;

  /**
   * @desc specifies whether this geom. describes a `tri` or `quad`
   * @see {@link FullscreenGeomType}
   */
  public shape!: FullscreenGeomType;

  /**
   * @param {Partial<FullscreenGeomProps>} [props] optionally specify this geom's props; defaults to {@link DefaultFullscreenGeomProps}
   */
  public constructor(props?: FullscreenGeomProps) {
    props = {
      ...DefaultFullscreenGeomProps,
      ...(props ?? { }),
    };


    const hasGeomAttr = Array.isArray(props.attributes)
      && !!props.attributes.find(x => (
        (x.name === 'uv' || x.name === 'position') &&
        (Array.isArray(x.data) || ArrayBuffer.isView(x.data))
      ));

    props.attributes = props.attributes ?? [];
    if (!hasGeomAttr) {
      const shape = FullscreenGeometry.GenerateGeom(props.shape);
      props.attributes.push(
        { name:       'uv', data:       shape.uv!, size: 2 },
        { name: 'position', data: shape.position!, size: 3 },
      );
    }

    super(props);
  }

  /**
   * @desc {@link FullscreenGeometry} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is FullscreenGeometry} specifying whether the input is a {@link FullscreenGeometry}
   */
  public static Is(obj: unknown): obj is FullscreenGeometry {
    return obj instanceof FullscreenGeometry;
  }

  /**
   * @desc generates the buffers associated with this geometry
   * @static
   *
   * @param {FullscreenGeomType} [shape='tri'] specifies whether to generate a `tri` or `quad` geometry; defaults to `tri`
   *
   * @returns {IGeometryShape} an `object` describing the attributes of this geometry type
   */
  public static GenerateGeom(shape: FullscreenGeomType = 'tri'): IGeometryShape {
    let uv!: Float32Array, position!: Float32Array;
    switch (shape) {
      case 'quad': {
        // 4 UV coords
        uv = new Float32Array([
          0, 1,
          0, 0,
          1, 1,
          1, 0,
        ]);

        // 6 vertices
        position = new Float32Array([
          -1,  1, 0,
          -1, -1, 0,
           1,  1, 0,
           1, -1, 0,
        ]);
      } break;

      case 'tri':
      default: {
        // 3 UV coords
        uv = new Float32Array([
          0, 0,
          2, 0,
          0, 2
        ]);

        // 3 vertices
        position = new Float32Array([
          -1, -1, 0,
           3, -1, 0,
          -1,  3, 0,
        ]);
      } break;
    }

    return { uv, position };
  }
};
