import * as NumberUtils from './number';

import { Vec3, Vec3Like } from './vec3';
import { Quat, QuatLike } from './quat';
import { Const, Signal, ExplorerError } from '@engine/common';

// TODO:
//  - Need to implement `Lerp` and `Slerp` methods

/**
 * @desc some {@link https://en.wikibooks.org/wiki/GLSL_Programming/Vector_and_Matrix_Operations|Mat3-like} object
 */
export type Mat3Like = ArrayOf<'at least', 9, number> | (Float32Array & { length: 9 });

/**
 * @desc some {@link https://en.wikibooks.org/wiki/GLSL_Programming/Vector_and_Matrix_Operations|Mat4-like} object
 */
export type Mat4Like = Mat4 | ArrayOf<'at least', 16, number> | (Float32Array & { length: 16 });

/**
 * @desc A matrix-like object, describing either a {@link Mat3Like} or {@link Mat4Like} object
 */
export type MatLike = Mat3Like | Mat4Like;

/**
 * @desc a Mat3 serialised to a dict (right, up, back)
 */
// prettier-ignore
export interface Mat3Obj {
  rx: number, ry: number, rz: number,
  bx: number, uy: number, uz: number,
  ux: number, by: number, bz: number,
}

/**
 * @desc a Mat4 serialised to a dict (pos, right, up, back)
 */
// prettier-ignore
export interface Mat4Obj {
   x: number,  y: number,  z: number,  w: number,
  rx: number, ry: number, rz: number, rw: number,
  ux: number, uy: number, uz: number, uw: number,
  bx: number, by: number, bz: number, bw: number,
}

const /**
   * @desc mat4 identity matrix
   * @type {Array<number>}
   */
  // prettier-ignore
  MAT4_IDNT: Array<number> = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ],
  /**
   * @desc mat4 zero matrix
   * @type {Array<number>}
   */
  // prettier-ignore
  MAT4_ZERO: Array<number> = [
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ];

/**
 * Class representing a Mat4x4
 * @see ref: http://www.opengl.org/archives/resources/faq/technical/transformations.htm
 * @desc Mat stored {@link http://www.mcihanozer.com/tips/computer-graphics/rendering-related-tips/matrix-major-orders/|row-major} internally
 * @note
 *  | Value                         | Mat[IxJ]           | Index          | Identity   |
 *  |-------------------------------|--------------------|----------------|------------|
 *  | xAxis.x, xAxis.y, xAxis.z, wX | m00, m01, m02, m03 |  0,  1,  2,  3 | 1, 0, 0, 0 |
 *  | yAxis.x, yAxis.y, yAxis.z, wY | m10, m11, m12, m13 |  4,  5,  6,  7 | 0, 1, 0, 0 |
 *  | zAxis.x, zAxis.y, zAxis.z, wZ | m20, m21, m22, m23 |  8,  9, 10, 11 | 0, 0, 1, 0 |
 *  | Trans.x, Trans.y, Trans.z, wW | m30, m31, m32, m33 | 12, 13, 14, 15 | 0, 0, 0, 1 |
 *
 * @class
 * @constructor
 * @extends Array
 */
// prettier-ignore
export class Mat4 extends Array<number> {
  /**
   * @desc this class' type name
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Mat4.name;

  /**
   * @desc changed event dispatcher
   * @type {Signal}
   * @protected
   */
  protected _changedSignal?: Signal;

  /**
   * @desc constructs a {@link Mat4} instance (expects row-major order)
   * @see http://www.mcihanozer.com/tips/computer-graphics/rendering-related-tips/matrix-major-orders/
   * @note
   *  | Value                         | Mat[IxJ]           | Index          | Identity   |
   *  |-------------------------------|--------------------|----------------|------------|
   *  | xAxis.x, xAxis.y, xAxis.z, wX | m00, m01, m02, m03 |  0,  1,  2,  3 | 1, 0, 0, 0 |
   *  | yAxis.x, yAxis.y, yAxis.z, wY | m10, m11, m12, m13 |  4,  5,  6,  7 | 0, 1, 0, 0 |
   *  | zAxis.x, zAxis.y, zAxis.z, wZ | m20, m21, m22, m23 |  8,  9, 10, 11 | 0, 0, 1, 0 |
   *  | Trans.x, Trans.y, Trans.z, wW | m30, m31, m32, m33 | 12, 13, 14, 15 | 0, 0, 0, 1 |
   */
  public constructor(
    m00: number = 1, m01: number = 0, m02: number = 0, m03: number = 0,
    m10: number = 0, m11: number = 1, m12: number = 0, m13: number = 0,
    m20: number = 0, m21: number = 0, m22: number = 1, m23: number = 0,
    m30: number = 0, m31: number = 0, m32: number = 0, m33: number = 1,
  ) {
    super(16);

    this[ 0] = m00, this[ 1] = m01, this[ 2] = m02, this[ 3] = m03, // rx ry rz wx
    this[ 4] = m10, this[ 5] = m11, this[ 6] = m12, this[ 7] = m13, // ux uy uz wy
    this[ 8] = m20, this[ 9] = m21, this[10] = m22, this[11] = m23, // bx by bz wz
    this[12] = m30, this[13] = m31, this[14] = m32, this[15] = m33; // px py pz ww
  }

  /**
   * @static
   *
   * @returns {Mat4} an identity matrix
   */
  public static Identity(): Mat4 {
    return new Mat4(...MAT4_IDNT);
  }

  /**
   * @static
   *
   * @returns {Mat4} a matrix with zeroed components
   */
  public static Zero(): Mat4 {
    return new Mat4(...MAT4_ZERO);
  }

