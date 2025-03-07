import * as NumberUtils from './number';

import { TypedArray } from '@engine/core';
import { Mat3Like, Mat4Like } from './mat4';
import { Const, Signal, ExplorerError } from '@engine/common';

/**
 * @desc a Vec2-like object containing an `x` and `y` component
 */
export type Vec2Like = Vec2 | ArrayOf<'at least', 2, number> | (Float32Array & { length: 2 });

/**
 * @desc a Vec2 serialised to a dict
 */
export interface Vec2Obj {
  x: number;
  y: number;
}

/**
 * Class representing a {@link https://en.wikipedia.org/wiki/Euclidean_vector|2D vector}, or `float2`, value
 *
 * @todo need to cleanup interface, ensure compatible with other classes; and to finalise assoc. documentation
 *
 * @class
 * @constructor
 * @extends Array
 */
// prettier-ignore
export class Vec2 extends Array<number> {
  /**
   * @desc this class' type name
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Vec2.name;

  /**
   * @desc changed event dispatcher
   * @type {Signal}
   * @protected
   */
  protected _changedSignal?: Signal;

  /**
   * @desc constructs a {@link Vec2} instance
   * @param {number} [x=0] specifies the x component of this vector
   * @param {number} [y=0] specifies the y component of this vector
   */
  public constructor(x: number = 0, y: number = 0) {
    super(2);

    this[0] = x;
    this[1] = y;
  }

  /**
   * @desc {@link Vec2} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Vec2} specifying whether the input is a {@link Vec2}
   */
  public static Is(obj: unknown): obj is Vec2 {
    return Array.isArray(obj)
      && 'isA' in obj
      && (typeof obj.isA === 'function' && obj.isA.length === 1)
      && obj.isA(Vec2.ClassName);
  }

  /**
   * @static
   *
   * @param {number} scalar some scalar value
   *
   * @returns {Vec2} constructs a new vec with each of its components defined by the scalar input
   */
  public static FromScalar(scalar: number): Vec2 {
    return new Vec2(scalar, scalar);
  }

