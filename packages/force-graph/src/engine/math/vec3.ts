import * as NumberUtils from './number';

import { QuatLike } from './quat';
import { TypedArray } from '@engine/core';
import { Mat3Like, Mat4Like, MatLike } from './mat4';
import { Const, Signal, ExplorerError } from '@engine/common';

/**
 * @desc a Vec3-like object containing an `x`, `y` and `z` component
 */
export type Vec3Like = Vec3 | ArrayOf<'at least', 3, number> | (Float32Array & { length: 3 });

/**
 * @desc a Vec3 serialised to a dict
 */
export interface Vec3Obj {
  x: number;
  y: number;
  z: number;
}

/**
 * Class representing a {@link https://en.wikipedia.org/wiki/Euclidean_vector|3D vector}, or `float3`, value
 *
 * @todo need to cleanup interface, ensure compatible with other classes; and to finalise assoc. documentation
 *
 * @class
 * @constructor
 * @extends Array
 */
// prettier-ignore
export class Vec3 extends Array<number> {
  /**
   * @desc this class' type name
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Vec3.name;

  /**
   * @desc changed event dispatcher
   * @type {Signal}
   * @protected
   */
  protected _changedSignal?: Signal;

  /**
   * @desc constructs a {@link Vec3} instance
   * @param {number} [x=0] specifies the x component of this vector
   * @param {number} [y=0] specifies the y component of this vector
   * @param {number} [z=0] specifies the y component of this vector
   */
  public constructor(x: number = 0, y: number = 0, z: number = 0) {
    super(3);

    this[0] = x;
    this[1] = y;
    this[2] = z;
  }

  /**
   * @desc {@link Vec3} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Vec3} specifying whether the input is a {@link Vec3}
   */
  public static Is(obj: unknown): obj is Vec3 {
    return Array.isArray(obj) && 'isA' in obj && typeof obj.isA === 'function' && obj.isA.length === 1 && obj.isA(Vec3.ClassName);
  }

  /**
   * @desc constructs a Vec3 by setting each of its components to some scalar value
   * @static
   *
   * @param {number} scalar some scalar value
   *
   * @returns {Vec3}
   */
  public static FromScalar(scalar: number): Vec3 {
    return new Vec3(scalar, scalar, scalar);
  }