  /**
   * @desc construct a quat from an array of components (expects row-major order)
   * @static
   *
   * @param {number[]} arr      some numeric array describing the matrix components
   * @param {number}   [offset] optionally specify the array offset
   *
   * @returns {Mat4} the constructed mat
   */
  public static FromArray(arr: Array<number>, offset: number = 0): Mat4 {
    if (arr.length - offset < 16) {
      const rem = arr.length - offset;
      throw new ExplorerError({
        msg: `Expected remaining length of at least 16 elements but got Res<remainder: ${rem}, offset: ${offset}>`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    return new Mat4(
      arr[offset +  0], arr[offset +  1], arr[offset +  2], arr[offset +  3],
      arr[offset +  4], arr[offset +  5], arr[offset +  6], arr[offset +  7],
      arr[offset +  8], arr[offset +  9], arr[offset + 10], arr[offset + 11],
      arr[offset + 12], arr[offset + 13], arr[offset + 14], arr[offset + 15]
    );
  }

  /**
   * @desc sets this matrix to a {@link https://en.wikipedia.org/wiki/Orthographic_projection|orthographic projection} matrix
   * @static
   *
   * @param {number} left   bound of frustum
   * @param {number} right  bound of frustum
   * @param {number} bottom bound of frustum
   * @param {number} top    bound of frustum
   * @param {number} near   bound of frustum
   * @param {number} far    bound of frustum
   *
   * @returns {Mat4} the constructed mat
   */
  public static OrthographicProjection(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): Mat4 {
    return new Mat4().setOrthographicProj(left, right, bottom, top, near, far);
  }

  /**
   * @desc constructs a {@link https://en.wikipedia.org/wiki/3D_projection|perspective projection} matrix
   * @static
   *
   * @param {number} fov    field of view (in degrees)
   * @param {number} aspect viewport aspect ratio
   * @param {number} near   near distance of frustum
   * @param {number} far    far distance of frustum
   *
   * @returns {Mat4} the constructed mat
   */
  public static PerspectiveProjection(fov: number, aspect: number, near: number, far: number): Mat4 {
    return new Mat4().setPerspectiveProj(fov, aspect, near, far);
  }

  /**
   * @desc construct a new mat from the rotation part of the given matrix
   * @static
   *
   * @param {MatLike} mat some Mat3/Mat4-like object
   *
   * @returns {Mat4} the constructed mat
   */
  public static RotationFromMat(mat: MatLike): Mat4 {
    return new Mat4().setBasisFromMat(mat);
  }

  /**
   * @desc construct a matrix from translation, rotation and, optionally, a scale vec
   * @static
   *
   * @param {Vec3Like} vec     some {@link Vec3Like} describing the translation part
   * @param {QuatLike} quat    some {@link QuatLike} describing the orientation part
   * @param {Vec3Like} [scale] some {@link Vec3Like} describing the scale part; defaults to `[1, 1, 1]`
   *
   * @returns {Mat4} the constructed mat
   */
  public static FromTRS(vec: Vec3Like, quat: QuatLike, scale?: Vec3Like): Mat4 {
    return new Mat4().setTRS(vec, quat, scale);
  }

  /**
   * @desc instantiate a matrix from the local forward, up and right vectors of some imaginary rotation matrix
   * @note assumes all vectors are normalised
   * @static
   *
   * @param {Vec3Like} v0 right vector
   * @param {Vec3Like} v1 up vector
   * @param {Vec3Like} v2 back vector
   *
   * @returns {Mat4} the resulting matrix
   */
  public static FromVectors<T extends Vec3Like>(v0: T, v1: T, v2?: T): Mat4 {
    const m00 = v0[0], m01 = v0[1], m02 = v0[2];     // right
    const m10 = v1[0], m11 = v1[1], m12 = v1[2];     // up

    let m20!: number, m21: number, m22: number;   // back
    if (typeof v2 === 'undefined') {
      m20 = m01*m12 - m02*m11;
      m21 = m02*m10 - m00*m12;
      m22 = m00*m11 - m01*m10;

      let d = m20*m20 + m21*m21 + m22*m22;
      if (Math.abs(d - 1) > Const.EPSILON) {
        d = 1 / Math.sqrt(d);
        m20 *= d;
        m21 *= d;
        m22 *= d;
      }
    } else {
      m20 = v2[0], m21 = v2[1], m22 = v2[2];
    }

    return new Mat4(
      m00, m01, m02, 0,
      m10, m11, m12, 0,
      m20, m21, m22, 0,
        0,   0,   0, 1
    );
  }

  /**
   * @desc construct a matrix from a Vec3 describing some translation
   * @static
   *
   * @param {Vec3Like} vec some {@link Vec3Like} object describing the translation part of a matrix
   *
   * @returns {Mat4} the constructed mat
   */
  public static FromTranslation(vec: Vec3Like): Mat4 {
    return new Mat4(
           1,      0,      0, 0,
           0,      1,      0, 0,
           0,      0,      1, 0,
      vec[0], vec[1], vec[2], 1
    );
  }

  /**
   * @desc instantiate a matrix from a translation vector and the the local forward, up and right vectors of some imaginary rotation matrix
   * @note assumes all basis vectors are normalised
   * @static
   *
   * @param {Vec3Like} pos  translation
   * @param {Vec3Like} v0   right vector
   * @param {Vec3Like} v1   up vector
   * @param {Vec3Like} [v2] optionally specify the back vector
   *
   * @returns {Mat4} the resulting matrix
   */
  public static FromTranslationAndBasis<T extends Vec3Like>(pos: T, v0: T, v1: T, v2?: T): Mat4 {
    return Mat4.FromVectors(v0, v1, v2).setTranslation(pos);
  }

  /**
   * @desc construct a mat from a quaternion
   * @static
   *
   * @param {QuatLike} quat some {@link QuatLike} describing the orientation part
   *
   * @returns {Mat} the constructed mat
   */
  public static FromQuaternion(quat: QuatLike): Mat4 {
    return new Mat4().setRotation(quat);
  }

  /**
   * @desc constructs a matrix from an axis of rotation and an angle
   * @note this method will normalise the axis of rotation
   * @static
   *
   * @param {Vec3Like} axis  some axis of rotation
   * @param {number}   angle some rotation angle
   *
   * @returns {Mat4} the constructed mat
   */
  public static FromAxisAngle(axis: Vec3Like, angle: number): Mat4 {
    let x = axis[0], y = axis[1], z = axis[2];
    let d = x*x + y*y + z*z;
    if (Math.abs(d - 1) > Const.EPSILON) {
      d = 1 / Math.sqrt(d);
      x *= d;
      y *= d;
      z *= d;
    }

    const s = Math.sin(angle);
    const c = Math.cos(angle);

    const t = 1 - c;
    return new Mat4(
        c + t*x*x, t*x*y + s*z, t*x*z - s*y, 0,
      t*x*y - s*z,   c + t*y*y, t*y*z + s*x, 0,
      t*x*z + s*y, t*y*z - s*x,   c + t*z*z, 0,
                0,           0,           0, 1
    );
  }

  /**
   * @desc construct a matrix from an XYZ-ordered euler rotation
   * @static
   *
   * @param {Vec3Like} vec some XYZ-ordered euler rotation (in radians)
   *
   * @returns {Mat4} the resulting matrix
   */
  public static FromEulerXYZ(vec: Vec3Like): Mat4 {
    return new Mat4().setFromEulerXYZ(vec);
  }

  /**
   * @desc constructs a matrix that rotates some directional vector to coincide with the target direction
   *       with respect to some world up vector
   * @static
   *
   * @note up vector will be normalised
   * @important take note that this differs from its quaternion counterpart, such that:
   *  1. We expect positions, not directions
   *  2. The translation part of this matrix will reflect the `from` parameter
   *
   * @param {Vec3Like} from         some source position
   * @param {Vec3Like} to           some target position
   * @param {Vec3Like} [up=[0,1,0]] the world up vector; defaults to `[0, 1, 0]`
   *
   * @returns {Mat4} the resulting matrix
   */
  public static LookAt(from: Vec3Like, to: Vec3Like, up: Vec3Like = [0, 1, 0]): Mat4 {
    return Mat4.FromTranslation(from).lookAt(to, up);
  }

  /**
   * @desc {@link Mat4} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Mat4} specifying whether the input is a {@link Mat4}
   */
  public static Is(obj: unknown): obj is Mat4 {
    return obj instanceof Object
      && 'isA' in obj
      && (typeof obj.isA === 'function' && obj.isA.length === 1)
      && obj.isA(Mat4.ClassName);
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Mat4';
  }

  /**
   * @desc number of components stored within this instance
   */
  public get length(): number {
    return 16;
  }

  /**
   * @desc get component arr
   * @type {number[]}
   * @public
   */
  public get components(): number[] {
    return this.slice(0);
  }

  /**
   * @desc changed signal getter
   * @type {Signal}
   * @public
   */
  public get changedSignal(): Signal {
    let signal = this._changedSignal;
    if (!signal) {
      signal = new Signal();
      this._changedSignal = signal;
    }

    return signal;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
   * @type {string}
   * @public
   */
  public get [Symbol.toStringTag](): string {
    const tx = this[12], ty = this[13], tz = this[14];
    const rot = this.toEulerXYZ();
    return `${this.ClassName}<trans: Vec3(${tx}, ${ty}, ${tz}), rot: Eul(${rot[0]}, ${rot[1]}, ${rot[2]})>`;
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
   * @desc formats this instance as a glsl object
   * @note glsl doesn't support quat so we're formatting it as a `vec4`
   *
   * @returns {string} string representation
   */
  public serialiseString(): string {
    const r = `vec4(${this[ 0]}, ${this[ 1]}, ${this[ 2]}, ${this[ 3]})`;
    const u = `vec4(${this[ 4]}, ${this[ 5]}, ${this[ 6]}, ${this[ 7]})`;
    const b = `vec4(${this[ 8]}, ${this[ 9]}, ${this[10]}, ${this[11]})`;
    const p = `vec4(${this[12]}, ${this[13]}, ${this[14]}, ${this[15]})`;
    return `mat4(${r}, ${u}, ${b}, ${p})`;
  }

  /**
   * @desc mark this object's components as dirty, thereby dispatching the `onChanged` message
   *
   * @returns {this} this instance
   */
  public markDirty(): this {
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc tests exact equality
   *
   * @param {MatLike} mat some object to compare
   *
   * @returns {boolean} evaluates to `true` if the object are exactly equal
   */
  public equals(mat: MatLike): boolean {
    if (this.length !== mat.length) {
      return false;
    }

    let index!: number;
    for (let i = 0; i < 4; ++i) {
      for (let j = 0; j < 3; ++j) {
        index = i*4 + j;
        if (this[index] !== mat[index as keyof MatLike]) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * @desc tests approximate equality
   *
   * @param {MatLike} mat        some mat representation
   * @param {number}  [eps=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if the object is approximately equal
   */
  public approximately(mat: MatLike, eps?: number): boolean {
    if (this.length !== mat.length) {
      return false;
    }

    let index!: number;
    for (let i = 0; i < 4; ++i) {
      for (let j = 0; j < 3; ++j) {
        index = i*4 + j;
        if (!NumberUtils.approximately(this[index], mat[index], eps)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * @note serialises as row-major ordered
   * @returns {Array} a serialised copy of this mat's components
   */
  public serialise(): Mat4Obj {
    return {
      x: this[12],  y: this[13],  z: this[14],  w: this[15],
     rx: this[ 0], ry: this[ 1], rz: this[ 2], rw: this[ 3],
     ux: this[ 4], uy: this[ 5], uz: this[ 6], uw: this[ 7],
     bx: this[ 8], by: this[ 9], bz: this[10], bw: this[11],
    };
  }

  /**
   * @desc constructs a copy of this matrix
   *
   * @returns {Mat4} a copy of this mat
   */
  public clone(): Mat4 {
    return new Mat4(...this);
  }

  /**
   * @desc copies the components of a mat in-place
   *
   * @param {Mat4Like} mat some mat representation
   *
   * @returns {this} the in-place updated mat
   */
  public copy(mat: Mat4Like): this {
    this.splice(0, this.length, ...mat);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} [epsSq=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if sum of components is approx. `0`
   */
  public isZero(epsSq: number = Const.EPSILON): boolean {
    return epsSq > (
      this[ 0] + this[ 1] + this[ 2] +
      this[ 4] + this[ 5] + this[ 6] +
      this[ 8] + this[ 9] + this[10] +
      this[12] + this[13] + this[14]
    );
  }

  /**
   * @param {number} [epsSq=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if this mat shares equality with its identity matrix
   */
  public isIdentity(exact: boolean = true, epsSq: number = Const.EPSILON): boolean {
    if (exact) {
      if (this[0] !== 1 || this[5] !== 1 || this[10] !== 1 || this[15] !== 1) {
        return false;
      }

      return 0 == (
        /*this[ 0]*/   this[ 1] +   this[ 2] + this[ 3] +
          this[ 4] + /*this[ 5]*/   this[ 6] + this[ 7] +
          this[ 8] +   this[ 9] + /*this[10]*/ this[11] +
          this[12] +   this[13] +   this[14] /*this[15]*/
      );
    }

    const sum = (
      this[ 0] + this[ 1] + this[ 2] + this[ 3] +
      this[ 4] + this[ 5] + this[ 6] + this[ 7] +
      this[ 8] + this[ 9] + this[10] + this[11] +
      this[12] + this[13] + this[14] + this[15]
    );

    return NumberUtils.approximately(sum, 4, epsSq);
  }

  /**
   * @returns {boolean} evaluates to `true` if any components are NaN
   */
  public isNaN(): boolean {
    for (let i = 0; i < 16; ++i) {
      if (Number.isNaN(this[i])) {
        return true;
      }
    }

    return false;
  }

  /**
   * @returns {boolean} evaluates to `true` if all components are finite
   */
  public isFinite(): boolean {
    for (let i = 0; i < 16; ++i) {
      if (!Number.isFinite(this[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * @returns {boolean} evaluates to `true` if this matrix performs a reflection across some plane
   */
  public isScaleNegative(): boolean {
    return this.determinant3x3() < 0;
  }

  /**
   * @param {number} [eps=1e-3] some epsilon threshold
   *
   * @returns {boolean} evaluates to `true` if this matrix doesn't perform any scaling
   */
  public isScaleUnitary(eps: number = 1e-3): boolean {
    return NumberUtils.approximately(this.getMaxScale(), 1, eps)
  }

  /**
   * @param {number} [eps=1e-3] some epsilon threshold
   *
   * @returns {boolean} evaluates to `true` if this matrix is scaled uniformly
   */
  public isScaleUniform(eps: number = 1e-3): boolean {
    const x = Math.sqrt(this[ 0]*this[ 0] + this[ 1]*this[ 1] + this[ 2]*this[ 2]),
          y = Math.sqrt(this[ 4]*this[ 4] + this[ 5]*this[ 5] + this[ 6]*this[ 6]),
          z = Math.sqrt(this[ 8]*this[ 8] + this[ 9]*this[ 9] + this[10]*this[10]);

    return Math.abs(x - y) < eps && Math.abs(x - z) < eps;
  }

  /**
   * @param {number} [eps=1e-3] some epsilon threshold
   *
   * @returns {boolean} evaluates to `true` if this matrix contains a projective part
   */
  public containsProjection(eps: number = 1e-3): boolean {
    const [x, y, z, w] = this.getColumn(3);
    return (
      NumberUtils.approximately(x, 0, eps) &&
      NumberUtils.approximately(y, 0, eps) &&
      NumberUtils.approximately(z, 0, eps) &&
      NumberUtils.approximately(w, 1, eps)
    );
  }

  /**
   * @desc set this mat's components
   * @note see the constructor for column/row layout
   *
   * @returns {this} in-place mat describing the given components
   */
  public set(
    m00: number = 1, m01: number = 0, m02: number = 0, m03: number = 0,
    m10: number = 0, m11: number = 1, m12: number = 0, m13: number = 0,
    m20: number = 0, m21: number = 0, m22: number = 1, m23: number = 0,
    m30: number = 0, m31: number = 0, m32: number = 0, m33: number = 1,
  ): this {
    this[ 0] = m00, this[ 4] = m10, this[ 8] = m20, this[12] = m30,
    this[ 1] = m01, this[ 5] = m11, this[ 9] = m21, this[13] = m31,
    this[ 2] = m02, this[ 6] = m12, this[10] = m22, this[14] = m32,
    this[ 3] = m03, this[ 7] = m13, this[11] = m23, this[15] = m33;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set a component of this matrix at some index
   *
   * @param {number} index  the component index
   * @param {number} scalar some scalar value
   *
   * @returns {this} this mat, updated in-place
   */
  public setComponent(index: number, scalar: number): this {
    this[index] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this mat's row value(s)
   *
   * @param {number} i   the row index
   * @param {number} x   some x value
   * @param {number} y   some y value
   * @param {number} z   some z value
   * @param {number} [w] some w value; defaults to current value, i.e. defaults to `0` on basis or `1` on translation row
   *
   * @returns {this} this mat, updated in-place
   */
  public setRow(i: number, x: number, y: number, z: number, w?: number): this {
    i *= 4;

    this[i + 0] = x;
    this[i + 1] = y;
    this[i + 2] = z;
    this[i + 3] = typeof w !== 'undefined' ? w : this[i + 3];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this mat's column value(s)
   *
   * @param {number} i the col index
   * @param {number} x some x value
   * @param {number} y some y value
   * @param {number} z some z value
   * @param {number} w some w value
   *
   * @returns {this} this mat, updated in-place
   */
  public setColumn(i: number, x: number, y: number, z: number, w: number): this {
    this[i +  0] = x;
    this[i +  4] = y;
    this[i +  8] = z;
    this[i + 12] = w;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this matrix to a {@link https://en.wikipedia.org/wiki/3D_projection|perspective projection} matrix
   *
   * @param {number} left   bound of frustum
   * @param {number} right  bound of frustum
   * @param {number} bottom bound of frustum
   * @param {number} top    bound of frustum
   * @param {number} near   bound of frustum
   * @param {number} far    bound of frustum
   *
   * @returns {this} perspective proj matrix computed in-place
   */
  public setFrustumPerspProj(
    left: number, right: number,
    top: number, bottom: number,
    near: number, far: number
  ): this {
		const x = 2*near / (right -   left),
		      y = 2*near / (  top - bottom);

		const a = (right +   left) / (right -   left),
		      b = (  top + bottom) / (  top - bottom);

		let c = -( 1*far + near) / (far - near),
        d =  (-2*far * near) / (far - near);

    this[ 0] = x, this[ 4] = 0, this[ 8] =  a, this[12] = 0,
    this[ 1] = 0, this[ 5] = y, this[ 9] =  b, this[13] = 0,
    this[ 2] = 0, this[ 6] = 0, this[10] =  c, this[14] = d,
    this[ 3] = 0, this[ 7] = 0, this[11] = -1, this[15] = 0;

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this matrix to a {@link https://en.wikipedia.org/wiki/3D_projection|perspective projection} matrix
   *
   * @param {number} fov    field of view (in degrees)
   * @param {number} aspect viewport aspect ratio
   * @param {number} near   near distance of frustum
   * @param {number} far    far distance of frustum
   *
   * @returns {this} perspective proj matrix computed in-place
   */
  public setPerspectiveProj(fov: number, aspect: number, near: number, far: number): this {
    const depth = 1 / (near - far);
    const fTanFov = 1 / Math.tan((fov * Const.DEG2RAD)*0.5);

    this[ 0] = fTanFov / aspect;
    this[ 1] = 0;
    this[ 2] = 0;
    this[ 3] = 0;

    this[ 4] = 0;
    this[ 5] = fTanFov;
    this[ 6] = 0;
    this[ 7] = 0;

    this[ 8] = 0;
    this[ 9] = 0;
    this[10] = (far + near)*depth;
    this[11] = -1;

    this[12] = 0;
    this[13] = 0;
    this[14] = 2*far*near*depth;
    this[15] = 0;

    this.handleOnChanged();
		return this;
  }

  /**
   * @desc sets this matrix to a {@link https://en.wikipedia.org/wiki/Orthographic_projection|orthographic projection} matrix
   *
   * @param {number} left     bound of frustum
   * @param {number} right    bound of frustum
   * @param {number} bottom   bound of frustum
   * @param {number} top      bound of frustum
   * @param {number} near     bound of frustum
   * @param {number} far      bound of frustum
   *
   * @returns {this} orthographic proj matrix computed in-place
   */
  public setOrthographicProj(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): this {
		// const w = 1.0 / ( right - left );
		// const h = 1.0 / ( top - bottom );
		// const p = 1.0 / ( far - near );

		// const x = ( right + left ) * w;
		// const y = ( top + bottom ) * h;

    // const z = p*(far + near);
    // const zInv = -2*p;

    this[ 0] = 2 / (right - left);
    this[ 1] = 0;
    this[ 2] = 0;
    this[ 3] = 0;
    this[ 4] = 0;
    this[ 5] = 2 / (top - bottom);
    this[ 6] = 0;
    this[ 7] = 0;
    this[ 8] = 0;
    this[ 9] = 0;
    this[10] = 2 / (near - far);
    this[11] = 0;
    this[12] = (left + right) / (left - right);
    this[13] = (bottom + top) / (bottom - top);
    this[14] = (near + far) / (near - far);
    this[15] = 1;

    // this[ 0] = 2*w, this[ 4] =   0, this[ 8] =    0, this[12] = -x,
    // this[ 1] =   0, this[ 5] = 2*h, this[ 9] =    0, this[13] = -y,
    // this[ 2] =   0, this[ 6] =   0, this[10] = zInv, this[14] = -z,
    // this[ 3] =   0, this[ 7] =   0, this[11] =    0, this[15] =  1;
    this.handleOnChanged();
		return this;
  }

  /**
   * @param {Vector3} vec some translation
   *
   * @returns {this} in-place mat whose translation part describes the given input vec
   */
  public setTranslation(vec: Vec3Like): this {
    this[12] = vec[0];
    this[13] = vec[1];
    this[14] = vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set the translation components
   *
   * @param {number} [x] x component of the translation; defaults to current x
   * @param {number} [y] y component of the translation; defaults to current y
   * @param {number} [z] z component of the translation; defaults to current z
   *
   * @returns {this} in-place mat whose translation part describes the given input vec
   */
  public setTranslationXYZ(x?: number, y?: number, z?: number): this {
    this[12] = x ?? this[12];
    this[13] = y ?? this[13];
    this[14] = z ?? this[14];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc copy the translation part from another matrix
   *
   * @param {Mat4} mat some Mat4 object
   *
   * @returns {this} this mat, updated in-place
   */
  public setTranslationFromMat(mat: Mat4): this {
    this[12] = mat[12];
    this[13] = mat[13];
    this[14] = mat[14];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set basis component values
   *
   * @param {number}   i   some column index
   * @param {Vec3Like} vec some vector
   *
   * @returns {this} this mat updated in-place
   */
  public setBasis(i: number, vec: Vec3Like): this {
    i *= 4;

    this[i + 0] = vec[0];
    this[i + 1] = vec[1];
    this[i + 2] = vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set basis component values
   *
   * @param {number} i some column index
   * @param {number} x x value
   * @param {number} y y value
   * @param {number} z z value
   *
   * @returns {this} this mat updated in-place
   */
  public setBasisXYZ(i: number, x: number, y: number, z: number): this {
    i *= 4;

    this[i + 0] = x;
    this[i + 1] = y;
    this[i + 2] = z;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this mat's basis to another's basis
   *
   * @param {MatLike} mat Mat3/Mat4-like object
   *
   * @returns {this} this matrix, updated in-place
   */
  public setBasisFromMat(mat: MatLike): this {
    let m00!: number, m01!: number, m02!: number,
        m10!: number, m11!: number, m12!: number,
        m20!: number, m21!: number, m22!: number;

    if (mat.length === 9) {
      // i.e. Mat3x3
      m00 = mat[0], m01 = mat[1], m02 = mat[2],
      m10 = mat[3], m11 = mat[4], m12 = mat[5],
      m20 = mat[6], m21 = mat[7], m22 = mat[8];
    } else if (mat.length === 16) {
      // i.e. Mat4x4
      m00 = mat[ 0], m01 = mat[ 1], m02 = mat[ 2],
      m10 = mat[ 4], m11 = mat[ 5], m12 = mat[ 6],
      m20 = mat[ 8], m21 = mat[ 9], m22 = mat[10];
    }

    const sx = 1 / Math.sqrt(m00*m00 + m01*m01 + m02*m02),
          sy = 1 / Math.sqrt(m10*m10 + m11*m11 + m12*m12),
          sz = 1 / Math.sqrt(m20*m20 + m21*m21 + m22*m22);

    // Right
    this[ 0] = m00*sx;
    this[ 1] = m01*sx;
    this[ 2] = m02*sx;
    this[ 3] = 0;

    // Up
    this[ 4] = m10*sy;
    this[ 5] = m11*sy;
    this[ 6] = m12*sy;
    this[ 7] = 0;

    // Back
    this[ 8] = m20*sz;
    this[ 9] = m21*sz;
    this[10] = m22*sz;
    this[11] = 0;

    // Trans
    this[12] = 0;
    this[13] = 0;
    this[14] = 0;
    this[15] = 1;

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this matrix as a scale transform
   *
   * @param {number} x scale factor
   * @param {number} y scale factor
   * @param {number} z scale factor
   *
   * @returns {this} scale transform
   */
  public setScale(x: number, y: number, z: number): this {
    this[ 0] = x, this[ 1] = 0, this[ 2] = 0, this[ 3] = 0,
    this[ 4] = 0, this[ 5] = y, this[ 6] = 0, this[ 7] = 0,
    this[ 8] = 0, this[ 9] = 0, this[10] = z, this[11] = 0,
    this[12] = 0, this[13] = 0, this[14] = 0, this[15] = 1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this matrix as a scale transform, scaled on a specific axis
   *
   * @param {number} s scale factor
   *
   * @returns {this} scale transform
   */
  public setScaleX(s: number): this {
    this[ 0] = s, this[ 1] = 0, this[ 2] = 0, this[ 3] = 0,
    this[ 4] = 0, this[ 5] = 1, this[ 6] = 0, this[ 7] = 0,
    this[ 8] = 0, this[ 9] = 0, this[10] = 1, this[11] = 0,
    this[12] = 0, this[13] = 0, this[14] = 0, this[15] = 1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this matrix as a scale transform, scaled on a specific axis
   *
   * @param {number} s scale factor
   *
   * @returns {this} scale transform
   */
  public setScaleY(s: number): this {
    this[ 0] = 1, this[ 1] = 0, this[ 2] = 0, this[ 3] = 0,
    this[ 4] = 0, this[ 5] = s, this[ 6] = 0, this[ 7] = 0,
    this[ 8] = 0, this[ 9] = 0, this[10] = 1, this[11] = 0,
    this[12] = 0, this[13] = 0, this[14] = 0, this[15] = 1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this matrix as a scale transform, scaled on a specific axis
   *
   * @param {number} s scale factor
   *
   * @returns {this} scale transform
   */
  public setScaleZ(s: number): this {
    this[ 0] = 1, this[ 1] = 0, this[ 2] = 0, this[ 3] = 0,
    this[ 4] = 0, this[ 5] = 1, this[ 6] = 0, this[ 7] = 0,
    this[ 8] = 0, this[ 9] = 0, this[10] = s, this[11] = 0,
    this[12] = 0, this[13] = 0, this[14] = 0, this[15] = 1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this mat to a shear transform
   *
   * @param {number} xy right y factor
   * @param {number} xz right z factor
   * @param {number} yx up x factor
   * @param {number} yz up z factor
   * @param {number} zx back x factor
   * @param {number} zy back y factor
   *
   * @returns {this} shear transform
   */
  public setShear(xy: number, xz: number, yx: number, yz: number, zx: number, zy: number): this {
    this[ 0] =  1, this[ 4] = yx, this[ 8] = zx, this[12] = 0,
    this[ 1] = xy, this[ 5] =  1, this[ 9] = zy, this[13] = 0,
    this[ 2] = xz, this[ 6] = yz, this[10] =  1, this[14] = 0,
    this[ 3] =  0, this[ 7] =  0, this[11] =  0, this[15] = 1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this mat to a matrix that shears along a principal axis
   *
   * @param {number} xy y factor
   * @param {number} xz z factor
   *
   * @returns {this} shear transform
   */
  public setShearX(xy: number, xz: number): this {
    this[ 0] =  1, this[ 4] = 0, this[ 8] = 0, this[12] = 0,
    this[ 1] = xy, this[ 5] = 1, this[ 9] = 0, this[13] = 0,
    this[ 2] = xz, this[ 6] = 0, this[10] = 1, this[14] = 0,
    this[ 3] =  0, this[ 7] = 0, this[11] = 0, this[15] = 1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this mat to a matrix that shears along a principal axis
   *
   * @param {number} yx x factor
   * @param {number} yz z factor
   *
   * @returns {this} shear transform
   */
  public setShearY(yx: number, yz: number): this {
    this[ 0] = 1, this[ 4] = yx, this[ 8] = 0, this[12] = 0,
    this[ 1] = 0, this[ 5] =  1, this[ 9] = 0, this[13] = 0,
    this[ 2] = 0, this[ 6] = yz, this[10] = 1, this[14] = 0,
    this[ 3] = 0, this[ 7] =  0, this[11] = 0, this[15] = 1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this mat to a matrix that shears along a principal axis
   *
   * @param {number} zx x factor
   * @param {number} zy y factor
   *
   * @returns {this} shear transform
   */
  public setShearZ(zx: number, zy: number): this {
    this[ 0] = 1, this[ 4] = 0, this[ 8] = zx, this[12] = 0,
    this[ 1] = 0, this[ 5] = 1, this[ 9] = zy, this[13] = 0,
    this[ 2] = 0, this[ 6] = 0, this[10] =  1, this[14] = 0,
    this[ 3] = 0, this[ 7] = 0, this[11] =  0, this[15] = 1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set the rotation part of this matrix to the given angle about the given axis
   * @note this method will normalise the axis of rotation
   *
   * @param {Vec3Like} axis  some rotation axis
   * @param {number}   angle some rotation angle
   *
   * @returns {this} in-place mat rotated about some axis by some angle
   */
  public rotateAxisAngle(axis: Vec3Like, angle: number): this {
    return this.mulMatrices(this, Mat4.FromAxisAngle(axis, angle));
  }

  /**
   * @desc update the translation, rotation and scale parts of this matrix
   *
   * @param {Vec3Like} vec               some {@link Vec3Like} describing the translation part
   * @param {QuatLike} quat              some {@link QuatLike} describing the orientation part
   * @param {Vec3Like} [scale=[1, 1, 1]] some {@link Vec3Like} describing the scale part; defaults to `[1, 1, 1]`
   *
   * @returns {this} the resulting matrix
   */
  public setTRS(vec: Vec3Like, quat: QuatLike, scale: Vec3Like = [1, 1, 1]): this {
    const sx = scale[0], sy = scale[1], sz = scale[2];
		const qx =  quat[0], qy =  quat[1], qz =  quat[2], qw = quat[3];

    const xx = 2*qx*qx
    const xy = 2*qy*qx
    const xz = 2*qz*qx
    const yy = 2*qy*qy
    const yz = 2*qz*qy
    const zz = 2*qz*qz
    const wx = 2*qx*qw
    const wy = 2*qy*qw
    const wz = 2*qz*qw

    const m00 = (1 - (yy + zz))*sx,
          m01 = (xy + wz)*sx,
          m02 = (xz - wy)*sx,
          m10 = (xy - wz)*sy,
          m11 = (1 - (xx + zz))*sy,
          m12 = (yz + wx)*sy,
          m20 = (xz + wy)*sz,
          m21 = (yz - wx)*sz,
          m22 = (1 - (xx + yy))*sz;

    this[ 0] = m00, this[ 4] = m10, this[ 8] = m20, this[12] = vec[0],
    this[ 1] = m01, this[ 5] = m11, this[ 9] = m21, this[13] = vec[1],
    this[ 2] = m02, this[ 6] = m12, this[10] = m22, this[14] = vec[2],
    this[ 3] =   0, this[ 7] =   0, this[11] =   0, this[15] =      1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} quat some quaternion
   *
   * @returns {this} in-place mat whose rotation part describes the given quat
   */
  public setRotation(quat: QuatLike): this {
		const qx =  quat[0], qy =  quat[1], qz =  quat[2], qw = quat[3];

    const qxp = qx + qx,
          qyp = qy + qy,
          qzp = qz + qz;

		const xx = qx*qxp, xy = qx*qyp, xz = qx*qzp;
		const yy = qy*qyp, yz = qy*qzp, zz = qz*qzp;
		const wx = qw*qxp, wy = qw*qyp, wz = qw*qzp;

    // Right
    this[ 0] = 1 - (yy + zz);  //  0 | rx
    this[ 1] = xy + wz;        //  1 | ry
    this[ 2] = xz - wy;        //  2 | rz

    // Up
    this[ 4] = xy - wz;        //  4 | ux
    this[ 5] = 1 - (xx + zz);  //  5 | uy
    this[ 6] = yz + wx;        //  6 | uz

    // Back
    this[ 8] = xz + wy;        //  8 | bx
    this[ 9] = yz - wx;        //  9 | by
    this[10] = 1 - (xx + yy);  // 10 | bz

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this matrix from an XYZ-ordered euler rotation
   *
   * @param {Vec3Like} vec some XYZ-ordered euler rotation (in radians)
   *
   * @returns {this} in-place mat representing the euler rotation
   */
  public setFromEulerXYZ(vec: Vec3Like): this {
    const x = vec[0], y = vec[1], z = vec[2];

		const cx = Math.cos(x), sx = Math.sin(x);
		const cy = Math.cos(y), sy = Math.sin(y);
		const cz = Math.cos(z), sz = Math.sin(z);

    const ae = cx*cz,
          af = cx*sz,
          be = sx*cz,
          bf = sx*sz;

    // X
    this[ 0] =  cy*cz;
    this[ 4] = -cy*sz;
    this[ 8] =  sy;

    // Y
    this[ 1] =  af + be*sy;
    this[ 5] =  ae - bf*sy;
    this[ 9] = -sx*cy;

    // Z
    this[ 2] =  bf - ae*sy;
    this[ 6] =  be + af*sy;
    this[10] = cx*cy;

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc extracts the rotation of this mat into an XYZ-ordered euler rotation (in radians)
   *
   * @param {Vec3} [vec] optionally specify a Vec3 to compute in-place
   *
   * @returns {Vec3} a vector describing the XYZ ordered euler rotation (in radians)
   */
  public toEulerXYZ(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    // X
    const m00 = this[ 0];  //  0 | rx
    const m10 = this[ 4];  //  4 | ux
    const m20 = this[ 8];  //  8 | bx

    // Y
    // const m01 = this[ 1];  //  1 | ry
    const m11 = this[ 5];  //  5 | uy
    const m21 = this[ 9];  //  9 | by

    // Z
    // const m02 = this[ 2];  //  2 | rz
    const m12 = this[ 6];  //  6 | uz
    const m22 = this[10];  // 10 | bz

    const ey = Math.asin(NumberUtils.clamp(m20, -1, 1));
    if (Math.abs(m20) < 1 - Const.EPSILON) {
      return new Vec3(Math.atan2(-m21, m22), ey, Math.atan2(-m10, m00));
    }

    return new Vec3(Math.atan2(m12, m11), ey, 0);
  }

  /**
   * @desc set a matrix from an array of components
   *
   * @param {number[]} arr      some numeric array describing the mat components
   * @param {number}   [offset] optionally specify the array offset
   *
   * @returns {this} an in-place mat set to the given components
   */
  public setFromArray(arr: Array<number>, offset: number = 0): this {
    if (arr.length - offset < 16) {
      const rem = arr.length - offset;
      throw new ExplorerError({
        msg: `Expected remaining length of at least 16 elements but got Res<remainder: ${rem}, offset: ${offset}>`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    this[ 0] = arr[offset +  0], this[ 4] = arr[offset +  4], this[ 8] = arr[offset +  8], this[12] = arr[offset + 12],
    this[ 1] = arr[offset +  1], this[ 5] = arr[offset +  5], this[ 9] = arr[offset +  9], this[13] = arr[offset + 13],
    this[ 2] = arr[offset +  2], this[ 6] = arr[offset +  6], this[10] = arr[offset + 10], this[14] = arr[offset + 14],
    this[ 3] = arr[offset +  3], this[ 7] = arr[offset +  7], this[11] = arr[offset + 11], this[15] = arr[offset + 15];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc serialise a mat into an array
   *
   * @param {number[]} [arr]    optionally specify the array in which to emplace the components
   * @param {number}   [offset] optionally specify the array offset
   *
   * @returns {number[]} an array with this mat's components emplaced within it
   */
  public toArray(arr?: Array<number>, offset: number = 0): Array<number> {
    if (!arr) {
      arr = [];
    }

    arr[offset +  0] = this[ 0], arr[offset +  4] = this[ 4], arr[offset +  8] = this[ 8], arr[offset + 12] = this[12],
    arr[offset +  1] = this[ 1], arr[offset +  5] = this[ 5], arr[offset +  9] = this[ 9], arr[offset + 13] = this[13],
    arr[offset +  2] = this[ 2], arr[offset +  6] = this[ 6], arr[offset + 10] = this[10], arr[offset + 14] = this[14],
    arr[offset +  3] = this[ 3], arr[offset +  7] = this[ 7], arr[offset + 11] = this[11], arr[offset + 15] = this[15];
    this.handleOnChanged();
    return arr;
  }

  /**
   * @param {MatLike} mat Mat3/Mat4-like object
   *
   * @returns {this} in-place matrix describing this + mat
   */
  public add(mat: MatLike): this {
    let r00!: number, r01!: number, r02!: number, r03!: number,
        r10!: number, r11!: number, r12!: number, r13!: number,
        r20!: number, r21!: number, r22!: number, r23!: number,
        r30!: number, r31!: number, r32!: number, r33!: number;

    if (mat.length === 9) {
      // i.e. Mat3x3
      r00 = mat[0], r01 = mat[1], r02 = mat[2], r03 = 0,
      r10 = mat[3], r11 = mat[4], r12 = mat[5], r13 = 0,
      r20 = mat[6], r21 = mat[7], r22 = mat[8], r23 = 0,
      r30 =      0, r31 =      0, r32 =      0, r33 = 1;
    } else if (mat.length === 16) {
      // i.e. Mat4x4
      r00 = mat[ 0], r01 = mat[ 1], r02 = mat[ 2], r03 = mat[ 3],
      r10 = mat[ 4], r11 = mat[ 5], r12 = mat[ 6], r13 = mat[ 7],
      r20 = mat[ 8], r21 = mat[ 9], r22 = mat[10], r23 = mat[11],
      r30 = mat[12], r31 = mat[13], r32 = mat[14], r33 = mat[15];
    }

    this[ 0] += r00, this[ 1] += r01, this[ 2] += r02, this[ 3] += r03,
    this[ 4] += r10, this[ 5] += r11, this[ 6] += r12, this[ 7] += r13,
    this[ 8] += r20, this[ 9] += r21, this[10] += r22, this[11] += r23,
    this[12] += r30, this[13] += r31, this[14] += r32, this[15] += r33;

    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec Vec3Like object
   *
   * @returns {this} in-place matrix describing this + Vec3()
   */
  public addVector(vec: Vec3Like): this {
    this[12] += vec[0];
    this[13] += vec[1];
    this[14] += vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec    Vec3Like object
   * @param {number}   scalar some scalar multiplier
   *
   * @returns {this} in-place matrix describing this + Vec3()*scalar
   */
  public addScaledVector(vec: Vec3Like, scalar: number): this {
    this[12] += vec[0]*scalar;
    this[13] += vec[1]*scalar;
    this[14] += vec[2]*scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {MatLike} mat Mat3/Mat4-like object
   *
   * @returns {this} in-place matrix describing this + mat
   */
  public sub(mat: MatLike): this {
    let r00!: number, r01!: number, r02!: number, r03!: number,
        r10!: number, r11!: number, r12!: number, r13!: number,
        r20!: number, r21!: number, r22!: number, r23!: number,
        r30!: number, r31!: number, r32!: number, r33!: number;

    if (mat.length === 9) {
      // i.e. Mat3x3
      r00 = mat[0], r01 = mat[1], r02 = mat[2], r03 = 0,
      r10 = mat[3], r11 = mat[4], r12 = mat[5], r13 = 0,
      r20 = mat[6], r21 = mat[7], r22 = mat[8], r23 = 0,
      r30 =      0, r31 =      0, r32 =      0, r33 = 1;
    } else if (mat.length === 16) {
      // i.e. Mat4x4
      r00 = mat[ 0], r01 = mat[ 1], r02 = mat[ 2], r03 = mat[ 3],
      r10 = mat[ 4], r11 = mat[ 5], r12 = mat[ 6], r13 = mat[ 7],
      r20 = mat[ 8], r21 = mat[ 9], r22 = mat[10], r23 = mat[11],
      r30 = mat[12], r31 = mat[13], r32 = mat[14], r33 = mat[15];
    }

    this[ 0] -= r00, this[ 1] -= r01, this[ 2] -= r02, this[ 3] -= r03,
    this[ 4] -= r10, this[ 5] -= r11, this[ 6] -= r12, this[ 7] -= r13,
    this[ 8] -= r20, this[ 9] -= r21, this[10] -= r22, this[11] -= r23,
    this[12] -= r30, this[13] -= r31, this[14] -= r32, this[15] -= r33;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec Vec3Like object
   *
   * @returns {this} in-place matrix describing this - Vec3()
   */
  public subVector(vec: Vec3Like): this {
    this[12] -= vec[0];
    this[13] -= vec[1];
    this[14] -= vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec    Vec3Like object
   * @param {number}   scalar some scalar multiplier
   *
   * @returns {this} in-place matrix describing this - Vec3()*scalar
   */
  public subScaledVector(vec: Vec3Like, scalar: number): this {
    this[12] -= vec[0]*scalar;
    this[13] -= vec[1]*scalar;
    this[14] -= vec[2]*scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {MatLike} mat Mat3/Mat4-like object
   *
   * @returns {this} in-place matrix describing this*mat
   */
  public mul(mat: MatLike): this {
    return this.mulMatrices(this, mat);
  }

  /**
   * @param {MatLike} mat Mat3/Mat4-like object
   *
   * @returns {this} in-place matrix describing mat*this
   */
  public preMul(mat: MatLike): this {
    return this.mulMatrices(mat, this);
  }

  /**
   * @param {MatLike} m0 Mat3/Mat4-like object
   * @param {MatLike} m1 Mat3/Mat4-like object
   *
   * @returns {this} in-place matrix describing m0*m1
   */
  public mulMatrices<T extends MatLike, U extends MatLike>(m0: T, m1: U): this {
    let m00!: number, m01!: number, m02!: number, m03!: number,
        m10!: number, m11!: number, m12!: number, m13!: number,
        m20!: number, m21!: number, m22!: number, m23!: number,
        m30!: number, m31!: number, m32!: number, m33!: number;

    if (m0.length === 9) {
      // i.e. Mat3x3
      m00 = m0[0], m01 = m0[1], m02 = m0[2], m03 = 0,
      m10 = m0[3], m11 = m0[4], m12 = m0[5], m13 = 0,
      m20 = m0[6], m21 = m0[7], m22 = m0[8], m23 = 0,
      m30 =     0, m31 =     0, m32 =     0, m33 = 1;
    } else {
      const m = m0 as Mat4Like;
      m00 = m[ 0], m01 = m[ 1], m02 = m[ 2], m03 = m[ 3],
      m10 = m[ 4], m11 = m[ 5], m12 = m[ 6], m13 = m[ 7],
      m20 = m[ 8], m21 = m[ 9], m22 = m[10], m23 = m[11],
      m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15];
    }

    let r00!: number, r01!: number, r02!: number, r03!: number,
        r10!: number, r11!: number, r12!: number, r13!: number,
        r20!: number, r21!: number, r22!: number, r23!: number,
        r30!: number, r31!: number, r32!: number, r33!: number;

    if (m1.length === 9) {
      r00 = m1[ 0], r01 = m1[ 1], r02 = m1[ 2], r03 = 0,
      r10 = m1[ 3], r11 = m1[ 4], r12 = m1[ 5], r13 = 0,
      r20 = m1[ 6], r21 = m1[ 7], r22 = m1[ 8], r23 = 0,
      r30 =      0, r31 =      0, r32 =      0, r33 = 1;
    } else {
      const m = m1 as Mat4Like;
      r00 = m[ 0], r01 = m[ 1], r02 = m[ 2], r03 = m[ 3],
      r10 = m[ 4], r11 = m[ 5], r12 = m[ 6], r13 = m[ 7],
      r20 = m[ 8], r21 = m[ 9], r22 = m[10], r23 = m[11],
      r30 = m[12], r31 = m[13], r32 = m[14], r33 = m[15];
    }

    this[ 0] = m00*r00 + m10*r01 + m20*r02 + m30*r03;
    this[ 1] = m01*r00 + m11*r01 + m21*r02 + m31*r03;
    this[ 2] = m02*r00 + m12*r01 + m22*r02 + m32*r03;
    this[ 3] = m03*r00 + m13*r01 + m23*r02 + m33*r03;

    this[ 4] = m00*r10 + m10*r11 + m20*r12 + m30*r13;
    this[ 5] = m01*r10 + m11*r11 + m21*r12 + m31*r13;
    this[ 6] = m02*r10 + m12*r11 + m22*r12 + m32*r13;
    this[ 7] = m03*r10 + m13*r11 + m23*r12 + m33*r13;

    this[ 8] = m00*r20 + m10*r21 + m20*r22 + m30*r23;
    this[ 9] = m01*r20 + m11*r21 + m21*r22 + m31*r23;
    this[10] = m02*r20 + m12*r21 + m22*r22 + m32*r23;
    this[11] = m03*r20 + m13*r21 + m23*r22 + m33*r23;

    this[12] = m00*r30 + m10*r31 + m20*r32 + m30*r33;
    this[13] = m01*r30 + m11*r31 + m21*r32 + m31*r33;
    this[14] = m02*r30 + m12*r31 + m22*r32 + m32*r33;
    this[15] = m03*r30 + m13*r31 + m23*r32 + m33*r33;

    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} s some scalar value
   *
   * @returns {this} in-place result of mat * s
   */
  public mulScalar(s: number): this {
    this[ 0] *= s, this[ 1] *= s, this[ 2] *= s, this[ 3] *= s,
    this[ 4] *= s, this[ 5] *= s, this[ 6] *= s, this[ 7] *= s,
    this[ 8] *= s, this[ 9] *= s, this[10] *= s, this[11] *= s,
    this[12] *= s, this[13] *= s, this[14] *= s, this[15] *= s;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param {Quat} quat
   *
   * @returns {this} in-place mat describing mat*quat
   */
  public mulQuaternion(quat: QuatLike): this {
		const qx =  quat[0], qy =  quat[1], qz =  quat[2], qw = quat[3];

    const qxp = qx + qx,
          qyp = qy + qy,
          qzp = qz + qz;

		const xx = qx*qxp, xy = qx*qyp, xz = qx*qzp;
		const yy = qy*qyp, yz = qy*qzp, zz = qz*qzp;
		const wx = qw*qxp, wy = qw*qyp, wz = qw*qzp;

    let q00 = 1 - (yy + zz),  // Right
        q01 = xy + wz,
        q02 = xz - wy,
        q10 = xy - wz,        // Up
        q11 = 1 - (xx + zz),
        q12 = yz + wx,
        q20 = xz + wy,        // Back
        q21 = yz - wx,
        q22 = 1 - (xx + yy);

    const m00 = this[ 0], m01 = this[ 1], m02 = this[ 2], m03 = this[ 3],
          m10 = this[ 4], m11 = this[ 5], m12 = this[ 6], m13 = this[ 7],
          m20 = this[ 8], m21 = this[ 9], m22 = this[10], m23 = this[11],
          m30 = this[12], m31 = this[13], m32 = this[14], m33 = this[15];

    this[ 0] = q00*m00 + q01*m10 + q02*m20;
    this[ 1] = q00*m01 + q01*m11 + q02*m21;
    this[ 2] = q00*m02 + q01*m12 + q02*m22;
    this[ 3] = q00*m03 + q01*m13 + q02*m23;

    this[ 4] = q10*m00 + q11*m10 + q12*m20;
    this[ 5] = q10*m01 + q11*m11 + q12*m21;
    this[ 6] = q10*m02 + q11*m12 + q12*m22;
    this[ 7] = q10*m03 + q11*m13 + q12*m23;

    this[ 8] = q20*m00 + q21*m10 + q22*m20;
    this[ 9] = q20*m01 + q21*m11 + q22*m21;
    this[10] = q20*m02 + q21*m12 + q22*m22;
    this[11] = q20*m03 + q21*m13 + q22*m23;

    this[12] = m30;
    this[13] = m31;
    this[14] = m32;
    this[15] = m33;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} s some scalar value
   *
   * @returns {this} in-place result of mat / s
   */
  public divScalar(s: number): this {
    s = 1 / s;

    this[ 0] *= s, this[ 1] *= s, this[ 2] *= s, this[ 3] *= s,
    this[ 4] *= s, this[ 5] *= s, this[ 6] *= s, this[ 7] *= s,
    this[ 8] *= s, this[ 9] *= s, this[10] *= s, this[11] *= s,
    this[12] *= s, this[13] *= s, this[14] *= s, this[15] *= s;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec translation vector
   *
   * @returns {number} distance to position
   */
  public distanceToPoint(vec: Vec3Like): number {
    const dx = this[12] - vec[0];
    const dy = this[13] - vec[1];
    const dz = this[14] - vec[2];
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  /**
   * @param {Vec3Like} vec some translation vector
   *
   * @returns {number} square distance to position
   */
  public distanceSqToPoint(vec: Vec3Like): number {
    const dx = this[12] - vec[0];
    const dy = this[13] - vec[1];
    const dz = this[14] - vec[2];
    return dx*dx + dy*dy + dz*dz;
  }

  /**
   * @desc convert world-space coord to object-space coord relative to another mat
   *
   * @param {MatLike} mat some Mat3/Mat4-like matrix
   *
   * @returns {this} in-place object-space matrix
   */
  public toObjectSpace(mat: MatLike): this {
    return this.mulMatrices(invMat4(this), mat);
  }

  /**
   * @desc convert world-space coord to object-space coord relative to another mat
   *
   * @param {MatLike} mat some Mat3/Mat4-like matrix
   *
   * @returns {this} in-place object-space matrix
   */
  public toWorldSpace(mat: MatLike): this {
    return this.mulMatrices(this, mat);
  }

  /**
   * @param {Vec3Like} vec some world-space vector
   *
   * @returns {Vec3Like} vector transformed from world to object space
   */
  public pointToObjectSpace<T extends Vec3Like>(vec: T): T {
    return this.getInverse().transformVec3(vec);
  }

  /**
   * @param {Vec3Like} vec some object-space vector
   *
   * @returns {Vec3Like} vector transformed from object to world space
   */
  public pointToWorldSpace<T extends Vec3Like>(vec: T): T {
    return this.transformVec3(vec);
  }

  /**
   * @param {Vec3|Vec3Like} vec               some world-space direction
   * @param {boolean}       [normalise=false] optionally specify whether to normalise the vector; defaults to `false`
   *
   * @returns {Vec3|Vec3Like} the transformed direction vector in object space, i.e. rot.transpose()*vec
   */
  public vectorToObjectSpace<T extends Vec3Like>(vec: T, normalise: boolean = false): T {
		let x = vec[0], y = vec[1], z = vec[2];
		x = this[ 0]*x + this[ 1]*y + this[ 2]*z;
		y = this[ 4]*x + this[ 5]*y + this[ 6]*z;
		z = this[ 8]*x + this[ 9]*y + this[10]*z;

    if (!!normalise) {
      let d = x*x + y*y + z*z;
      if (Math.abs(d - 1) > Const.EPSILON) {
        d = 1 / Math.sqrt(d);
        x *= d;
        y *= d;
        z *= d;
      }
    }

    vec[0] = x;
    vec[1] = y;
    vec[2] = z;

    if (Vec3.Is(vec)) {
      vec.markDirty();
    }

    return vec;
  }

  /**
   * @param {Vec3|Vec3Like} vec               some object-space direction
   * @param {boolean}       [normalise=false] optionally specify whether to normalise the vector; defaults to `false`
   *
   * @returns {Vec3|Vec3Like} the transformed direction vector in object space, i.e. rot*vec
   */
  public vectorToWorldSpace<T extends Vec3Like>(vec: T, normalise: boolean = false): T {
    return this.transformDirVec3(vec, normalise);
  }

  /**
   * @param {Vec3Like} vec some scaling vector
   *
   * @returns {this} this matrix, rescaled in-place
   */
  public scale(vec: Vec3Like): this {
		const x = vec[0], y = vec[1], z = vec[2];
    this[ 0] *= x, this[ 4] *= y, this[ 8] *= z,
    this[ 1] *= x, this[ 5] *= y, this[ 9] *= z,
    this[ 2] *= x, this[ 6] *= y, this[10] *= z,
    this[ 3] *= x, this[ 7] *= y, this[11] *= z;

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc transforms some vector describing a translation by this mat
   *
   * @param {Vec3|Vec3Like} vec the {@link Vec3} / {@link Vec3Like} to be transformed
   *
   * @returns {Vec3|Vec3Like} the transformed vector
   */
  public transformVec3<T extends Vec3Like>(vec: T): T {
		const x = vec[0], y = vec[1], z = vec[2];

    const w = 1 / (this[3]*x + this[7]*y + this[11]*z + this[15]);
    vec[0] = (this[ 0]*x + this[ 4]*y + this[ 8]*z + this[12])*w;
    vec[1] = (this[ 1]*x + this[ 5]*y + this[ 9]*z + this[13])*w;
    vec[2] = (this[ 2]*x + this[ 6]*y + this[10]*z + this[14])*w;

    if (Vec3.Is(vec)) {
      vec.markDirty();
    }

    return vec;
  }

  /**
   * @desc transforms some vector describing a direction by this mat
   *
   * @param {Vec3|Vec3Like} vec               the {@link Vec3} / {@link Vec3Like} to be transformed
   * @param {boolean}       [normalise=false] optionally specify whether to normalise the vector; defaults to `false`
   *
   * @returns {Vec3|Vec3Like} the transformed vector
   */
  public transformDirVec3<T extends Vec3Like>(vec: T, normalise: boolean = false): T {
		let x = vec[0], y = vec[1], z = vec[2];
		x = this[ 0]*x + this[ 4]*y + this[ 8]*z;
		y = this[ 1]*x + this[ 5]*y + this[ 9]*z;
		z = this[ 2]*x + this[ 6]*y + this[10]*z;

    if (!!normalise) {
      let d = x*x + y*y + z*z;
      if (Math.abs(d - 1) > Const.EPSILON) {
        d = 1 / Math.sqrt(d);
        x *= d;
        y *= d;
        z *= d;
      }
    }

    vec[0] = x;
    vec[1] = y;
    vec[2] = z;

    if (Vec3.Is(vec)) {
      vec.markDirty();
    }

    return vec;
  }

  /**
   * @desc get a component of this matrix at some index
   *
   * @param {number} index  the component index
   *
   * @returns {number} the component value
   */
  public getComponent(index: number): number {
    return this[index];
  }

  /**
   * @desc get this mat's row value(s)
   *
   * @param {number} i   the row index
   *
   * @returns {number[]} the row values
   */
  public getRow(i: number): [number, number, number, number] {
    i *= 4;

    return [this[i + 0], this[i + 1], this[i + 2], this[i + 3]];
  }

  /**
   * @desc get this mat's column value(s)
   *
   * @param {number} i the col index
   *
   * @returns {number[]} the column values
   */
  public getColumn(i: number): [number, number, number, number] {
    return [this[i + 0], this[i + 4], this[i + 8], this[i + 12]];
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the translation part of this mat
   */
  public getTranslation(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    this.decompose(vec);
    return vec;
  }

  /**
   * @param {Quat} [quat] optionally specify the Quat to be computed in-place
   *
   * @returns {Quat} the rotation part of this mat
   */
  public getRotation(quat?: Quat): Quat {
    if (typeof quat === 'undefined') {
      quat = new Quat();
    }

    this.decompose(undefined, quat);
    return quat;
  }

  /**
   * @param {number} i     some column index
   * @param {Vec3}   [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the some basis at the specified column from the matrix
   */
  public getBasis(i: number, vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    i *= 4;
    return vec.set(this[i + 0], this[i + 1], this[i + 2]);
  }

  /**
   * @param {Vec3Like} right destination of the right vector
   * @param {Vec3Like} up    destination of the up vector
   * @param {Vec3Like} back  destination of the back vector
   *
   * @returns {this} this matrix
   */
  public getBasisVectors(right?: Vec3Like, up?: Vec3Like, back?: Vec3Like): this {
    if (typeof right !== 'undefined') {
      right[0] = this[0];
      right[1] = this[1];
      right[2] = this[2];

      if (Vec3.Is(right)) {
        right.markDirty();
      }
    }

    if (typeof up !== 'undefined') {
      up[0] = this[4];
      up[1] = this[5];
      up[2] = this[6];

      if (Vec3.Is(up)) {
        up.markDirty();
      }
    }

    if (typeof back !== 'undefined') {
      back[0] = this[ 8];
      back[1] = this[ 9];
      back[2] = this[10];

      if (Vec3.Is(back)) {
        back.markDirty();
      }
    }

    return this;
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} magnitude of each basis vector
   */
  public getScale(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    return vec.set(
      Math.sqrt(this[ 0]*this[ 0] + this[ 1]*this[ 1] + this[ 2]*this[ 2]),
      Math.sqrt(this[ 4]*this[ 4] + this[ 5]*this[ 5] + this[ 6]*this[ 6]),
      Math.sqrt(this[ 8]*this[ 8] + this[ 9]*this[ 9] + this[10]*this[10])
    );
  }

  /**
   * @returns {number} max magnitude of all basis vectors
   */
  public getMaxScale(): number {
    return Math.sqrt(Math.max(
      this[ 0]*this[ 0] + this[ 1]*this[ 1] + this[ 2]*this[ 2],
      this[ 4]*this[ 4] + this[ 5]*this[ 5] + this[ 6]*this[ 6],
      this[ 8]*this[ 8] + this[ 9]*this[ 9] + this[10]*this[10]
    ));
  }

  /**
   * @returns {this} this matrix inverted in-place
   */
  public inverse(): this {
    invMat4(this);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Mat4e} mat optionally specify a Mat4 to update
   *
   * @returns {Mat4} an inverted copy of this matrix
   */
  public getInverse(mat?: Mat4): Mat4 {
    if (typeof mat === 'undefined') {
      mat = Mat4.FromArray(this);
    } else {
      mat.splice(0, mat.length, ...this);
    }

    return mat.inverse();
  }

  /**
   * @returns {this} this matrix transposed in-place
   */
  public transpose(): this {
		let tmp;
    tmp = this[ 1]; this[ 1] = this[ 4]; this[ 4] = tmp;
		tmp = this[ 2]; this[ 2] = this[ 8]; this[ 8] = tmp;
    tmp = this[ 6]; this[ 6] = this[ 9]; this[ 9] = tmp;
		tmp = this[ 3]; this[ 3] = this[12]; this[12] = tmp;
		tmp = this[ 7]; this[ 7] = this[13]; this[13] = tmp;
    tmp = this[11]; this[11] = this[14]; this[14] = tmp;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Mat4e} mat optionally specify a Mat4 to update
   *
   * @returns {Mat4} a transposed copy of this matrix
   */
  public getTransposed(mat?: Mat4): Mat4 {
    if (typeof mat === 'undefined') {
      mat = Mat4.FromArray(this);
    } else {
      mat.splice(0, mat.length, ...this);
    }

    return mat.transpose();
  }

  /**
   * @param {Mat4Like} [mat=this] optionally specify another mat to use as the base
   *
   * @returns {Mat4} normal matrix of a model-view matrix computed in-place
   */ //this.normalMatrix.normalise(this.modelViewMatrix);
  public normalise(mat?: Mat4Like): this {
    mat = mat ?? this;

    const m00 = mat[ 0], m01 = mat[ 1], m02 = mat[ 2], m03 = mat[ 3],
          m10 = mat[ 4], m11 = mat[ 5], m12 = mat[ 6], m13 = mat[ 7],
          m20 = mat[ 8], m21 = mat[ 9], m22 = mat[10], m23 = mat[11],
          m30 = mat[12], m31 = mat[13], m32 = mat[14], m33 = mat[15];

    const d00 = m00*m11 - m01*m10;
    const d01 = m00*m12 - m02*m10;
    const d02 = m00*m13 - m03*m10;
    const d03 = m01*m12 - m02*m11;
    const d04 = m01*m13 - m03*m11;
    const d05 = m02*m13 - m03*m12;
    const d06 = m20*m31 - m21*m30;
    const d07 = m20*m32 - m22*m30;
    const d08 = m20*m33 - m23*m30;
    const d09 = m21*m32 - m22*m31;
    const d10 = m21*m33 - m23*m31;
    const d11 = m22*m33 - m23*m32;

    const b0 = m00*d09 - m01*d07 + m02*d03;
    const b1 = m10*d09 - m11*d07 + m12*d06;
    const b2 = m20*d03 - m21*d01 + m22*d00;
    const b3 = m30*d03 - m31*d01 + m32*d00;

    let det = m13*b0 - m03*b1 + m33*b2 - m23*b3;
    if (det == 0) {
      return this;
    }

    det = 1 / det;
    this[ 0] = det*(m11*d11 - m12*d10 + m13*d09);
    this[ 1] = det*(m02*d10 - m01*d11 - m03*d09);
    this[ 2] = det*(m31*d05 - m32*d04 + m33*d03);
    this[ 3] = 0;

    this[ 4] = det*(m12*d08 - m10*d11 - m13*d07);
    this[ 5] = det*(m00*d11 - m02*d08 + m03*d07);
    this[ 6] = det*(m32*d02 - m30*d05 - m33*d01);
    this[ 7] = 0;

    this[ 8] = det*(m10*d10 - m11*d08 + m13*d06);
    this[ 9] = det*(m01*d08 - m00*d10 - m03*d06);
    this[10] = det*(m30*d04 - m31*d02 + m33*d00);
    this[11] = 0;

    this[12] = 0;
    this[13] = 0;
    this[14] = 0;
    this[15] = det*1;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Mat4e} mat optionally specify a Mat4 to update
   *
   * @returns {Mat4} a copy of the normal matrix
   */
  public getNormalMatrix(mat?: Mat4): Mat4 {
    if (typeof mat === 'undefined') {
      mat = new Mat4().copy(this);
    } else {
      mat.splice(0, mat.length, ...this);
    }

    return mat.normalise();
  }

  /**
   * @desc removes the scaling performed by this matrix
   * @note does not remove reflection and assumes that this mat doesn't describe a projection
   *
   * @returns {this} this matrix with in-place removal of scale
   */
  public removeScale(): this {
    let x!: number, y!: number, z!: number, l!: number, j!: number;
    for (let i = 0; i < 4; ++i) {
      j = i*4, x = this[j + 0], y = this[j + 1], z = this[j + 2];

      l = x*x + y*y + z*z;
      if (Math.abs(l - 1) > Const.EPSILON) {
        this[j + 0] = x*l;
        this[j + 1] = y*l;
        this[j + 2] = z*l;
      }
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {number} the computed determinant of this matrix
   */
  public determinant(): number {
    const m00 = this[ 0], m01 = this[ 1], m02 = this[ 2], m03 = this[ 3],
          m10 = this[ 4], m11 = this[ 5], m12 = this[ 6], m13 = this[ 7],
          m20 = this[ 8], m21 = this[ 9], m22 = this[10], m23 = this[11],
          m30 = this[12], m31 = this[13], m32 = this[14], m33 = this[15];

    const d00 = m00*m11 - m01*m10;
    const d01 = m00*m12 - m02*m10;
    const d03 = m01*m12 - m02*m11;
    const d06 = m20*m31 - m21*m30;
    const d07 = m20*m32 - m22*m30;
    const d09 = m21*m32 - m22*m31;

    const b0 = m00*d09 - m01*d07 + m02*d03;
    const b1 = m10*d09 - m11*d07 + m12*d06;
    const b2 = m20*d03 - m21*d01 + m22*d00;
    const b3 = m30*d03 - m31*d01 + m32*d00;

    return m13*b0 - m03*b1 + m33*b2 - m23*b3;
  }

  /**
   * @desc the determinant of the 3x3 submatrix
   *
   * @returns {number} the computed determinant of this matrix
   */
  public determinant3x3(): number {
    const m00 = this[ 0], m01 = this[ 1], m02 = this[ 2],
          m10 = this[ 4], m11 = this[ 5], m12 = this[ 6],
          m20 = this[ 8], m21 = this[ 9], m22 = this[10];
    return m00*m11*m22 + m01*m12*m20 + m02*m10*m21 - m00*m12*m21 - m01*m10*m22 - m02*m11*m20;
  }

  /**
   * @desc decompose a mat into its translation, rotation & scale part(s)
   *
   * @param {Vec3Like} [trans] optionally decompose the translation part
   * @param {QuatLike} [rot]   optionally decompose the rotation part
   * @param {Vec3Like} [scale] optionally decompose the scale part
   *
   * @returns {this} this matrix
   */
  public decompose(trans?: Vec3Like, rot?: QuatLike, scale?: Vec3Like): this {
    let m00 = this[ 0], m01 = this[ 1], m02 = this[ 2],
        m10 = this[ 4], m11 = this[ 5], m12 = this[ 6],
        m20 = this[ 8], m21 = this[ 9], m22 = this[10],
        m30 = this[12], m31 = this[13], m32 = this[14];

    let sx = Math.sqrt(m00*m00 + m01*m01 + m02*m02),
        sy = Math.sqrt(m10*m10 + m11*m11 + m12*m12),
        sz = Math.sqrt(m20*m20 + m21*m21 + m22*m22);

    if (this.determinant() < 0) {
      sx = -sx;
    }

    if (typeof trans !== 'undefined') {
      trans[0] = m30;
      trans[1] = m31;
      trans[2] = m32;

      if (Vec3.Is(trans)) {
        trans.markDirty();
      }
    }

    if (typeof scale !== 'undefined') {
      scale[0] = sx;
      scale[1] = sy;
      scale[2] = sz;

      if (Vec3.Is(scale)) {
        scale.markDirty();
      }
    }

    if (typeof rot !== 'undefined') {
      sx = 1 / sx;
      m00 *= sx;
      m01 *= sx;
      m02 *= sx;

      sy = 1 / sy;
      m10 *= sy;
      m11 *= sy;
      m12 *= sy;

      sz = 1 / sz;
      m20 *= sz;
      m21 *= sz;
      m22 *= sz;

      const n = m00 + m11 + m22;
      if (n > 0) {
        const s = 0.5 / Math.sqrt(n + 1);
        rot[0] = (m12 - m21)*s;
        rot[1] = (m20 - m02)*s;
        rot[2] = (m01 - m10)*s;
        rot[3] = 0.25 / s;
      } else if (m00 > m11 && m00 > m22) {
        const s = 2.0 * Math.sqrt(1 + m00 - m11 - m22);
        rot[0] = 0.25 * s;
        rot[1] = (m10 + m01) / s;
        rot[2] = (m20 + m02) / s;
        rot[3] = (m12 - m21) / s;
      } else if (m11 > m22) {
        const s = 2.0 * Math.sqrt(1 + m11 - m00 - m22);
        rot[0] = (m10 + m01) / s;
        rot[1] = 0.25 * s;
        rot[2] = (m21 + m12) / s;
        rot[3] = (m20 - m02) / s;
      } else {
        const s = 2.0 * Math.sqrt(1 + m22 - m00 - m11);
        rot[0] = (m20 + m02) / s;
        rot[1] = (m21 + m12) / s;
        rot[2] = 0.25 * s;
        rot[3] = (m01 - m10) / s;
      }

      if (Quat.Is(rot)) {
        rot.markDirty();
      }
    }

    return this;
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the world right vector (+X) of this matrix
   */
  public rightVector(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    return vec.set(this[0], this[1], this[2]);
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the world up vector (+Y) of this matrix
   */
  public upVector(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    return vec.set(this[4], this[5], this[6]);
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the world look vector (-Z) of this matrix
   */
  public lookVector(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    return vec.set(-this[8], -this[9], -this[10]);
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the world back vector (+Z) of this matrix
   */
  public backVector(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    return vec.set(this[8], this[9], this[10]);
  }

  /**
   * @desc constructs a matrix that rotates some directional vector to coincide with the target direction
   *       with respect to some world up vector
   * @note eye position is the translation of this matrix, up vector will be normalised
   *
   * @param {Vec3Like} to           some target position
   * @param {Vec3Like} [up=[0,1,0]] the world up vector; defaults to `[0, 1, 0]`
   *
   * @returns {this} the resulting matrix
   */
  public lookAt(to: Vec3Like, up: Vec3Like = [0, 1, 0]): this {
    let fx = this[12], fy = this[13], fz = this[14];

    let dx = to[0] - fx,
        dy = to[1] - fy,
        dz = to[2] - fz;

    let l = dx*dx + dy*dy + dz*dz;
    if (Math.abs(l) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      dx *= l;
      dy *= l;
      dz *= l;
    }

    let ux = up[0],
        uy = up[1],
        uz = up[2];

    l = ux*ux + uy*uy + uz*uz;
    if (!NumberUtils.approximately(l, 1) && Math.abs(l) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      ux *= l;
      uy *= l;
      uz *= l;
    } else if (Math.abs(l) < Const.EPSILON) {
      ux = 0;
      uy = 1;
      uz = 0;
    }

    let d = dx*ux + dy*uy + dz*uz;
    if (Math.abs(d) > 1 - Const.EPSILON) {
      ux = 1, uy = uz = 0;

      d = dx*ux + dy*uy + dz*uz;
      if (Math.abs(d) > 1 - Const.EPSILON) {
        ux = 0, uy = 1, uz = 0;
        d = dx*ux + dy*uy + dz*uz;
      }
    }

    ux -= dx*d;
    uy -= dy*d;
    uz -= dz*d;

    l = ux*ux + uy*uy + uz*uz;
    if (Math.abs(l) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      ux *= l;
      uy *= l;
      uz *= l;
    }

    dx = -dx;
    dy = -dy;
    dz = -dz;

		let rx = -(dy*uz - dz*uy),
        ry = -(dz*ux - dx*uz),
		    rz = -(dx*uy - dy*ux);

    l = rx*rx + ry*ry + rz*rz;
    if (Math.abs(l) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      rx *= l;
      ry *= l;
      rz *= l;
    }

    ux = dy*rz - dz*ry,
    uy = dz*rx - dx*rz,
    uz = dx*ry - dy*rx;

    this[ 0] = rx, this[ 4] = ux, this[ 8] = dx,
    this[ 1] = ry, this[ 5] = uy, this[ 9] = dy,
    this[ 2] = rz, this[ 6] = uz, this[10] = dz;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc toggles the change listener (if applicable)
   *
   * @param {boolean} value the desired dispatcher enabled state
   *
   * @returns {this} this instance
   */
  public toggleDispatcher(value: boolean): this {
    if (this._changedSignal && this._changedSignal.active !== value) {
      this._changedSignal.active = value;
    }

    return this;
  }

  /**
   * @desc handles dispatching of changed events of both public & private setter(s)
   */
  private handleOnChanged(): void {
    const signal = this._changedSignal;
    if (!signal) {
      return;
    }

    signal.fire(this);
  }
}

/**
 * @note separated from main cls to avoid dispatching multiple events
 *
 * @param {Mat4Like} mat some mat4-like object
 *
 * @returns {MatLike} this matrix inverted in-place
 */
// prettier-ignore
const invMat4 = <T extends Mat4Like>(mat: T): T => {
  const m00 = mat[ 0], m01 = mat[ 1], m02 = mat[ 2], m03 = mat[ 3],
        m10 = mat[ 4], m11 = mat[ 5], m12 = mat[ 6], m13 = mat[ 7],
        m20 = mat[ 8], m21 = mat[ 9], m22 = mat[10], m23 = mat[11],
        m30 = mat[12], m31 = mat[13], m32 = mat[14], m33 = mat[15];

  const d00 = m00*m11 - m01*m10;
  const d01 = m00*m12 - m02*m10;
  const d02 = m00*m13 - m03*m10;
  const d03 = m01*m12 - m02*m11;
  const d04 = m01*m13 - m03*m11;
  const d05 = m02*m13 - m03*m12;
  const d06 = m20*m31 - m21*m30;
  const d07 = m20*m32 - m22*m30;
  const d08 = m20*m33 - m23*m30;
  const d09 = m21*m32 - m22*m31;
  const d10 = m21*m33 - m23*m31;
  const d11 = m22*m33 - m23*m32;

  const b0 = m00*d09 - m01*d07 + m02*d03;
  const b1 = m10*d09 - m11*d07 + m12*d06;
  const b2 = m20*d03 - m21*d01 + m22*d00;
  const b3 = m30*d03 - m31*d01 + m32*d00;

  let det = m13*b0 - m03*b1 + m33*b2 - m23*b3;
  if (!det) {
    if (ArrayBuffer.isView(mat)) {
      mat.set(MAT4_IDNT);
    } else {
      mat.splice(0, MAT4_IDNT.length, ...MAT4_IDNT);
    }
    return mat;
  }

  det = 1 / det;
  mat[ 0] = det*(m11*d11 - m12*d10 + m13*d09);
  mat[ 1] = det*(m02*d10 - m01*d11 - m03*d09);
  mat[ 2] = det*(m31*d05 - m32*d04 + m33*d03);
  mat[ 3] = det*(m22*d04 - m21*d05 - m23*d03);
  mat[ 4] = det*(m12*d08 - m10*d11 - m13*d07);
  mat[ 5] = det*(m00*d11 - m02*d08 + m03*d07);
  mat[ 6] = det*(m32*d02 - m30*d05 - m33*d01);
  mat[ 7] = det*(m20*d05 - m22*d02 + m23*d01);
  mat[ 8] = det*(m10*d10 - m11*d08 + m13*d06);
  mat[ 9] = det*(m01*d08 - m00*d10 - m03*d06);
  mat[10] = det*(m30*d04 - m31*d02 + m33*d00);
  mat[11] = det*(m21*d02 - m20*d04 - m23*d00);
  mat[12] = det*(m11*d07 - m10*d09 - m12*d06);
  mat[13] = det*(m00*d09 - m01*d07 + m02*d06);
  mat[14] = det*(m31*d01 - m30*d03 - m32*d00);
  mat[15] = det*(m20*d03 - m21*d01 + m22*d00);
  return mat;
};