  /**
   * @static
   *
   * @param {Array<number>} arr        an arr with at least two number values at the specified offset
   * @param {number}        [offset=0] offset from the start of the array
   *
   * @returns {Vec2} constructs a new vec with each of its components derived from the given array
   */
  public static FromArray(arr: Array<number>, offset: number = 0): Vec2 {
    if (arr.length - offset < 2) {
      const rem = arr.length - offset;
      throw new ExplorerError({
        msg: `Expected remaining length of at least 2 elements but got Res<remainder: ${rem}, offset: ${offset}>`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    return new Vec2(arr[offset + 0], arr[offset + 1]);
  }

  /**
   * @desc construct a new Vec by linearly interpolating between v0 & v1
   * @static
   *
   * @param {Vec2Like} v0           the source vec
   * @param {Vec2Like} v1           the target vec
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {Vec2} the newly constructed Vec
   */
  public static Lerp(v0: Vec2Like, v1: Vec2Like, alpha: number, clamp: boolean = true): Vec2 {
    return new Vec2().lerpVectors(v0, v1, alpha, clamp);
  }

  /**
   * @static
   *
   * @returns {Vec2} constructs a new zeroed vec2
   */
  public static Zero(): Vec2 {
    return new Vec2(0, 0);
  }

  /**
   * @static
   *
   * @returns {Vec2} constructs a new vec2 with each of its components set to `1`
   */
  public static One(): Vec2 {
    return new Vec2(1, 1);
  }

  /**
   * @desc constructs a vec as a point on a circle given an angle and a radius
   * @static
   *
   * @param {number} radius radius of the circle
   * @param {number} theta  angle of the vector
   * @param {number} [cx=0] optionally specify the x position of the circle's centre
   * @param {number} [cy=0] optionally specify the y position of the circle's centre
   *
   * @returns {Vec2} constructs a new vec
   */
  public static PointOnCircle(radius: number, theta: number, cx: number = 0, cy: number = 0): Vec2 {
    return new Vec2().setFromPolarCoordinates(radius, theta, cx, cy);
  }

  /**
   * @desc constructs a new random vec;
   * @note
   *  - The components will be set to a random number between 0 - 1 if not otherwise specified
   *  - Args:
   *    - If 2 numbers are specified: xy components generated within the range of `args.0` and `args.1`
   *    - If 4 numbers are specified: expects shape of `[xmin, xmax, ymin, ymax]`
   *  - The numbers will be generated between the range of `args.0` and `args.1` if two numbers are specified
   * @static
   *
   * @param {...*}   args   optional variadic number arguments
   *
   * @returns {Vec2} constructs a new vec with random components contained by the specified range (if applicable)
   */
  public static Random(...args: number[]): Vec2 {
    const len = args.length;
    if (len >= 4) {
      const xmin = Math.min(args[0], args[1]);
      const xmax = Math.max(args[0], args[1]);

      const ymin = Math.min(args[2], args[3]);
      const ymax = Math.max(args[2], args[3]);

      return new Vec2(
        NumberUtils.randomFloat(xmin, xmax),
        NumberUtils.randomFloat(ymin, ymax),
      );
    } else if (len >= 2) {
      const min = Math.min(args[0], args[1]);
      const max = Math.max(args[0], args[1]);
      const vec = new Vec2(
        NumberUtils.randomFloat(min, max),
        NumberUtils.randomFloat(min, max)
      );

      return vec;
    }

    return new Vec2(NumberUtils.randomFloat(-1, 1), NumberUtils.randomFloat(-1, 1));
  }

  /**
   * @desc random point on circle
   * @static
   *
   * @param {number} [minRadius=0]        optionally specify the lower bounds of circle's radius
   * @param {number} [maxRadius=1]        optionally specify the upper bounds of circle's radius
   * @param {number} [minTheta=0]         optionally specify the lower bounds of the vector angle
   * @param {number} [maxTheta=Const.TAU] optionally specify the upper bounds of the vector angle
   * @param {number} [cx=0]               optionally specify the x position of the circle's centre
   * @param {number} [cy=0]               optionally specify the y position of the circle's centre
   *
   * @returns {Vec2} newly constructed random point on circle
   */
  public static RandomCircle(
    minRadius: number = 0,
    maxRadius: number = 1,
    minTheta: number = 0,
    maxTheta: number = Const.TAU,
    cx: number = 0,
    cy: number = 0
  ): Vec2 {
    return new Vec2().randomCircle(minRadius, maxRadius, minTheta, maxTheta, cx, cy);
  }

  /**
   * @static
   *
   * @param {Vec2Like} v0 vec-like object
   * @param {Vec2Like} v1 vec-like object
   *
   * @returns {number} distance to position
   */
  public static DistanceBetween(v0: Vec2Like, v1: Vec2Like): number {
    const dx = v0[0] - v1[0];
    const dy = v0[1] - v1[1];
    return Math.sqrt(dx*dx + dy*dy);
  }

  /**
   * @static
   *
   * @param {Vec2Like} v0 vec-like object
   * @param {Vec2Like} v1 vec-like object
   *
   * @returns {number} square distance to position
   */
  public static DistanceBetweenSq(v0: Vec2Like, v1: Vec2Like): number {
    const dx = v0[0] - v1[0];
    const dy = v0[1] - v1[1];
    return dx*dx + dy*dy;
  }

  /**
   * @static
   *
   * @returns {Vec2} constructs a new vec2 its x component set to `1`
   */
  public static UnitX(): Vec2 {
    return new Vec2(1, 0);
  }

  /**
   * @static
   *
   * @returns {Vec2} constructs a new vec2 its t component set to `1`
   */
  public static UnitY(): Vec2 {
    return new Vec2(0, 1);
  }

  /**
   * @static
   *
   * @returns {Vec2} constructs a new vec2 with the screen's global right vector
   */
  public static RightVector(): Vec2 {
    return new Vec2(1, 0);
  }

  /**
   * @static
   *
   * @returns {Vec2} constructs a new vec2 with the screen's global up vector
   */
  public static UpVector(): Vec2 {
    return new Vec2(0, -1);
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Vec2';
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
    return `${this.ClassName}<x: ${this[0]}, y: ${this[1]}>`;
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
    return `vec2(${this[0]}, ${this[1]})`;
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
   * @param {Vec2Like} vec some object to compare
   *
   * @returns {boolean} evaluates to `true` if the object are exactly equal
   */
  public equals(vec: Vec2Like): boolean {
    return this[0] === vec[0] && this[1] === vec[1];
  }

  /**
   * @desc tests approximate equality
   *
   * @param {Vec2Like} vec        some object to compare
   * @param {number}   [eps=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if the object is approximately equal
   */
  public approximately(vec: Vec2Like | Array<number>, eps?: number): boolean {
    if (typeof vec[0] !== 'number' || typeof vec[1] !== 'number') {
      return false;
    }

    return NumberUtils.approximately(this[0], vec[0], eps) && NumberUtils.approximately(this[1], vec[1], eps);
  }

  /**
   * @desc less than the comparison
   *
   * @param {Vec2Like} vec some vec to compare
   *
   * @returns {boolean} evaluates to `true` if this vec is less than the comparator
   */
  public ltComp(vec: Vec2Like): boolean {
    const ax = this[0], ay = this[1];
    const bx =  vec[0], by =  vec[1];
    const l0 = ax*ax + ay*ay;
    const l1 = bx*bx + by*by;
    return l0 < l1;
  }

  /**
   * @desc less than or equal to comparison
   *
   * @param {Vec2Like} vec some vec to compare
   *
   * @returns {boolean} evaluates to `true` if this vec is less than or equal to the comparator
   */
  public lteComp(vec: Vec2Like): boolean {
    const ax = this[0], ay = this[1];
    const bx =  vec[0], by =  vec[1];
    const l0 = ax*ax + ay*ay;
    const l1 = bx*bx + by*by;
    return l0 <= l1;
  }

  /**
   * @desc greater than the comparison
   *
   * @param {Vec2Like} vec some vec to compare
   *
   * @returns {boolean} evaluates to `true` if this vec is greater than the comparator
   */
  public gtComp(vec: Vec2Like): boolean {
    const ax = this[0], ay = this[1];
    const bx =  vec[0], by =  vec[1];
    const l0 = ax*ax + ay*ay;
    const l1 = bx*bx + by*by;
    return l0 > l1;
  }

  /**
   * @desc greater than or equal to comparison
   *
   * @param {Vec2Like} vec some vec to compare
   *
   * @returns {boolean} evaluates to `true` if this vec is greater than or equal to the comparator
   */
  public gteComp(vec: Vec2Like): boolean {
    const ax = this[0], ay = this[1];
    const bx =  vec[0], by =  vec[1];
    const l0 = ax*ax + ay*ay;
    const l1 = bx*bx + by*by;
    return l0 >= l1;
  }

  /**
   * @returns {object} a serialised copy of this vectors's components
   */
  public serialiseObject(): Vec2Obj {
    return { x: this[0], y: this[1] };
  }

  /**
   * @desc constructs a copy of this vector
   *
   * @returns {Vec2} a copy of this vector
   */
  public clone(): Vec2 {
    return new Vec2(this[0], this[1]);
  }

  /**
   * @desc copies the components of a vector in-place
   *
   * @param {Vec2Like} vec some vector representation
   *
   * @returns {this} the in-place updated vector
   */
  public copy(vec: Vec2Like): this {
    this[0] = vec[0];
    this[1] = vec[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param epsSq
   *
   * @returns
   */
  public isZero(epsSq: number = Const.EPSILON): boolean {
    return this[0]*this[0] + this[1]*this[1] <= epsSq;
  }

  /**
   *
   * @param epsSq
   *
   * @returns
   */
  public isNormalised(epsSq: number = Const.EPSILON): boolean {
    return Math.abs((this[0]*this[0] + this[1]*this[1]) - 1) <= epsSq;
  }

  /**
   *
   * @returns
   */
  public isNaN(): boolean {
    return Number.isNaN(this[0]) || Number.isNaN(this[1]);
  }

  /**
   *
   * @returns
   */
  public isFinite(): boolean {
    return Number.isFinite(this[0]) && Number.isFinite(this[1]);
  }

  /**
   *
   * @param vec
   * @param epsSq
   *
   * @returns
   */
  public isPerpendicular(vec: Vec2Like, epsSq: number = Const.EPSILON): boolean {
    const d = this[0]*vec[0] + this[1]*vec[1];
    return d*d <= epsSq * (this[0]*this[0] + this[1]*this[1]) * (vec[0]*vec[0] + vec[1]*vec[1]);
  }

  /**
   *
   * @returns
   */
  public isAbsolute(): boolean {
    return this[0] >= 0 && this[1] >= 0;
  }

  /**
   *
   * @param args
   *
   * @returns
   */
  public set(...args: number[]): this {
    this[0] = args?.[0] ?? this[0];
    this[1] = args?.[1] ?? this[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param scalar
   *
   * @returns
   */
  public setX(scalar: number): this {
    this[0] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param scalar
   *
   * @returns
   */
  public setY(scalar: number): this {
    this[1] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param index
   *
   * @returns
   */
  public getComponent(index: number): number {
    switch (index) {
      case 0:
        return this[0];

      case 1:
        return this[1];

      default:
        throw new ExplorerError({
          msg: `Failed to GET component as Index<value: ${index}> is out of range`,
          code: ExplorerError.Errors.InvalidArgument,
        })
    }
  }

  /**
   *
   * @param index
   * @param scalar
   *
   * @returns
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

      default:
        throw new ExplorerError({
          msg: `Failed to SET component as Index<value: ${index}> is out of range`,
          code: ExplorerError.Errors.InvalidArgument,
        })
    }

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
    if (arr.length - offset < 2) {
      const rem = arr.length - offset;
      throw new ExplorerError({
        msg: `Expected remaining length of at least 2 elements but got Res<remainder: ${rem}, offset: ${offset}>`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    this[0] = arr[offset + 0];
    this[1] = arr[offset + 1];
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
      return this;
    }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public add(vec: Vec2Like): this {
    this[0] += vec[0];
    this[1] += vec[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param scalar
   *
   * @returns
   */
  public addScalar(scalar: number): this {
    this[0] += scalar;
    this[1] += scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param v0
   * @param v1
   *
   * @returns
   */
  public addVectors(v0: Vec2Like, v1: Vec2Like): this {
    this[0] = v0[0] + v1[0];
    this[1] = v0[1] + v1[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param vec
   * @param scale
   *
   * @returns
   */
  public addScaledVector(vec: Vec2Like, scale: number): this {
    this[0] += vec[0]*scale;
    this[1] += vec[1]*scale;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public sub(vec: Vec2Like): this {
    this[0] -= vec[0];
    this[1] -= vec[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param scalar
   *
   * @returns
   */
  public subScalar(scalar: number): this {
    this[0] -= scalar;
    this[1] -= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param v0
   * @param v1
   *
   * @returns
   */
  public subVectors(v0: Vec2Like, v1: Vec2Like): this {
    this[0] = v0[0] - v1[0];
    this[1] = v0[1] - v1[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param vec
   * @param scale
   *
   * @returns
   */
  public subScaledVector(vec: Vec2Like, scale: number): this {
    this[0] -= vec[0]*scale;
    this[1] -= vec[1]*scale;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public mul(vec: Vec2Like): this {
    this[0] *= vec[0];
    this[1] *= vec[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param scalar
   *
   * @returns
   */
  public mulScalar(scalar: number): this {
    this[0] *= scalar;
    this[1] *= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param v0
   * @param v1
   *
   * @returns
   */
  public mulVectors(v0: Vec2Like, v1: Vec2Like): this {
    this[0] = v0[0]*v1[0];
    this[1] = v0[1]*v1[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public div(vec: Vec2Like): this {
    this[0] /= vec[0];
    this[1] /= vec[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param scalar
   *
   * @returns
   */
  public divScalar(scalar: number): this {
    scalar = 1 / scalar;
    this[0] *= scalar;
    this[1] *= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param v0
   * @param v1
   *
   * @returns
   */
  public divVectors(v0: Vec2Like, v1: Vec2Like): this {
    this[0] = v0[0] / v1[0];
    this[1] = v0[1] / v1[1];
    this.handleOnChanged();
    return this;
  }

  /**
   * @note **IMPORTANT:** expects Mat4
   *
   * @param {Mat3Like} mat some Mat3-like obj
   *
   * @returns {this} in-place transformation of this vec
   */
  public applyMat3(mat: Mat3Like): this {
    this[0] = mat[0]*this[0] + mat[3]*this[1];
    this[1] = mat[1]*this[0] + mat[4]*this[1];
    this.handleOnChanged();
    return this;
  }

  /**
   * @note **IMPORTANT:** expects Mat4
   *
   * @param {Mat4Like} mat column-ordered Mat4-like object describing translation, rotation & scale
   *
   * @returns {this} vector transformed by some Mat4 in-place
   */
  public applyMat4(mat: Mat4Like): this {
    const x = this[0], y = this[1], z = 0;

		const w = 1 / (mat[3]*x + mat[7]*y + mat[11]*z + mat[15]);
		this[0] = (mat[ 0]*x + mat[ 4]*y + mat[ 8]*z + mat[12])*w;
		this[1] = (mat[ 1]*x + mat[ 5]*y + mat[ 9]*z + mat[13])*w;
    this.handleOnChanged();
    return this;
  }

  /**
   * @note **IMPORTANT:** expects Mat4
   *
   * @param {Mat4Like} mat column-ordered Mat4-like object describing translation, rotation & scale
   *
   * @returns {this} in-place transformation of this vec
   */
  public applyMat4Dir(mat: Mat4Like): this {
    const x = this[0], y = this[1], z = 0;

		const w = 1 / (mat[3]*x + mat[7]*y + mat[11]*z);
		this[0] = (mat[ 0]*x + mat[ 4]*y + mat[ 8]*z)*w;
		this[1] = (mat[ 1]*x + mat[ 5]*y + mat[ 9]*z)*w;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public polarCoordinates(): this {
    const x = this[0];
    const y = this[1];

    const r = Math.sqrt(x*x + y*y);
    if (r > Const.EPSILON) {
      this[0] = Math.atan2(y, x)
      this[1] = r;
    } else {
      this[0] = 0;
      this[1] = 0;
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set the vector using polar coordinates
   *
   * @param {number} radius radius of the circle
   * @param {number} theta  angle of the vector
   * @param {number} [cx=0] optionally specify the x position of the circle's centre
   * @param {number} [cy=0] optionally specify the y position of the circle's centre
   *
   * @returns {this} in-place polar coord vec
   */
  public setFromPolarCoordinates(radius: number, theta: number, cx: number = 0, cy: number = 0): this {
    this[0] = cx + Math.cos(theta)*radius;
    this[1] = cy + Math.sin(theta)*radius;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc random point on circle
   *
   * @param {number} [minRadius=0]        optionally specify the lower bounds of circle's radius
   * @param {number} [maxRadius=1]        optionally specify the upper bounds of circle's radius
   * @param {number} [minTheta=0]         optionally specify the lower bounds of the vector angle
   * @param {number} [maxTheta=Const.TAU] optionally specify the upper bounds of the vector angle
   * @param {number} [cx=0]               optionally specify the x position of the circle's centre
   * @param {number} [cy=0]               optionally specify the y position of the circle's centre
   *
   * @returns {this} in-place random circle point
   */
  public randomCircle(
    minRadius: number = 0,
    maxRadius: number = 1,
    minTheta: number = 0,
    maxTheta: number = Const.TAU,
    cx: number = 0,
    cy: number = 0
  ): this {
    const theta = minTheta == maxTheta ? minTheta : NumberUtils.randomFloat(minTheta, maxTheta);
    const radius = minRadius === maxRadius ? minRadius : NumberUtils.randomFloat(minRadius, maxRadius);
    this[0] = cx + Math.cos(theta)*radius;
    this[1] = cy + Math.sin(theta)*radius;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param i index of the x component
   * @param j index of the y component
   *
   * @returns {this} in-place swizzle of this object
   */
  public swizzle(i: number, j: number): this {
    this[0] = this.getComponent(i);
    this[1] = this.getComponent(j);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param i index of the x component
   * @param j index of the y component
   *
   * @returns {Vec2} a swizzled copy of this object
   */
  public getSwizzled(i: number, j: number): Vec2 {
    return new Vec2(this.getComponent(i), this.getComponent(j));
  }

  /**
   * @returns {this} in-place negation of this object
   */
  public negateX(): this {
    this[0] = -this[0];
    this.handleOnChanged();
    return this
  }

  /**
   * @returns {this} in-place negation of this object
   */
  public negateY(): this {
    this[1] = -this[1];
    this.handleOnChanged();
    return this
  }

  /**
   * @returns {this} in-place negation of this object
   */
  public negate(): this {
    this[0] = -this[0];
    this[1] = -this[1];
    this.handleOnChanged();
    return this
  }

  /**
   * @returns {this} a negated copy of this object
   */
  public getNegated(): Vec2 {
    return new Vec2(-this[0], -this[1]);
  }

  /**
   *
   * @returns
   */
  public reciprocal(): this {
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public getReciprocal(): Vec2 {
    return new Vec2(1 / this[0], 1 / this[1]);
  }

  /**
   *
   * @returns
   */
  public magnitude(): number {
    return Math.sqrt(this[0]*this[0] + this[1]*this[1]);
  }

  /**
   *
   * @returns
   */
  public magnitudeSq(): number {
    return this[0]*this[0] + this[1]*this[1];
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public distance(vec: Vec2Like): number {
    const dx = this[0] - vec[0];
    const dy = this[1] - vec[1];
    return Math.sqrt(dx*dx + dy*dy);
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public distanceSq(vec: Vec2Like): number {
    const dx = this[0] - vec[0];
    const dy = this[1] - vec[1];
    return dx*dx + dy*dy;
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public dot(vec: Vec2Like): number {
    return this[0]*vec[0] + this[1]*vec[1];
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public cross(vec: Vec2Like): number {
    return this[0]*vec[1] - this[1]*vec[0];
  }

  /**
   *
   * @param epsSq
   *
   * @returns
   */
  public normalise(epsSq: number = Const.EPSILON): this {
    let d = this[0]*this[0] + this[1]*this[1];
    if (Math.abs(d - 1) > epsSq) {
      d = 1 / Math.sqrt(d);
      this[0] *= d;
      this[1] *= d;
      this.handleOnChanged();
    }

    return this;
  }

  /**
   *
   * @param epsSq
   *
   * @returns
   */
  public getNormalised(epsSq: number = Const.EPSILON): Vec2 {
    let d = this[0]*this[0] + this[1]*this[1];
    if (Math.abs(d - 1) > epsSq) {
      d = 1 / Math.sqrt(d);
      return new Vec2(this[0]*d, this[1]*d);
    }

    return new Vec2(this[0], this[1]);
  }

  /**
   *
   * @returns
   */
  public perpendicular(): this {
    const tmp = this[0];
    this[0] = -this[1];
    this[1] = tmp;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public getPerpendicular(): Vec2 {
    return new Vec2(-this[1], this[0]);
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public perpendicularDot(vec: Vec2Like): number {
    return this[0]*vec[1] - this[1]*vec[0];
  }

  /**
   *
   * @param min
   *
   * @returns
   */
  public min(min: Vec2Like): this {
    this[0] = Math.min(this[0], min[0]);
    this[1] = Math.min(this[1], min[1]);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param min
   *
   * @returns
   */
  public minScalar(min: number): this {
    this[0] = Math.min(this[0], min);
    this[1] = Math.min(this[1], min);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param max
   *
   * @returns
   */
  public max(max: Vec2Like): this {
    this[0] = Math.max(this[0], max[0]);
    this[1] = Math.max(this[1], max[1]);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param max
   *
   * @returns
   */
  public maxScalar(max: number): this {
    this[0] = Math.max(this[0], max);
    this[1] = Math.max(this[1], max);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public clamp01(): this {
    this[0] = NumberUtils.clamp(this[0], 0, 1);
    this[1] = NumberUtils.clamp(this[1], 0, 1);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param floor
   * @param ceil
   *
   * @returns
   */
  public clamp(floor: Vec2Like, ceil: Vec2Like): this {
    this[0] = NumberUtils.clamp(this[0], floor[0], ceil[0]);
    this[1] = NumberUtils.clamp(this[1], floor[1], ceil[1]);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param floor
   * @param ceil
   *
   * @returns
   */
  public clampScalar(floor: number, ceil: number): this {
    this[0] = NumberUtils.clamp(this[0], floor, ceil);
    this[1] = NumberUtils.clamp(this[1], floor, ceil);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param min
   * @param max
   *
   * @returns
   */
  public clampMagnitude(min: number, max: number): this {
    const len = Math.sqrt(this[0]*this[0] + this[1]*this[1]);
    const dis = (1 / (len || 1))*NumberUtils.clamp(len, min, max);
    this[0] = this[0]*dis;
    this[1] = this[1]*dis;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public floor(): this {
    this[0] = Math.floor(this[0]);
    this[1] = Math.floor(this[1]);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public ceil(): this {
    this[0] = Math.ceil(this[0]);
    this[1] = Math.ceil(this[1]);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public round(): this {
    this[0] = Math.round(this[0]);
    this[1] = Math.round(this[1]);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public truncate(): this {
    this[0] = Math.trunc(this[0]);
    this[1] = Math.trunc(this[1]);
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param precision
   *
   * @returns
   */
  public roundTo(precision: number): this {
    this[0] = NumberUtils.round(this[0], precision);
    this[1] = NumberUtils.round(this[1], precision);
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc linearly interpole between this & vec
   *
   * @param {Vec2Like} vec          the target vec
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {this} this vec interpolated in-place
   */
  public lerp(vec: Vec2Like, alpha: number, clamp: boolean = true): this {
    if (clamp) {
      alpha = NumberUtils.clamp(alpha, 0, 1);
    }

    this[0] = this[0] + (vec[0] - this[0])*alpha;
    this[1] = this[1] + (vec[1] - this[1])*alpha;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc linearly interpole between v0 & v1
   *
   * @param {Vec2Like} v0           the source vec
   * @param {Vec2Like} v1           the target vec
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {this} this vec interpolated in-place
   */
  public lerpVectors(v0: Vec2Like, v1: Vec2Like, alpha: number, clamp: boolean = true): this {
    if (clamp) {
      alpha = NumberUtils.clamp(alpha, 0, 1);
    }

    this[0] = v0[0] + (v1[0] - v0[0])*alpha;
    this[1] = v0[1] + (v1[1] - v0[1])*alpha;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param normal
   *
   * @returns
   */
  public projectTo(normal: Vec2Like): this {
    const d = this[0]*normal[0] + this[1]*normal[1];
    const l = 1 / (normal[0]*normal[0] + normal[1]*normal[1]);
    this[0] = normal[0]*d*l;
    this[1] = normal[1]*d*l;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param normal
   *
   * @returns
   */
  public projectToNormal(normal: Vec2Like): this {
    const d = this[0]*normal[0] + this[1]*normal[1];
    this[0] = normal[0]*d;
    this[1] = normal[1]*d;
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @param normal
   *
   * @returns
   */
  public reflect(normal: Vec2Like): this {
    const d = this[0]*normal[0] + this[1]*normal[1];
    this[0] = 2*(normal[0]*d) - this[0];
    this[1] = 2*(normal[1]*d) - this[1];
    this.handleOnChanged();
    return this;
  }

  /**
   *
   * @returns
   */
  public lookAngle(): number {
    return Math.atan2(this[1], this[0]);
  }

  /**
   *
   * @param vec
   *
   * @returns
   *
   */
  public angleBetween(vec: Vec2Like): number {
    const d = Math.sqrt((this[0]*this[0] + this[1]*this[1]) * (vec[0]*vec[0] + vec[1]*vec[1]));
    if (d < Const.EPSILON) {
      return Const.PI_HALF;
    }

    return Math.acos(NumberUtils.clamp((this[0]*vec[0] + this[1]*vec[1]) / d, -1, 1));
  }

  /**
   *
   * @param vec
   *
   * @returns
   */
  public signedAngleBetween(vec: Vec2Like): number {
    let d = Math.sqrt((this[0]*this[0] + this[1]*this[1]) * (vec[0]*vec[0] + vec[1]*vec[1]));
    if (d <= Const.EPSILON) {
      return Const.PI_HALF;
    }

    d = Math.acos(NumberUtils.clamp((this[0]*vec[0] + this[1]*vec[1]) / d, -1, 1));
    return d*((this[0]*vec[1] - this[1]*vec[0]) >= 0 ? 1 : -1);
  }

  /**
   *
   * @param vec
   * @param delta
   *
   * @returns
   */
  public rotateAround(vec: Vec2Like, delta: number): this {
    const cos = Math.cos(delta),
          sin = Math.sin(delta);

    const dx = this[0] - vec[0];
    const dy = this[1] - vec[1];
    this[0] = dx*cos - dy*sin + vec[0];
    this[1] = dx*cos + dy*sin + vec[1];
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