  /**
   * @desc constructs a Vec3 from an array
   * @static
   *
   * @param {Array<number>} arr        some array with at least 3 numbers at the given offset
   * @param {number}        [offset=0] optionally specify where to read from
   *
   * @returns {Vec3}
   */
  public static FromArray(arr: Array<number>, offset: number = 0): Vec3 {
    if (arr.length - offset < 3) {
      const rem = arr.length - offset;
      throw new ExplorerError({
        msg: `Expected remaining length of at least 3 elements but got Res<remainder: ${rem}, offset: ${offset}>`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    return new Vec3(arr[offset + 0], arr[offset + 1], arr[offset + 2]);
  }

  /**
   * @desc construct a new Vec by linearly interpolating between v0 & v1
   * @static
   *
   * @param {Vec3Like} v0           the source vec
   * @param {Vec3Like} v1           the target vec
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {Vec2} the newly constructed Vec
   */
  public static Lerp(v0: Vec3Like, v1: Vec3Like, alpha: number, clamp: boolean = true): Vec3 {
    return new Vec3().lerpVectors(v0, v1, alpha, clamp);
  }

  /**
   * @see https://en.wikipedia.org/wiki/Spherical_coordinate_system
   * @static
   *
   * @param {Vec3Like} coords a set of three numbers describing the radial distance, polar angle and the azimuthal angle
   *
   * @returns {Vec3} the newly constructed inst, computed from the specified spherical coords
   */
  public static FromSphericalCoords(coords: Vec3Like): Vec3 {
    return new Vec3().setFromSphericalCoords(coords);
  }

  /**
   * @static
   *
   * @returns {Vec3} a zeroed Vec3
   */
  public static Zero(): Vec3 {
    return new Vec3(0, 0, 0);
  }

  /**
   * @static
   *
   * @returns {Vec3} a Vec3 with all components set to one
   */
  public static One(): Vec3 {
    return new Vec3(1, 1, 1);
  }

  /**
   * @desc constructs a new random vec;
   * @note
   *  - The components will be set to a random number between 0 - 1 if not otherwise specified
   *  - Args:
   *    - If 2 numbers are specified: xyz components generated within the range of `args.0` and `args.1`
   *    - If 6 numbers are specified: expects shape of `[xmin, xmax, ymin, ymax, zmin, zmax]`
   * @static
   *
   * @param {...*}   args   optional variadic number arguments
   *
   * @returns {Vec3} constructs a new vec with random components contained by the specified range (if applicable)
   */
  public static Random(...args: number[]): Vec3 {
    const len = args.length;
    if (len >= 6) {
      const xmin = Math.min(args[0], args[1]);
      const xmax = Math.max(args[0], args[1]);

      const ymin = Math.min(args[2], args[3]);
      const ymax = Math.max(args[2], args[3]);

      const zmin = Math.min(args[4], args[5]);
      const zmax = Math.max(args[4], args[5]);

      return new Vec3(NumberUtils.randomFloat(xmin, xmax), NumberUtils.randomFloat(ymin, ymax), NumberUtils.randomFloat(zmin, zmax));
    } else if (len >= 2) {
      const min = Math.min(args[0], args[1]);
      const max = Math.max(args[0], args[1]);
      const vec = new Vec3(NumberUtils.randomFloat(min, max), NumberUtils.randomFloat(min, max), NumberUtils.randomFloat(min, max));

      return vec;
    }

    return new Vec3(NumberUtils.randomFloat(-1, 1), NumberUtils.randomFloat(-1, 1), NumberUtils.randomFloat(-1, 1));
  }

  /**
   * @desc constructs a random unit vector
   *
   * @returns {Vec3} the newly constructed inst
   */
  public static RandomUnit(): Vec3 {
    return new Vec3().randomUnit();
  }

  /**
   * @desc constructs a new vec describing some random unit vector along some some direction, contained by some specified angle
   * @static
   *
   * @param {Vec3Like} direction some unit vector specifying the direction of the cone
   * @param {number}   angle     cone angle (in radians)
   *
   * @returns {Vec3} the newly constructed inst
   */
  public static RandomCone(direction: Vec3Like, angle: number): Vec3 {
    return new Vec3().randomCone(direction, angle);
  }

  /**
   * @desc constructs a new vec describing some random point inside or on a sphere of the specified radius
   * @static
   *
   * @param {number} [radius=1] the radius of the sphere
   *
   * @returns {Vec3} the newly constructed inst
   */
  public static RandomSphere(radius: number = 1): Vec3 {
    return new Vec3().randomSphere(radius);
  }

  /**
   * @desc constructs a new vec describing some random point on the surface of a sphere of the specified radius
   * @static
   *
   * @param {number} [radius=1] the radius of the sphere
   *
   * @returns {Vec3} the newly constructed inst
   */
  public static RandomOnSphere(radius: number = 1): Vec3 {
    return new Vec3().randomOnSphere(radius);
  }

  /**
   * @static
   *
   * @param {Vec3Like} v0 vec-like object
   * @param {Vec3Like} v1 vec-like object
   *
   * @returns {number} distance to position
   */
  public static DistanceBetween(v0: Vec3Like, v1: Vec3Like): number {
    const dx = v0[0] - v1[0];
    const dy = v0[1] - v1[1];
    const dz = v0[2] - v1[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * @static
   *
   * @param {Vec3Like} v0 vec-like object
   * @param {Vec3Like} v1 vec-like object
   *
   * @returns {number} square distance to position
   */
  public static DistanceBetweenSq(v0: Vec3Like, v1: Vec3Like): number {
    const dx = v0[0] - v1[0];
    const dy = v0[1] - v1[1];
    const dz = v0[2] - v1[2];
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * @static
   *
   * @returns {Vec3} a Vec3 with its X component set to one
   */
  public static UnitX(): Vec3 {
    return new Vec3(1, 0, 0);
  }

  /**
   * @static
   *
   * @returns {Vec3} a Vec3 with its Y component set to one
   */
  public static UnitY(): Vec3 {
    return new Vec3(0, 1, 0);
  }

  /**
   * @static
   *
   * @returns {Vec3} a Vec3 with its X component set to one
   */
  public static UnitZ(): Vec3 {
    return new Vec3(0, 0, 1);
  }

  /**
   * @static
   *
   * @returns {Vec3} world right vector
   */
  public static RightVector(): Vec3 {
    return new Vec3(1, 0, 0);
  }

  /**
   * @static
   *
   * @returns {Vec3} world up vector
   */
  public static UpVector(): Vec3 {
    return new Vec3(0, 1, 0);
  }

  /**
   * @static
   *
   * @returns {Vec3} world look vector
   */
  public static LookVector(): Vec3 {
    return new Vec3(0, 0, -1);
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Vec3';
  }

  /**
   * @desc x component getter
   * @type {number}
   * @public
   */
  public get x(): number {
    return this[0];
  }

  /**
   * @desc y component getter
   * @type {number}
   * @public
   */
  public get y(): number {
    return this[1];
  }

  /**
   * @desc y component getter
   * @type {number}
   * @public
   */
  public get z(): number {
    return this[2];
  }

  /**
   * @desc x component setter
   * @type {number}
   * @public
   */
  public set x(x: number) {
    this[0] = x;
    this.handleOnChanged();
  }

  /**
   * @desc y component setter
   * @type {number}
   * @public
   */
  public set y(y: number) {
    this[1] = y;
    this.handleOnChanged();
  }

  /**
   * @desc z component setter
   * @type {number}
   * @public
   */
  public set z(z: number) {
    this[2] = z;
    this.handleOnChanged();
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
    return `${this.ClassName}<x: ${this[0]}, y: ${this[1]}, z: ${this[2]}>`;
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
   *
   * @returns {string} string representation
   */
  public serialiseString(): string {
    return `vec3(${this[0]}, ${this[1]}, ${this[2]})`;
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
   * @param {Vec3Like} vec some object to compare
   *
   * @returns {boolean} evaluates to `true` if the object are exactly equal
   */
  public equals(vec: Vec3Like): boolean {
    return this[0] === vec[0] && this[1] === vec[1] && this[2] === vec[2];
  }

  /**
   * @desc tests approximate equality
   *
   * @param {Vec3Like} vec        some object to compare
   * @param {number}   [eps=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if the object is approximately equal
   */
  public approximately(vec: Vec3Like | Array<number>, eps?: number): boolean {
    if (typeof vec[0] !== 'number' || typeof vec[1] !== 'number') {
      return false;
    }

    return (
      NumberUtils.approximately(this[0], vec[0], eps) &&
      NumberUtils.approximately(this[1], vec[1], eps) &&
      NumberUtils.approximately(this[2], vec[2], eps)
    );
  }

  /**
   * @desc less than the comparison
   *
   * @param {Vec3Like} vec some vec to compare
   *
   * @returns {boolean} evaluates to `true` if this vec is less than the comparator
   */
  public ltComp(vec: Vec3Like): boolean {
    const ax = this[0],
      ay = this[1],
      az = this[2];
    const bx = vec[0],
      by = vec[1],
      bz = vec[2];
    const l0 = ax * ax + ay * ay + az * az;
    const l1 = bx * bx + by * by + bz * bz;
    return l0 < l1;
  }

  /**
   * @desc less than or equal to comparison
   *
   * @param {Vec3Like} vec some vec to compare
   *
   * @returns {boolean} evaluates to `true` if this vec is less than or equal to the comparator
   */
  public lteComp(vec: Vec3Like): boolean {
    const ax = this[0],
      ay = this[1],
      az = this[2];
    const bx = vec[0],
      by = vec[1],
      bz = vec[2];
    const l0 = ax * ax + ay * ay + az * az;
    const l1 = bx * bx + by * by + bz * bz;
    return l0 <= l1;
  }

  /**
   * @desc greater than the comparison
   *
   * @param {Vec3Like} vec some vec to compare
   *
   * @returns {boolean} evaluates to `true` if this vec is greater than the comparator
   */
  public gtComp(vec: Vec3Like): boolean {
    const ax = this[0],
      ay = this[1],
      az = this[2];
    const bx = vec[0],
      by = vec[1],
      bz = vec[2];
    const l0 = ax * ax + ay * ay + az * az;
    const l1 = bx * bx + by * by + bz * bz;
    return l0 > l1;
  }

  /**
   * @desc greater than or equal to comparison
   *
   * @param {Vec3Like} vec some vec to compare
   *
   * @returns {boolean} evaluates to `true` if this vec is greater than or equal to the comparator
   */
  public gteComp(vec: Vec3Like): boolean {
    const ax = this[0],
      ay = this[1],
      az = this[2];
    const bx = vec[0],
      by = vec[1],
      bz = vec[2];
    const l0 = ax * ax + ay * ay + az * az;
    const l1 = bx * bx + by * by + bz * bz;
    return l0 >= l1;
  }

  /**
   * @returns {object} a serialised copy of this vectors's components
   */
  public serialiseObject(): Vec3Obj {
    return { x: this[0], y: this[1], z: this[2] };
  }

  /**
   * @desc constructs a copy of this vector
   *
   * @returns {Vec3} a copy of this vector
   */
  public clone(): Vec3 {
    return new Vec3(this[0], this[1], this[2]);
  }

  /**
   * @desc copies the components of a vector in-place
   *
   * @param {Vec3Like} vec some vector representation
   *
   * @returns {this} the in-place updated vector
   */
  public copy(vec: Vec3Like): this {
    this[0] = vec[0];
    this[1] = vec[1];
    this[2] = vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} [epsSq=1e-6] some threshold scalar value
   *
   * @returns {boolean} whether all components is approx. 0
   */
  public isZero(epsSq: number = Const.EPSILON): boolean {
    return this[0] * this[0] + this[1] * this[1] + this[2] * this[2] <= epsSq;
  }

  /**
   * @param {number} [epsSq=1e-6] some threshold scalar value
   *
   * @returns {boolean} specifying whether this Vec is normalised
   */
  public isNormalised(epsSq: number = Const.EPSILON): boolean {
    return Math.abs(this[0] * this[0] + this[1] * this[1] + this[2] * this[2] - 1) <= epsSq;
  }

  /**
   * @returns {boolean} specifies whether any component of this Vec is `NaN`
   */
  public isNaN(): boolean {
    return Number.isNaN(this[0]) || Number.isNaN(this[1]) || Number.isNaN(this[2]);
  }

  /**
   * @returns {boolean} specifies whether all components of this Vec are finite
   */
  public isFinite(): boolean {
    return Number.isFinite(this[0]) && Number.isFinite(this[1]) && Number.isFinite(this[2]);
  }

  /**
   * @param {Vec3Like} vec          some vec to compare against
   * @param {number}   [epsSq=1e-6] some threshold scalar value
   *
   * @returns {boolean} describing whether this Vec is perpendicular to another
   */
  public isPerpendicular(vec: Vec3Like, epsSq: number = Const.EPSILON): boolean {
    const d = this[0] * vec[0] + this[1] * vec[1] + this[2] * vec[2];
    return (
      d * d <= epsSq * (this[0] * this[0] + this[1] * this[1] + this[2] * this[2]) * (vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2])
    );
  }

  /**
   *
   * @returns
   */
  public isAbsolute(): boolean {
    return this[0] >= 0 && this[1] >= 0 && this[2] >= 0;
  }

  /**
   * @param {,..*} args sets this inst's components to the variadic args (if present for each of its components)
   *
   * @returns {this}
   */
  public set(...args: number[]): this {
    this[0] = args?.[0] ?? this[0];
    this[1] = args?.[1] ?? this[1];
    this[2] = args?.[2] ?? this[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar sets this inst's x component to the given scalar value
   *
   * @returns {this}
   */
  public setX(scalar: number): this {
    this[0] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar sets this inst's y component to the given scalar value
   *
   * @returns {this}
   */
  public setY(scalar: number): this {
    this[1] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar sets this inst's z component to the given scalar value
   *
   * @returns {this}
   */
  public setZ(scalar: number): this {
    this[2] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc get a component of this vec at some index
   *
   * @param {number} index  the component index
   *
   * @returns {number} the component value
   */
  public getComponent(index: number): number {
    switch (index) {
      case 0:
        return this[0];

      case 1:
        return this[1];

      case 2:
        return this[2];

      default:
        throw new ExplorerError({
          msg: `Failed to GET component as Index<value: ${index}> is out of range`,
          code: ExplorerError.Errors.InvalidArgument,
        });
    }
  }

  /**
   * @desc set a component of this vec at some index
   *
   * @param {number} index  the component index
   * @param {number} scalar some scalar value
   *
   * @returns {this} this vec, updated in-place
   */
  public setComponent(index: number, scalar: number): this {
    switch (index) {
      case 0:
        this[0] = scalar;
        this.handleOnChanged();
        break;

      case 1:
        this[1] = scalar;
        this.handleOnChanged();
        break;

      case 2:
        this[2] = scalar;
        this.handleOnChanged();
        break;

      default:
        throw new ExplorerError({
          msg: `Failed to SET component as Index<value: ${index}> is out of range`,
          code: ExplorerError.Errors.InvalidArgument,
        });
    }

    return this;
  }

  /**
   * @param {Mat3Like} mat   some matrix
   * @param {number}   [i=0] some column index
   *
   * @returns {this} some basis at the given index from the matrix
   */
  public setFromMat3(mat: Mat3Like, i: 0 | 1 | 2 = 0): this {
    i *= 3;

    this[0] = mat[i + 0];
    this[1] = mat[i + 1];
    this[2] = mat[i + 2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Mat4Like} mat   some Mat4-like object
   * @param {number}   [i=0] the column index
   *
   * @returns {this} the x, y, z or translation of the matrix
   */
  public setFromMat4(mat: Mat4Like, i: 0 | 1 | 2 | 3 = 0): this {
    i *= 4;

    this[0] = mat[i + 0];
    this[1] = mat[i + 1];
    this[2] = mat[i + 2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Mat4Like} mat a Mat4-like object describing translation
   *
   * @returns {this} in-place vector describing the translation part of a Mat4
   */
  public setPosFromMat4(mat: Mat4Like): this {
    this[0] = mat[12];
    this[1] = mat[13];
    this[2] = mat[14];
    this.handleOnChanged();
    return this;
  }

  /**
   * @note this works for both Mat3 & Mat4 objects
   *
   * @param {MatLike} mat some Mat3/4-like object
   *
   * @returns {this} in-place vector describing the matrix scale
   */
  public setFromMatScale(mat: MatLike): this {
    if (mat.length === 9) {
      // i.e. Mat3x3
      this[0] = Math.sqrt(mat[0] * mat[0] + mat[1] * mat[1] + mat[2] * mat[2]);
      this[1] = Math.sqrt(mat[3] * mat[3] + mat[4] * mat[4] + mat[5] * mat[5]);
      this[2] = Math.sqrt(mat[6] * mat[6] + mat[7] * mat[7] + mat[8] * mat[8]);
    } else if (mat.length === 16) {
      // i.e. Mat4x4
      this[0] = Math.sqrt(mat[0] * mat[0] + mat[1] * mat[1] + mat[2] * mat[2]);
      this[1] = Math.sqrt(mat[4] * mat[4] + mat[5] * mat[5] + mat[6] * mat[6]);
      this[2] = Math.sqrt(mat[8] * mat[8] + mat[9] * mat[9] + mat[10] * mat[10]);
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set a vec from an array of components
   *
   * @param {number[]} arr      some numeric array describing the vec components
   * @param {number}   [offset] optionally specify the array offset
   *
   * @returns {this} an in-place vec set to the given components
   */
  public setFromArray(arr: Array<number>, offset: number = 0): this {
    if (arr.length - offset < 3) {
      const rem = arr.length - offset;
      throw new ExplorerError({
        msg: `Expected remaining length of at least 3 elements but got Res<remainder: ${rem}, offset: ${offset}>`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    this[0] = arr[offset + 0];
    this[1] = arr[offset + 1];
    this[2] = arr[offset + 2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets an array's elements to this instance's components
   *
   * @param {number[]} arr      some numeric array describing the vec components
   * @param {number}   [offset] optionally specify the array offset
   *
   * @returns {this} this vec
   */
  public toArray(arr: TypedArray | Array<number>, offset: number = 0): this {
    arr[offset + 0] = this[0];
    arr[offset + 1] = this[1];
    arr[offset + 2] = this[2];
    return this;
  }

  /**
   * @param {Vec3Like} vec vec-like object
   *
   * @returns {this} in-place vec describing this + vec
   */
  public add(vec: Vec3Like): this {
    this[0] += vec[0];
    this[1] += vec[1];
    this[2] += vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar some numeric value
   *
   * @returns {this} in-place vec describing [this[0] + scalar, ..., this[n] + scalar]
   */
  public addScalar(scalar: number): this {
    this[0] += scalar;
    this[1] += scalar;
    this[2] += scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} v0 vec-like object
   * @param {Vec3Like} v1 vec-like object
   *
   * @returns {this} in-place vec describing v0 + v1
   */
  public addVectors(v0: Vec3Like, v1: Vec3Like): this {
    this[0] = v0[0] + v1[0];
    this[1] = v0[1] + v1[1];
    this[2] = v0[2] + v1[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec   vec-like object
   * @param {number}   scale some numeric value
   *
   * @returns {this} in-place vec describing [vec[0] + scalar, ..., vec[n] + scalar]
   */
  public addScaledVector(vec: Vec3Like, scale: number): this {
    this[0] += vec[0] * scale;
    this[1] += vec[1] * scale;
    this[2] += vec[2] * scale;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec vec-like object
   *
   * @returns {this} in-place vec describing this - vec
   */
  public sub(vec: Vec3Like): this {
    this[0] -= vec[0];
    this[1] -= vec[1];
    this[2] -= vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar some numeric value
   *
   * @returns {this} in-place vec describing [this[0] - scalar, ..., this[n] - scalar]
   */
  public subScalar(scalar: number): this {
    this[0] -= scalar;
    this[1] -= scalar;
    this[2] -= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} v0 vec-like object
   * @param {Vec3Like} v1 vec-like object
   *
   * @returns {this} in-place vec describing v0 - v1
   */
  public subVectors(v0: Vec3Like, v1: Vec3Like): this {
    this[0] = v0[0] - v1[0];
    this[1] = v0[1] - v1[1];
    this[2] = v0[2] - v1[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec   vec-like object
   * @param {number}   scale some numeric value
   *
   * @returns {this} in-place vec describing [vec[0] - scalar, ..., vec[n] - scalar]
   */
  public subScaledVector(vec: Vec3Like, scale: number): this {
    this[0] -= vec[0] * scale;
    this[1] -= vec[1] * scale;
    this[2] -= vec[2] * scale;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec vec-like object
   *
   * @returns {this} in-place vec describing this * vec
   */
  public mul(vec: Vec3Like): this {
    this[0] *= vec[0];
    this[1] *= vec[1];
    this[2] *= vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar some numeric value
   *
   * @returns {this} in-place vec describing [this[0] * scalar, ..., this[n] * scalar]
   */
  public mulScalar(scalar: number): this {
    this[0] *= scalar;
    this[1] *= scalar;
    this[2] *= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} v0 vec-like object
   * @param {Vec3Like} v1 vec-like object
   *
   * @returns {this} in-place vec describing v0 * v1
   */
  public mulVectors(v0: Vec3Like, v1: Vec3Like): this {
    this[0] = v0[0] * v1[0];
    this[1] = v0[1] * v1[1];
    this[2] = v0[2] * v1[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} vec vec-like object
   *
   * @returns {this} in-place vec describing this / vec
   */
  public div(vec: Vec3Like): this {
    this[0] /= vec[0];
    this[1] /= vec[1];
    this[2] /= vec[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar some numeric value
   *
   * @returns {this} in-place vec describing [this[0] / scalar, ..., this[n] / scalar]
   */
  public divScalar(scalar: number): this {
    scalar = 1 / scalar;
    this[0] *= scalar;
    this[1] *= scalar;
    this[2] *= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} v0 vec-like object
   * @param {Vec3Like} v1 vec-like object
   *
   * @returns {this} in-place vec describing v0 / v1
   */
  public divVectors(v0: Vec3Like, v1: Vec3Like): this {
    this[0] = v0[0] / v1[0];
    this[1] = v0[1] / v1[1];
    this[2] = v0[2] / v1[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @note this functions for both Mat3 & Mat4 types; use this if you want to transform by direction of a Mat4
   *
   * @param {MatLike} mat         Mat3 or Mat4-like in which the first 8 components describe column-ordered rotation
   * @param {MatLike} [normalise] optionally specify whether to normalise the result; defaults to `false`
   *
   * @returns {this} this vector transformed by some rotation matrix
   */
  public applyMat3(mat: MatLike, normalise: boolean = false): this {
    let m00!: number, m01!: number, m02!: number, m10!: number, m11!: number, m12!: number, m20!: number, m21!: number, m22!: number;

    if (mat.length === 9) {
      // i.e. Mat3x3
      (m00 = mat[0]),
        (m01 = mat[1]),
        (m02 = mat[2]),
        (m10 = mat[3]),
        (m11 = mat[4]),
        (m12 = mat[5]),
        (m20 = mat[6]),
        (m21 = mat[7]),
        (m22 = mat[8]);
    } else if (mat.length === 16) {
      // i.e. Mat4x4
      (m00 = mat[0]),
        (m01 = mat[1]),
        (m02 = mat[2]),
        (m10 = mat[4]),
        (m11 = mat[5]),
        (m12 = mat[6]),
        (m20 = mat[8]),
        (m21 = mat[9]),
        (m22 = mat[10]);
    }

    let x = this[0],
      y = this[1],
      z = this[2];
    x = m00 * x + m10 * y + m20 * z;
    y = m01 * x + m11 * y + m21 * z;
    z = m02 * x + m12 * y + m22 * z;

    if (!!normalise) {
      let d = x * x + y * y + z * z;
      if (Math.abs(d - 1) > Const.EPSILON) {
        d = 1 / Math.sqrt(d);
        x *= d;
        y *= d;
        z *= d;
      }
    }

    this[0] = x;
    this[1] = y;
    this[2] = z;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Mat4Like} mat column-ordered Mat4-like object describing translation, rotation & scale
   *
   * @returns {this} this vector transformed by some Mat4
   */
  public applyMat4(mat: Mat4Like): this {
    const x = this[0],
      y = this[1],
      z = this[2];

    const w = 1 / (mat[3] * x + mat[7] * y + mat[11] * z + mat[15]);
    this[0] = (mat[0] * x + mat[4] * y + mat[8] * z + mat[12]) * w;
    this[1] = (mat[1] * x + mat[5] * y + mat[9] * z + mat[13]) * w;
    this[2] = (mat[2] * x + mat[6] * y + mat[10] * z + mat[14]) * w;
    this.handleOnChanged();
    return this;
  }

  /**
   * @note expects XYZ euler order
   *
   * @param {Vec3Like} euler some euler angles (in radians)
   *
   * @returns {this}
   */
  public applyEuler(euler: Vec3Like): this {
    const x = euler[0],
      y = euler[1],
      z = euler[2];

    const c0 = Math.cos(0.5 * x);
    const c1 = Math.cos(0.5 * y);
    const c2 = Math.cos(0.5 * z);

    const s0 = Math.sin(0.5 * x);
    const s1 = Math.sin(0.5 * y);
    const s2 = Math.sin(0.5 * z);

    let qx = s0 * c1 * c2 + c0 * s1 * s2,
      qy = c0 * s1 * c2 - s0 * c1 * s2,
      qz = c0 * c1 * s2 + s0 * s1 * c2,
      qw = c0 * c1 * c2 - s0 * s1 * s2;

    let l = qx * qx + qy * qy + qz * qz + qw * qw;
    if (Math.abs(l) < Const.EPSILON) {
      (qx = qy = qz = 0), (qw = 1);
    } else if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      qx *= l;
      qy *= l;
      qz *= l;
    }

    const vx = this[0],
      vy = this[1],
      vz = this[2];
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    this[0] = vx + qw * tx + qy * tz - qz * ty;
    this[1] = vy + qw * ty + qz * tx - qx * tz;
    this[2] = vz + qw * tz + qx * ty - qy * tx;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} quat some Quat-like input value
   *
   * @returns {this} in-place vec describing quat*this
   */
  public applyQuaternion(quat: QuatLike): this {
    let qx = quat[0],
      qy = quat[1],
      qz = quat[2],
      qw = quat[3];

    let l = qx * qx + qy * qy + qz * qz + qw * qw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      qx *= l;
      qy *= l;
      qz *= l;
      qw *= l;
    }

    const vx = this[0],
      vy = this[1],
      vz = this[2];
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    this[0] = vx + qw * tx + qy * tz - qz * ty;
    this[1] = vy + qw * ty + qz * tx - qx * tz;
    this[2] = vz + qw * tz + qx * ty - qy * tx;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} axis  some axis of rotation
   * @param {number}   angle some rotation amount (radians)
   *
   * @returns {this}
   */
  public applyAxisAngle(axis: Vec3Like, angle: number): this {
    const vx = this[0],
      vy = this[1],
      vz = this[2];

    const h = angle * 0.5;
    const s = Math.sin(h);

    let qx = axis[0] * s,
      qy = axis[1] * s,
      qz = axis[2] * s,
      qw = Math.cos(h);

    let l = qx * qx + qy * qy + qz * qz + qw * qw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      qx *= l;
      qy *= l;
      qz *= l;
      qw *= l;
    }

    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    this[0] = vx + qw * tx + qy * tz - qz * ty;
    this[1] = vy + qw * ty + qz * tx - qx * tz;
    this[2] = vz + qw * tz + qx * ty - qy * tx;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param i index of the x component
   * @param j index of the y component
   * @param k index of the z component
   *
   * @returns {this} in-place swizzle of this object
   */
  public swizzle(i: number, j: number, k: number): this {
    this[0] = this.getComponent(i);
    this[1] = this.getComponent(j);
    this[2] = this.getComponent(k);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param i index of the x component
   * @param j index of the y component
   * @param k index of the z component
   *
   * @returns {Vec3} a swizzled copy of this object
   */
  public getSwizzled(i: number, j: number, k: number): Vec3 {
    return new Vec3(this.getComponent(i), this.getComponent(j), this.getComponent(k));
  }

  /**
   * @returns {this} in-place negation of this object
   */
  public negate(): this {
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {this} a negated copy of this object
   */
  public getNegated(): Vec3 {
    return new Vec3(-this[0], -this[1], -this[2]);
  }

  /**
   * @returns {this} in-place reciprocal vector
   */
  public reciprocal(): this {
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {Vec3} newly constructed reciprocal vector
   */
  public getReciprocal(): Vec3 {
    return new Vec3(1 / this[0], 1 / this[1], 1 / this[2]);
  }

  /**
   * @returns {number} the length of this vector
   */
  public magnitude(): number {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
  }

  /**
   * @returns {number} the square length of this vector
   */
  public magnitudeSq(): number {
    return this[0] * this[0] + this[1] * this[1] + this[2] * this[2];
  }

  /**
   * @param {Vec3Like} vec translation vector
   *
   * @returns {number} distance to position
   */
  public distance(vec: Vec3Like): number {
    const dx = this[0] - vec[0];
    const dy = this[1] - vec[1];
    const dz = this[2] - vec[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * @param {Vec3Like} vec some translation vector
   *
   * @returns {number} square distance to position
   */
  public distanceSq(vec: Vec3Like): number {
    const dx = this[0] - vec[0];
    const dy = this[1] - vec[1];
    const dz = this[2] - vec[2];
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * @param {Vec3Like} vec some vec
   *
   * @returns {number} the dot product of the two vectors
   */
  public dot(vec: Vec3Like): number {
    return this[0] * vec[0] + this[1] * vec[1] + this[2] * vec[2];
  }

  /**
   * @param {Vec3Like} vec some vec
   *
   * @returns {this} in-place vec describing the cross product of both vectors
   */
  public cross(vec: Vec3Like): this {
    this[0] = this[1] * vec[2] - this[2] * vec[1];
    this[1] = this[2] * vec[0] - this[0] * vec[2];
    this[2] = this[0] * vec[1] - this[1] * vec[0];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} v0 some vec
   * @param {Vec3Like} v1 some vec
   *
   * @returns {this} in-place vec describing the cross product of the two input vectors
   */
  public crossVectors(v0: Vec3Like, v1: Vec3Like): this {
    this[0] = v0[1] * v1[2] - v0[2] * v1[1];
    this[1] = v0[2] * v1[0] - v0[0] * v1[2];
    this[2] = v0[0] * v1[1] - v0[1] * v1[0];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} [epsSq=1e-6] some threshold scalar value
   *
   * @returns {this} in-place normalised vector
   */
  public normalise(epsSq: number = Const.EPSILON): this {
    let d = this[0] * this[0] + this[1] * this[1] + this[2] * this[2];
    if (Math.abs(d - 1) > epsSq) {
      d = 1 / Math.sqrt(d);
      this[0] *= d;
      this[1] *= d;
      this[2] *= d;
      this.handleOnChanged();
    }

    return this;
  }

  /**
   * @param {number} [epsSq=1e-6] some threshold scalar value
   *
   * @returns {Vec3} a newly constructed normalised representation of this vec
   */
  public getNormalised(epsSq: number = Const.EPSILON): Vec3 {
    let d = this[0] * this[0] + this[1] * this[1] + this[2] * this[2];
    if (Math.abs(d - 1) > epsSq) {
      d = 1 / Math.sqrt(d);
      return new Vec3(this[0] * d, this[1] * d, this[2] * d);
    }

    return new Vec3(this[0], this[1], this[2]);
  }

  /**
   * @param {Vec3} [hint0=[0,1,0]] first hint vec
   * @param {Vec3} [hint0=[0,0,1]] second hint vec
   *
   * @returns {this} in-place perpendicular vector to this vec
   */
  public perpendicular(hint0: Vec3Like = [0, 1, 0], hint1: Vec3Like = [0, 0, 1]): this {
    const cx = this[1] * hint0[2] - this[2] * hint0[1],
      cy = this[2] * hint0[0] - this[0] * hint0[2],
      cz = this[0] * hint0[1] - this[1] * hint0[0];

    const d = cx * cx + cy * cy + cz * cz;
    if (Math.abs(d - 1) > Const.EPSILON) {
      this[0] = hint1[0];
      this[1] = hint1[1];
      this[2] = hint1[2];
    } else {
      this[0] = cx;
      this[1] = cy;
      this[2] = cz;
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3} [hint0=[0,1,0]] first hint vec
   * @param {Vec3} [hint0=[0,0,1]] second hint vec
   *
   * @returns {Vec3} newly constructed perpendicular vector to this vec
   */
  public getPerpendicular(hint0: Vec3Like = [0, 1, 0], hint1: Vec3Like = [0, 0, 1]): Vec3 {
    const cx = this[1] * hint0[2] - this[2] * hint0[1],
      cy = this[2] * hint0[0] - this[0] * hint0[2],
      cz = this[0] * hint0[1] - this[1] * hint0[0];

    const d = cx * cx + cy * cy + cz * cz;
    if (Math.abs(d - 1) > Const.EPSILON) {
      return new Vec3(hint1[0], hint1[1], hint1[2]);
    }

    return new Vec3(cx, cy, cz);
  }

  /**
   * @param {Vec3} min some min bounds
   *
   * @returns {this} in-place minimum
   */
  public min(min: Vec3Like): this {
    this[0] = Math.min(this[0], min[0]);
    this[1] = Math.min(this[1], min[1]);
    this[2] = Math.min(this[2], min[2]);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} min some min scalar bounds
   *
   * @returns {this} in-place minimum
   */
  public minScalar(min: number): this {
    this[0] = Math.min(this[0], min);
    this[1] = Math.min(this[1], min);
    this[2] = Math.min(this[2], min);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3} max some max bounds
   *
   * @returns {this} in-place maximum
   */
  public max(max: Vec3Like): this {
    this[0] = Math.max(this[0], max[0]);
    this[1] = Math.max(this[1], max[1]);
    this[2] = Math.max(this[2], max[2]);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3} max some max scalar bounds
   *
   * @returns {this} in-place maximum
   */
  public maxScalar(max: number): this {
    this[0] = Math.max(this[0], max);
    this[1] = Math.max(this[1], max);
    this[2] = Math.max(this[2], max);
    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {this} in-place vector with each of its components clamped between 0 and 1
   */
  public clamp01(): this {
    this[0] = NumberUtils.clamp(this[0], 0, 1);
    this[1] = NumberUtils.clamp(this[1], 0, 1);
    this[2] = NumberUtils.clamp(this[2], 0, 1);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} floor the minimum bounds
   * @param {Vec3Like} ceil  the maximum bounds
   *
   * @returns {this} in-place vec clamped between the two inputs
   */
  public clamp(floor: Vec3Like, ceil: Vec3Like): this {
    this[0] = NumberUtils.clamp(this[0], floor[0], ceil[0]);
    this[1] = NumberUtils.clamp(this[1], floor[1], ceil[1]);
    this[2] = NumberUtils.clamp(this[2], floor[2], ceil[2]);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} floor the minimum scalar bounds
   * @param {number} ceil  the maximum scalar bounds
   *
   * @returns {this} in-place vec with each of its components clamped between the two inputs
   */
  public clampScalar(floor: number, ceil: number): this {
    this[0] = NumberUtils.clamp(this[0], floor, ceil);
    this[1] = NumberUtils.clamp(this[1], floor, ceil);
    this[2] = NumberUtils.clamp(this[2], floor, ceil);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} min the minimum scalar magnitude
   * @param {number} max the maximum scalar magnitude
   *
   * @returns {this} in-place vec with its magnitude clamped between both inputs
   */
  public clampMagnitude(min: number, max: number): this {
    const len = Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
    const dis = (1 / (len || 1)) * NumberUtils.clamp(len, min, max);
    this[0] = this[0] * dis;
    this[1] = this[1] * dis;
    this[2] = this[2] * dis;
    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {this} in-place vec with each of its components set to its `Math.floor`
   */
  public floor(): this {
    this[0] = Math.floor(this[0]);
    this[1] = Math.floor(this[1]);
    this[2] = Math.floor(this[2]);
    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {this} in-place vec with each of its components set to its `Math.ceil`
   */
  public ceil(): this {
    this[0] = Math.ceil(this[0]);
    this[1] = Math.ceil(this[1]);
    this[2] = Math.ceil(this[2]);
    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {this} in-place vec with each of its components set to its `Math.round`
   */
  public round(): this {
    this[0] = Math.round(this[0]);
    this[1] = Math.round(this[1]);
    this[2] = Math.round(this[2]);
    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {this} in-place vec with each of its components truncated with `Math.trunc`
   */
  public truncate(): this {
    this[0] = Math.trunc(this[0]);
    this[1] = Math.trunc(this[1]);
    this[2] = Math.trunc(this[2]);
    this.handleOnChanged();
    return this;
  }

  /**
   * @see {@link NumberUtils.round}
   *
   * @param {number} precision the rounding precision
   *
   * @returns {this} in-place vec with each of its components rounded to the given precision
   */
  public roundTo(precision: number): this {
    this[0] = NumberUtils.round(this[0], precision);
    this[1] = NumberUtils.round(this[1], precision);
    this[2] = NumberUtils.round(this[2], precision);
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc linearly interpole between this & vec
   *
   * @param {Vec3Like} vec          the target vec
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {this} this vec interpolated in-place
   */
  public lerp(vec: Vec3Like, alpha: number, clamp: boolean = true): this {
    if (clamp) {
      alpha = NumberUtils.clamp(alpha, 0, 1);
    }

    this[0] = this[0] + (vec[0] - this[0]) * alpha;
    this[1] = this[1] + (vec[1] - this[1]) * alpha;
    this[2] = this[2] + (vec[2] - this[2]) * alpha;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc linearly interpole between v0 & v1
   *
   * @param {Vec3Like} v0           the source vec
   * @param {Vec3Like} v1           the target vec
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {this} this vec interpolated in-place
   */
  public lerpVectors(v0: Vec3Like, v1: Vec3Like, alpha: number, clamp: boolean = true): this {
    if (clamp) {
      alpha = NumberUtils.clamp(alpha, 0, 1);
    }

    this[0] = v0[0] + (v1[0] - v0[0]) * alpha;
    this[1] = v0[1] + (v1[1] - v0[1]) * alpha;
    this[2] = v0[2] + (v1[2] - v0[2]) * alpha;
    this.handleOnChanged();
    return this;
  }

  /**
   * @see https://en.wikipedia.org/wiki/Spherical_coordinate_system
   *
   * @param {Vec3Like} coords a set of three numbers describing the radial distance, polar angle and the azimuthal angle
   *
   * @returns {this} in-place computed vector from the specified spherical coords
   */
  public setFromSphericalCoords(coords: Vec3Like): this {
    const [radius, phi, theta] = coords;

    const sp = Math.sin(phi);
    const cp = Math.cos(phi);
    const st = Math.sin(theta);
    const ct = Math.cos(theta);
    this[0] = radius * sp * ct;
    this[1] = radius * sp * st;
    this[2] = radius * cp;

    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3} normal some normal vec
   *
   * @returns {this} in-place vec projected on some vec
   */
  public projectOnNormal(normal: Vec3Like): this {
    const l = normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2];
    if (l <= Const.EPSILON) {
      this[0] = this[1] = this[2] = 0;
      this.handleOnChanged();
      return this;
    }

    const d = (1 / Math.sqrt(l)) * (this[0] * normal[0] + this[1] * normal[1] + this[2] * normal[2]);
    this[0] = normal[0] * d;
    this[1] = normal[1] * d;
    this[2] = normal[2] * d;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3} normal some normal vec
   *
   * @returns {this} in-place vec projected to some normal
   */
  public projectToNormal(normal: Vec3Like): this {
    const d = this[0] * normal[0] + this[1] * normal[1] + this[2] * normal[2];
    this[0] = normal[0] * d;
    this[1] = normal[1] * d;
    this[2] = normal[2] * d;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {Vec3Like} normal normal of some plane
   *
   * @returns {this} in-place vec projected on some plane
   */
  public projectOnPlane(normal: Vec3Like): this {
    const l = normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2];
    if (Math.abs(l - 1) > Const.EPSILON) {
      const d = (1 / Math.sqrt(l)) * (this[0] * normal[0] + this[1] * normal[1] + this[2] * normal[2]);
      this[0] -= normal[0] * d;
      this[1] -= normal[1] * d;
      this[2] -= normal[2] * d;
      this.handleOnChanged();
    }

    return this;
  }

  /**
   * @param {Vec3Like} normal some plane normal vector; normal is assumed to be unitary
   *
   * @returns {this} computed reflect incident vector off some plane normal
   */
  public reflect(normal: Vec3Like): this {
    const px = this[0],
      py = this[1],
      pz = this[2];
    const nx = normal[0],
      ny = normal[1],
      nz = normal[2];

    const d = px * nx + py * ny + pz * nz;
    this[0] = -2 * d * nx + px;
    this[1] = -2 * d * ny + py;
    this[2] = -2 * d * nz + pz;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc computes the angle between two unit vectors
   *
   * @param {Vec3}        vec    some unit vector
   * @param {boolean|any} useRad specifies whether to compute radians | degrees
   *
   * @returns {number} a number specifying the angle between the vectors (in radians)
   */
  public angleBetween(vec: Vec3Like, useRad: boolean = true): number {
    const r = useRad ? 1 : Const.RAD2DEG;

    let d = Math.sqrt((this[0] * this[0] + this[1] * this[1] + this[2] * this[2]) * (vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]));
    if (d < Const.EPSILON) {
      return 0;
    }

    d = NumberUtils.clamp((this[0] * vec[0] + this[1] * vec[1] + this[2] * vec[2]) / d, -1, 1);
    return Math.acos(d) * r;
  }

  /**
   * @desc computes the signed angle between two unit vectors in relation
   *       to the axis of rotation
   *
   * @param {Vector3}     vec    some unit vector
   * @param {Vector3}     axis   some axis of rotation
   * @param {boolean|any} useRad specifies whether to compute radians | degrees
   *
   * @returns {number} a number specifying the signed angle between the vectors (in radians)
   */
  public signedAngleBetween(vec: Vec3Like, axis: Vec3Like = [0, 1, 0], useRad: boolean = true): number {
    const r = useRad ? 1 : Const.RAD2DEG;

    const ax = this[0],
      ay = this[1],
      az = this[2];
    const bx = vec[0],
      by = vec[1],
      bz = vec[2];

    let d = Math.sqrt((ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz));
    if (d < Const.EPSILON) {
      return 0;
    }

    d = Math.acos(NumberUtils.clamp((ax * bx + ay * by + az * bz) / d, -1, 1)) * r;

    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;

    const s = axis[0] * cx + axis[1] * cy + axis[2] * cz >= 0 ? 1 : -1;

    return d * s;
  }

  /**
   * @desc rotates some point around axis at some origin
   *
   * @param {Vec3Like} vec            the origin point
   * @param {number}   delta          the rotation amount (radians)
   * @param {Vec3Like} [axis=[0,1,0]] the axis of rotation
   *
   * @returns {this} this inst updated in place
   */
  public rotateAround(vec: Vec3Like, delta: number, axis: Vec3Like = [0, 1, 0]): this {
    let vx = this[0] - vec[0],
      vy = this[1] - vec[1],
      vz = this[2] - vec[2];

    let d = vx * vx + vy * vy + vz * vz;
    let ax = axis[0],
      ay = axis[1],
      az = axis[2];
    d = ax * ax + ay * ay + az * az;
    if (Math.abs(d - 1) > Const.EPSILON) {
      d = 1 / Math.sqrt(d);
      ax *= d;
      ay *= d;
      az *= d;
    }

    const h = delta * 0.5;
    const s = Math.sin(h);

    let qx = ax * s,
      qy = ay * s,
      qz = az * s,
      qw = Math.cos(h);

    d = qx * qx + qy * qy + qz * qz + qw * qw;
    if (Math.abs(d - 1) > Const.EPSILON) {
      d = 1 / Math.sqrt(d);

      qx *= d;
      qy *= d;
      qz *= d;
      qw *= d;
    }

    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    this[0] = vec[0] + vx + qw * tx + qy * tz - qz * ty;
    this[1] = vec[1] + vy + qw * ty + qz * tx - qx * tz;
    this[2] = vec[2] + vz + qw * tz + qx * ty - qy * tx;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this inst to a random unit vector
   *
   * @returns {this} in-place randomly composed unit vector
   */
  public randomUnit(): this {
    const t = Math.random() * Const.TAU;
    const u = Math.random() * 2 - 1;
    const v = Math.sqrt(1 - u * u);
    this[0] = v * Math.cos(t);
    this[1] = u;
    this[2] = v * Math.sin(t);
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this inst to a random unit vector along some some direction, contained by some specified angle
   *
   * @param {Vec3Like} direction some unit vector specifying the direction of the cone
   * @param {number}   angle     cone angle (in radians)
   *
   * @returns {this} in-place computed cone unit vector
   */
  public randomCone(direction: Vec3Like, angle: number): this {
    const p = Math.random() * Const.TAU;
    const c = Math.cos(angle);

    const z = 1 - Math.random() * (1 - c);
    const r = Math.sqrt(1 - z * z);
    const x = r * Math.cos(p);
    const y = r * Math.sin(p);

    if (direction[2] > 0.9999) {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      this.handleOnChanged();
      return this;
    } else if (direction[2] < -0.9999) {
      this[0] = -x;
      this[1] = -y;
      this[2] = -z;
      this.handleOnChanged();
      return this;
    }

    let dx = -direction[1],
      dy = direction[0],
      dz = 0;
    let d = dx * dx + dy * dy + dz * dz;
    if (Math.abs(d - 1) > Const.EPSILON) {
      d = 1 / Math.sqrt(d);
      dx *= d;
      dy *= d;
      dz *= d;
    }

    const h = Math.acos(direction[2]) * 0.5;
    const s = Math.sin(h);
    this[0] = x;
    this[1] = y;
    this[2] = z;

    return this.applyQuaternion([dx * s, dy * s, dz * s, Math.cos(h)]);
  }

  /**
   * @desc sets this inst to a random point inside or on a sphere of the specified radius
   *
   * @param {number} [radius=1] the radius of the sphere
   *
   * @returns {this} in-place computed random point
   */
  public randomSphere(radius: number = 1): this {
    return this.setFromSphericalCoords([
      radius * Math.random(), // radius
      Math.acos(2 * Math.random() - 1), // phi
      Math.random() * Const.TAU, // theta
    ]);
  }

  /**
   * @desc sets this inst to a random point on the surface of a sphere of the specified radius
   *
   * @param {number} [radius=1] the radius of the sphere
   *
   * @returns {this} in-place computed random point
   */
  public randomOnSphere(radius: number = 1): this {
    const t = Math.random() * Const.TAU;
    const u = Math.random() * 2 - 1;
    const v = Math.sqrt(1 - u * u);
    this[0] = v * Math.cos(t) * radius;
    this[1] = u * radius;
    this[2] = v * Math.sin(t) * radius;

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
    if (!signal || !signal.active) {
      return;
    }

    signal.fire(this);
  }
}
