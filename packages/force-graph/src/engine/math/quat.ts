import * as NumberUtils from './number';

import { MatLike } from './mat4';
import { Vec3, Vec3Like } from './vec3';
import { Const, Signal, ExplorerError } from '@engine/common';

/**
 * @desc A quaternion-like object containing `x`, `y`, `z` and `w` components
 */
export type QuatLike = Quat | ArrayOf<'at least', 4, number> | (Float32Array & { length: 4 });

/**
 * @desc a Quat serialised to a dict
 */
export interface QuatObj {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Class representing a {@link https://en.wikipedia.org/wiki/Quaternion|Quaternion}
 *
 * @class
 * @constructor
 * @extends Array
 */
// prettier-ignore
export class Quat extends Array<number> {
  /**
   * @desc this class' type name
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Quat.name;

  /**
   * @desc changed event dispatcher
   * @type {Signal}
   * @protected
   */
  protected _changedSignal?: Signal;

  /**
   * @desc constructs a {@link Quat} instance
   * @param {number} [x=0] specifies the x component of this quaternion
   * @param {number} [y=0] specifies the y component of this quaternion
   * @param {number} [z=0] specifies the y component of this quaternion
   * @param {number} [w=0] specifies the w component of this quaternion
   */
  public constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    super(4);

    this[0] = x,
    this[1] = y,
    this[2] = z,
    this[3] = w;

    return this;
  }

  /**
   * @desc {@link Quat} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Quat} specifying whether the input is a {@link Quat}
   */
  public static Is(obj: unknown): obj is Quat {
    return Array.isArray(obj)
      && 'isA' in obj
      && (typeof obj.isA === 'function' && obj.isA.length === 1)
      && obj.isA(Quat.ClassName);
  }

  /**
   * @desc construct a quat from an array of components
   * @static
   *
   * @param {number[]} arr      some numeric array describing the x, y, z & w components
   * @param {number}   [offset] optionally specify the array offset
   *
   * @returns {Quat} the constructed quat
   */
  public static FromArray(arr: Array<number>, offset: number = 0): Quat {
    if (arr.length - offset < 4) {
      const rem = arr.length - offset;
      throw new ExplorerError({
        msg: `Expected remaining length of at least 4 elements but got Res<remainder: ${rem}, offset: ${offset}>`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    return new Quat(
      arr[offset + 0],
      arr[offset + 1],
      arr[offset + 2],
      arr[offset + 3]
    );
  }

  /**
   * @desc construct a quaternion from a Vec3 and an optional w component
   * @static
   *
   * @param {Vec3Like} vec some {@link Vec3Like} object describing the x, y, z components
   * @param {number}   [w] optionally specify w component
   *
   * @returns {Quat} the constructed quat
   */
  public static FromVec3(vec: Vec3Like, w: number = 0): Quat {
    return new Quat(vec[0], vec[1], vec[2], w);
  }

  /**
   * @desc construct a quaternion from the rotation part of a matrix
   * @note accepts any MatLike object where the first 10 components describe the orientation, e.g. Mat3/Mat4
   * @static
   *
   * @param {MatLike} mat some Mat3/Mat4-like object
   *
   * @returns {Quat} the constructed quat
   */
  public static FromMat(mat: MatLike): Quat {
    return new Quat().setFromMat(mat);
  }

  /**
   * @desc construct a new quaternion that rotates about the positive X axis by the given angle
   * @static
   *
   * @param {number} angle some rotation angle
   *
   * @returns {Quat} the constructed quat
   */
  public static RotateX(angle: number): Quat {
    return new Quat().rotateX(angle);
  }

  /**
   * @desc construct a new quaternion that rotates about the positive Y axis by the given angle
   * @static
   *
   * @param {number} angle some rotation angle
   *
   * @returns {Quat} the constructed quat
   */
  public static RotateY(angle: number): Quat {
    return new Quat().rotateY(angle);
  }

  /**
   * @desc construct a new quaternion that rotates about the positive Z axis by the given angle
   * @static
   *
   * @param {number} angle some rotation angle
   *
   * @returns {Quat} the constructed quat
   */
  public static RotateZ(angle: number): Quat {
    return new Quat().rotateZ(angle);
  }

  /**
   * @desc constructs a quaternion from an axis of rotation and an angle
   * @note this method will normalise the axis of rotation
   * @static
   *
   * @param {Vec3Like} axis  some axis of rotation
   * @param {number}   angle some rotation angle
   *
   * @returns {Quat} the constructed quat
   */
  public static FromAxisAngle(axis: Vec3Like, angle: number): Quat {
    let x = axis[0], y = axis[1], z = axis[2];
    let d = x*x + y*y + z*z;
    if (Math.abs(d - 1) > Const.EPSILON) {
      d = 1 / Math.sqrt(d);
      x *= d;
      y *= d;
      z *= d;
    }


    const h = angle*0.5;
    const s = Math.sin(h);
    return new Quat(x*s, y*s, z*s, Math.cos(h));
  }

  /**
   * @desc instantiate a quaternion from the local forward, up and right vectors of some imaginary rotation matrix
   * @note assumes all vectors are normalised
   * @static
   *
   * @param {Vec3Like} v0   right vector
   * @param {Vec3Like} v1   up vector
   * @param {Vec3Like} [v2] optionally specify the
   *
   * @returns {Quat} the resulting quaternion
   */
  public static FromVectors<T extends Vec3Like>(v0: T, v1: T, v2?: T): Quat {
    return new Quat().setFromVectors(v0, v1, v2);
  }

  /**
   * @desc construct a new quat by linearly interpolating between q0 & q1
   * @static
   *
   * @param {QuatLike} q0           the source quat
   * @param {QuatLike} q1           the target quat
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {Quat} the newly constructed quat
   */
  public static Lerp(q0: QuatLike, q1: QuatLike, alpha: number, clamp: boolean = true): Quat {
    return new Quat().lerpQuaternions(q0, q1, alpha, clamp);
  }

  /**
   * @desc construct a new quat by interpolating along the great circle arc between q0 & q1
   * @static
   *
   * @param {QuatLike} q0           the source quat
   * @param {QuatLike} q1           the target quat
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {Quat} the newly constructed quat
   */
  public static Slerp(q0: QuatLike, q1: QuatLike, alpha: number, clamp: boolean = true): Quat {
    return new Quat().slerpQuaternions(q0, q1, alpha, clamp);
  }

  /**
   * @desc returns the minimal delta rotation from q0 to q1
   * @static
   *
   * @param {QuatLike} q0 some source quaternion
   * @param {QuatLike} q1 some target quaternion
   *
   * @returns {Quat} the delta quaternion
   */
  public static Difference(q0: QuatLike, q1: QuatLike): Quat {
    let ax = q0[0], ay = q0[1], az = q0[2], aw = q0[3];
    let bx = q1[0], by = q1[1], bz = q1[2], bw = q1[3];

    let l = ax*ax + ay*ay + az*az + aw*aw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      ax *= l;
      ay *= l;
      az *= l;
      aw *= l;
    }

    l = bx*bx + by*by + bz*bz + bw*bw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      bx *= l;
      by *= l;
      bz *= l;
      bw *= l;
    }

    if ((ax*bx + ay*by + az*bz + aw*bw) < Const.EPSILON) {
      ax = -ax;
      ay = -ay;
      az = -az;
      aw = -aw;
    }

    ax = -ax;
    ay = -ay;
    az = -az;

    return new Quat(
      aw*bx + ax*bw + ay*bz - az*by,
      aw*by - ax*bz + ay*bw + az*bx,
      aw*bz + ax*by - ay*bx + az*bw,
      aw*bw - ax*bx - ay*by - az*bz
    );
  }

  /**
   * @desc constructs a quat that rotates some directional vector to coincide with the target direction
   *       with respect to some world up vector
   * @note from describes the eye position, target describes the source, up vector will be normalised
   * @static
   *
   * @param {Vec3Like} from         some source position
   * @param {Vec3Like} to           some target position
   * @param {Vec3Like} [up=[0,1,0]] the world up vector; defaults to `[0, 1, 0]`
   *
   * @returns {Quat} the resulting quaternion
   */
  public static LookAt(from: Vec3Like, to: Vec3Like, up: Vec3Like = [0, 1, 0]): Quat {
    return new Quat().lookAt(from, to, up);
  }

  /**
   * @param {QuatLike} q0 some source quat
   * @param {QuatLike} q1 some target quat
   * @static
   *
   * @returns {Quat} rotation from this quat to the target
   */
  public static RotationBetween(q0: QuatLike, q1: QuatLike): Quat {
    return new Quat(q0[0], q0[1], q0[2], q0[3]).rotationBetween(q1);
  }

  /**
   * @desc constructs a quaternion that rotates some directional vector to coincide with the target direction
   * @note assumes world-space vector; both will be normalised
   * @static
   *
   * @param {Vec3Like} v0 some source direction
   * @param {Vec3Like} v1 some target direction
   *
   * @returns {Quat} the resulting quaternion
   */
  public static RotateFromTo(v0: Vec3Like, v1: Vec3Like): Quat {
    return new Quat().rotateFromTo(v0, v1);
  }

  /**
   * @static
   *
   * @returns {Quat} an identity quat
   */
  public static Identity(): Quat {
    return new Quat(0, 0, 0, 1);
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Quat';
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
    return this[3];
  }

  /**
   * @desc w component getter
   * @type {number}
   * @public
   */
  public get w(): number {
    return this[3];
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
   * @desc z component setter
   * @type {number}
   * @public
   */
  public set w(w: number) {
    this[3] = w;
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
    return `${this.ClassName}<x: ${this[0]}, y: ${this[1]}, z: ${this[2]}, w: ${this[3]}>`;
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
    return `vec4(${this[0]}, ${this[1]}, ${this[2]}, ${this[3]})`;
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
   * @param {QuatLike} quat some object to compare
   *
   * @returns {boolean} evaluates to `true` if the object are exactly equal
   */
  public equals(quat: QuatLike): boolean {
    return this[0] === quat[0] && this[1] === quat[1] && this[2] === quat[2] && this[3] === quat[3];
  }

  /**
   * @desc tests approximate equality
   *
   * @param {QuatLike} quat       some quat representation
   * @param {number}   [eps=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if the object is approximately equal
   */
  public approximately(quat: QuatLike, eps?: number): boolean {
    return (
      NumberUtils.approximately(this[0], quat[0], eps) &&
      NumberUtils.approximately(this[1], quat[1], eps) &&
      NumberUtils.approximately(this[2], quat[2], eps) &&
      NumberUtils.approximately(this[3], quat[3], eps)
    );
  }

  /**
   * @desc less than comparison
   *
   * @param {QuatLike} quat some quat to compare
   *
   * @returns {boolean} evaluates to `true` if this quat is less than the comparator
   */
  public ltComp(quat: QuatLike): boolean {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];
    const bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];
    const l0 = ax*ax + ay*ay + az*az + aw*aw;
    const l1 = bx*bx + by*by + bz*bz + bw*bw;
    return l0 < l1;
  }

  /**
   * @desc less than or equal to comparison
   *
   * @param {QuatLike} quat some quat to compare
   *
   * @returns {boolean} evaluates to `true` if this quat is less than or equal to the comparator
   */
  public lteComp(quat: QuatLike): boolean {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];
    const bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];
    const l0 = ax*ax + ay*ay + az*az + aw*aw;
    const l1 = bx*bx + by*by + bz*bz + bw*bw;
    return l0 <= l1;
  }

  /**
   * @desc greater than comparison
   *
   * @param {QuatLike} quat some quat to compare
   *
   * @returns {boolean} evaluates to `true` if this quat is greater than the comparator
   */
  public gtComp(quat: QuatLike): boolean {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];
    const bx = quat[0], by = quat[1], bz =  quat[2], bw = quat[3];
    const l0 = ax*ax + ay*ay + az*az + aw*aw;
    const l1 = bx*bx + by*by + bz*bz + bw*bw;
    return l0 > l1;
  }

  /**
   * @desc greater than or equal to comparison
   *
   * @param {QuatLike} quat some quat to compare
   *
   * @returns {boolean} evaluates to `true` if this quat is greater than or equal to the comparator
   */
  public gteComp(quat: QuatLike): boolean {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];
    const bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];
    const l0 = ax*ax + ay*ay + az*az + aw*aw;
    const l1 = bx*bx + by*by + bz*bz + bw*bw;
    return l0 >= l1;
  }

  /**
   * @note this method does not normalise the quaternion
   *
   * @returns {object} a serialised copy of this quaternion's components
   */
  public serialise(): QuatObj {
    return { x: this[0], y: this[1], z: this[2], w: this[3] };
  }

  /**
   * @desc constructs a copy of this quaternion
   *
   * @returns {Quat} a copy of this quat
   */
  public clone(): Quat {
    return new Quat(this[0], this[1], this[2], this[3]);
  }

  /**
   * @desc copies the components of a quaternion in-place
   *
   * @param {QuatLike} quat some quat representation
   *
   * @returns {this} the in-place updated quat
   */
  public copy(quat: QuatLike): this {
    this[0] = quat[0];
    this[1] = quat[1];
    this[2] = quat[2];
    this[3] = quat[3];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} [epsSq=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if euclidean length is approx. `0`
   */
  public isZero(epsSq: number = Const.EPSILON): boolean {
    return this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3] <= epsSq;
  }

  /**
   * @param {number} [epsSq=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if the euclidean length of this quat is approx. `1`
   */
  public isNormalised(epsSq: number = Const.EPSILON): boolean {
    return Math.abs((this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3]) - 1) <= epsSq;
  }

  /**
   * @returns {boolean} evaluates to `true` if any of components are NaN
   */
  public isNaN(): boolean {
    return (
      Number.isNaN(this[0]) ||
      Number.isNaN(this[1]) ||
      Number.isNaN(this[2]) ||
      Number.isNaN(this[3])
    );
  }

  /**
   * @returns {boolean} evaluates to `true` if all components are finite
   */
  public isFinite(): boolean {
    return (
      Number.isFinite(this[0]) &&
      Number.isFinite(this[1]) &&
      Number.isFinite(this[2]) &&
      Number.isFinite(this[3])
    );
  }

  /**
   * @param {number} [epsSq=1e-6] square epsilon value
   *
   * @returns {boolean} evaluates to `true` if another quaternion could
   *                    exist, that when multiplied together, would share
   *                    equality with the identity quaternion
   */
  public isInvertible(epsSq: number = Const.EPSILON): boolean {
    return this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3] > epsSq && this.isFinite();
  }

  /**
   * @desc set this quat's components
   *
   * @param args variadic arguments
   * @param {number} [args.0] optionally specify the x component; defaults to current x value
   * @param {number} [args.1] optionally specify the y component; defaults to current y value
   * @param {number} [args.2] optionally specify the z component; defaults to current z value
   * @param {number} [args.3] optionally specify the w component; defaults to current w value
   *
   * @returns {this} this quat after its components have been set according to the given args
   */
  public set(...args: number[]): this {
    this[0] = args?.[0] ?? this[0];
    this[1] = args?.[1] ?? this[1];
    this[2] = args?.[2] ?? this[2];
    this[3] = args?.[3] ?? this[3];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc update the x component of this quat
   *
   * @param {number} scalar some numeric value
   *
   * @returns {this} this quat after being updated in-place
   */
  public setX(scalar: number): this {
    this[0] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc update the y component of this quat
   *
   * @param {number} scalar some numeric value
   *
   * @returns {this} this quat after being updated in-place
   */
  public setY(scalar: number): this {
    this[1] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc update the z component of this quat
   *
   * @param {number} scalar some numeric value
   *
   * @returns {this} this quat after being updated in-place
   */
  public setZ(scalar: number): this {
    this[2] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc update the w component of this quat
   *
   * @param {number} scalar some numeric value
   *
   * @returns {this} this quat after being updated in-place
   */
  public setW(scalar: number): this {
    this[3] = scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc get a component from this quat at some index, _i.e._ x = 0, y = 1, z = 2, w = 3
   *
   * @param {number} index the component index
   *
   * @returns {number} this quat's component value
   */
  public getComponent(index: number): number {
    switch (index) {
      case 0:
        return this[0];

      case 1:
        return this[1];

      case 2:
        return this[2];

      case 3:
        return this[3];

      default:
        throw new ExplorerError({
          msg: `Failed to GET component as Index<value: ${index}> is out of range`,
          code: ExplorerError.Errors.InvalidArgument,
        })
    }
  }

  /**
   * @desc set a component from this quat at some index, _i.e._ x = 0, y = 1, z = 2, w = 3, to some specified value
   *
   * @param {number} index  the component index
   * @param {number} scalar some scalar value
   *
   * @returns {this} this quat after being updated in-place
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

      case 3:
        this[3] = scalar;
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
   * @desc set a quat from an array of components
   * @param {number[]} arr      some numeric array describing the x, y, z & w components
   * @param {number}   [offset] optionally specify the array offset
   *
   * @returns {this} an in-place quat set to the given components
   */
  public setFromArray(arr: Array<number>, offset: number = 0): this {
    if (arr.length - offset < 4) {
      const rem = arr.length - offset;
      throw new ExplorerError({
        msg: `Expected remaining length of at least 4 elements but got Res<remainder: ${rem}, offset: ${offset}>`,
        code: ExplorerError.Errors.InvalidArgument,
      });
    }

    this[0] = arr[offset + 0];
    this[1] = arr[offset + 1];
    this[2] = arr[offset + 2];
    this[3] = arr[offset + 3];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc serialise a quaternion into an array
   *
   * @param {number[]} [arr]    optionally specify the array in which to emplace the components
   * @param {number}   [offset] optionally specify the array offset
   *
   * @returns {number[]} an array with this quat's components emplaced within it
   */
  public toArray(arr?: Array<number>, offset: number = 0): Array<number> {
    if (!arr) {
      arr = [];
    }

    arr[offset + 0] = this[0];
    arr[offset + 1] = this[1];
    arr[offset + 2] = this[2];
    arr[offset + 3] = this[3];
    return arr;
  }

  /**
   * @desc set from the local forward, up and right vectors of some imaginary rotation matrix
   * @note assumes all vectors are normalised
   *
   * @param {Vec3Like} v0   right vector
   * @param {Vec3Like} v1   up vector
   * @param {Vec3Like} [v2] optionally specify the
   *
   * @returns {this} the resulting quaternion updated in-place
   */
  public setFromVectors<T extends Vec3Like>(v0: T, v1: T, v2?: T): this {
    let x!: number, y!: number, z!: number, w!: number, s!: number;

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

    const n = m00 + m11 + m22;
    if (n > 0) {
			s = 0.5 / Math.sqrt(n + 1);
			x = (m12 - m21)*s;
			y = (m20 - m02)*s;
			z = (m01 - m10)*s;
			w = 0.25 / s;
    } else if (m00 > m11 && m00 > m22) {
			s = 2.0 * Math.sqrt(1 + m00 - m11 - m22);
			x = 0.25 * s;
			y = (m10 + m01) / s;
			z = (m20 + m02) / s;
			w = (m12 - m21) / s;
    } else if (m11 > m22) {
			s = 2.0 * Math.sqrt(1 + m11 - m00 - m22);
			x = (m10 + m01) / s;
			y = 0.25 * s;
			z = (m21 + m12) / s;
			w = (m20 - m02) / s;
    } else {
      s = 2.0 * Math.sqrt(1 + m22 - m00 - m11);
      x = (m20 + m02) / s;
      y = (m21 + m12) / s;
      z = 0.25 * s;
      w = (m01 - m10) / s;
    }

    this[0] = x;
    this[1] = y;
    this[2] = z;
    this[3] = w;
    this.handleOnChanged();
    return this;
  }

  /**
   * @note accepts any MatLike object where the first 10 components describe the orientation, e.g. Mat3/Mat4
   *
   * @param {MatLike} mat some Mat3/Mat4-like object
   *
   * @returns {this} in-place quaternion describing the orientation of a matrix
   */
  public setFromMat(mat: MatLike): this {
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

    const n = m00 + m11 + m22;
		if (n > 0) {
			const s = 0.5 / Math.sqrt(n + 1);
			this[0] = (m12 - m21)*s;
			this[1] = (m20 - m02)*s;
			this[2] = (m01 - m10)*s;
			this[3] = 0.25 / s;
		} else if (m00 > m11 && m00 > m22) {
			const s = 2.0 * Math.sqrt(1 + m00 - m11 - m22);
			this[0] = 0.25 * s;
			this[1] = (m10 + m01) / s;
			this[2] = (m20 + m02) / s;
			this[3] = (m12 - m21) / s;
		} else if (m11 > m22) {
			const s = 2.0 * Math.sqrt(1 + m11 - m00 - m22);
			this[0] = (m10 + m01) / s;
			this[1] = 0.25 * s;
			this[2] = (m21 + m12) / s;
			this[3] = (m20 - m02) / s;
		} else {
			const s = 2.0 * Math.sqrt(1 + m22 - m00 - m11);
			this[0] = (m20 + m02) / s;
			this[1] = (m21 + m12) / s;
			this[2] = 0.25 * s;
			this[3] = (m01 - m10) / s;
		}

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc sets this quaternion from an axis of rotation and an angle
   * @note this method will normalise the axis of rotation
   *
   * @param {Vec3Like} axis  some axis of rotation
   * @param {number}   angle some rotation angle
   *
   * @returns {this} this quaternion set to some axis of rotation at some angle
   */
  public setFromAxisAngle(axis: Vec3Like, angle: number): this {
    let x = axis[0], y = axis[1], z = axis[2];
    let d = x*x + y*y + z*z;
    if (Math.abs(d - 1) > Const.EPSILON) {
      d = 1 / Math.sqrt(d);
      x *= d;
      y *= d;
      z *= d;
    }

    const h = angle*0.5;
    const s = Math.sin(h);
    this[0] = x*s;
    this[1] = y*s;
    this[2] = z*s;
    this[3] = Math.cos(h);
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc decomposes this quaternion into an axis angle representation
   *
   * @param {Vec3} [vec] optionally specify a {@link Vec3} to set in-place
   *
   * @returns {object} an object describing the `Vec3` axis of rotation and a rotation angle (in radians)
   */
  public toAxisAngle(vec?: Vec3): { axis: Vec3, angle: number } {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    let x = this[0], y = this[1], z = this[2], w = this[3];

    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l) < Const.EPSILON) {
      x = y = z = 0, w = 1;
    } else if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l)
      x *= l;
      y *= l;
      z *= l;
      w *= l;
    }

    let s = Math.sqrt(1 - w*w);
    if (s >= Const.EPSILON) {
      s = 1 / s;

      x *= s;
      y *= s;
      z *= s;
    } else {
      y = 1;
    }

    return { axis: vec.set(x, y, z), angle: 2*Math.acos(w) };
  }

  /**
   * @param {QuatLike} quat some quat
   *
   * @returns {this} in-place addition of this quat by the input
   */
  public add(quat: QuatLike): this {
    this[0] += quat[0];
    this[1] += quat[1];
    this[2] += quat[2];
    this[3] += quat[3];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar some numeric value
   *
   * @returns {this} the in-place result
   */
  public addScalar(scalar: number): this {
    this[0] += scalar;
    this[1] += scalar;
    this[2] += scalar;
    this[3] += scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} q0 some quat
   * @param {QuatLike} q1 some quat
   *
   * @returns {this} in-place result of q0 + q1
   */
  public addQuaternions(q0: QuatLike, q1: QuatLike): this {
    this[0] = q0[0] + q1[0];
    this[1] = q0[1] + q1[1];
    this[2] = q0[2] + q1[2];
    this[3] = q0[3] + q1[3];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc add a scaled quaternion from this object
   *
   * @param {QuatLike} quat  some quat
   * @param {number}   scale some scalar value
   *
   * @returns {this} the in-place result of q0 + q1*s
   */
  public addScaledQuaternion(quat: QuatLike, scale: number): this {
    this[0] += quat[0]*scale;
    this[1] += quat[1]*scale;
    this[2] += quat[2]*scale;
    this[3] += quat[3]*scale;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} quat some quat
   *
   * @returns {this} in-place subtraction of this quat by the input
   */
  public sub(quat: QuatLike): this {
    this[0] -= quat[0];
    this[1] -= quat[1];
    this[2] -= quat[2];
    this[3] -= quat[3];
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar some numeric value
   *
   * @returns {this} the in-place result
   */
  public subScalar(scalar: number): this {
    this[0] -= scalar;
    this[1] -= scalar;
    this[2] -= scalar;
    this[3] -= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} q0 some quat
   * @param {QuatLike} q1 some quat
   *
   * @returns {this} in-place result of q0 - q1
   */
  public subQuaternions(q0: QuatLike, q1: QuatLike): this {
    this[0] = q0[0] - q1[0];
    this[1] = q0[1] - q1[1];
    this[2] = q0[2] - q1[2];
    this[3] = q0[3] - q1[3];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc subtracted a scaled quaternion from this object
   *
   * @param {QuatLike} quat  some quat
   * @param {number}   scale some scalar value
   *
   * @returns {this} the in-place result of q0 - q1*s
   */
  public subScaledQuaternion(quat: QuatLike, scale: number): this {
    this[0] -= quat[0]*scale;
    this[1] -= quat[1]*scale;
    this[2] -= quat[2]*scale;
    this[3] -= quat[3]*scale;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} quat some quat
   *
   * @returns {this} in-place multiplication of this quat by the input, i.e. this * quat
   */
  public mul(quat: QuatLike): this {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];
    const bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];
    this[0] = aw*bx + ax*bw + ay*bz - az*by;
    this[1] = aw*by - ax*bz + ay*bw + az*bx;
    this[2] = aw*bz + ax*by - ay*bx + az*bw;
    this[3] = aw*bw - ax*bx - ay*by - az*bz;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} quat some quat
   *
   * @returns {this} in-place multiplication of this quat by the input, i.e. quat * this
   */
  public preMul(quat: QuatLike): this {
    const ax = quat[0], ay = quat[1], az = quat[2], aw = quat[3];
    const bx = this[0], by = this[1], bz = this[2], bw = this[3];
    this[0] = aw*bx + ax*bw + ay*bz - az*by;
    this[1] = aw*by - ax*bz + ay*bw + az*bx;
    this[2] = aw*bz + ax*by - ay*bx + az*bw;
    this[3] = aw*bw - ax*bx - ay*by - az*bz;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar some numeric value
   *
   * @returns {this} the in-place result
   */
  public mulScalar(scalar: number): this {
    this[0] *= scalar;
    this[1] *= scalar;
    this[2] *= scalar;
    this[3] *= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} q0 some quat
   * @param {QuatLike} q1 some quat
   *
   * @returns {this} in-place result of q0 * q1
   */
  public mulQuaternions(q0: QuatLike, q1: QuatLike): this {
    const ax = q0[0], ay = q0[1], az = q0[2], aw = q0[3];
    const bx = q1[0], by = q1[1], bz = q1[2], bw = q1[3];
    this[0] = aw*bx + ax*bw + ay*bz - az*by;
    this[1] = aw*by - ax*bz + ay*bw + az*bx;
    this[2] = aw*bz + ax*by - ay*bx + az*bw;
    this[3] = aw*bw - ax*bx - ay*by - az*bz;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} quat some quat
   *
   * @returns {this} in-place division of this quat by the input
   */
  public div(quat: QuatLike): this {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];
    const bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];
    this[0] =  ax*bw - ay*bz + az*by - aw*bx;
    this[1] =  ax*bz + ay*bw - az*bx - aw*by;
    this[2] = -ax*by + ay*bx + az*bw - aw*bz;
    this[3] =  ax*bx + ay*by + az*bz + aw*bw;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {number} scalar some numeric value
   *
   * @returns {this} the in-place result
   */
  public divScalar(scalar: number): this {
    scalar = 1 / scalar;
    this[0] *= scalar;
    this[1] *= scalar;
    this[2] *= scalar;
    this[3] *= scalar;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {QuatLike} q0 some quat
   * @param {QuatLike} q1 some quat
   *
   * @returns {this} in-place result of q0 / q1
   */
  public divQuaternions(q0: QuatLike, q1: QuatLike): this {
    const ax = q0[0], ay = q0[1], az = q0[2], aw = q0[3];
    const bx = q1[0], by = q1[1], bz = q1[2], bw = q1[3];
    this[0] =  ax*bw - ay*bz + az*by - aw*bx;
    this[1] =  ax*bz + ay*bw - az*bx - aw*by;
    this[2] = -ax*by + ay*bx + az*bw - aw*bz;
    this[3] =  ax*bx + ay*by + az*bz + aw*bw;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param {value} n some exponent
   *
   * @returns {this} in-place result of this^n
   */
  public pow(n: number): this {
    if (n == -1) {
      return this.normalisedInverse();
    }

    const x = this[0], y = this[1], z = this[2], w = this[3];
    const l = x*x + y*y + z*z + w*w;

    const mag = Math.sqrt(w*w + l);
    const lsq = Math.sqrt(l);
    const pmg = mag^n;

    if (lsq <= Const.EPSILON*mag) {
      this[0] = this[1] = this[2] = 0, this[3] = pmg;
      this.handleOnChanged();
      return this;
    }

    const iv = 1 / lsq;
    const rx = x*iv,
          ry = y*iv,
          rz = z*iv;

    const ang = n*Math.atan2(lsq, w);
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const psn = pmg*sin;

    this[0] = psn*rx;
    this[1] = psn*ry;
    this[2] = psn*rz;
    this[3] = pmg*cos;
    this.handleOnChanged();
    return this;
  }

  /**
   * @param i index of the x component
   * @param j index of the y component
   * @param k index of the z component
   * @param l index of the w component
   *
   * @returns {this} in-place swizzle of this quat
   */
  public swizzle(i: number, j: number, k: number, l: number): this {
    this[0] = this.getComponent(i);
    this[1] = this.getComponent(j);
    this[2] = this.getComponent(k);
    this[3] = this.getComponent(l);
    this.handleOnChanged();
    return this;
  }

  /**
   * @param i index of the x component
   * @param j index of the y component
   * @param k index of the z component
   * @param l index of the w component
   *
   * @returns {Quat} a swizzled copy of this quat
   */
  public getSwizzled(i: number, j: number, k: number, l: number): Quat {
    return new Quat(this.getComponent(i), this.getComponent(j), this.getComponent(k), this.getComponent(l));
  }

  /**
   * @returns {this} in-place negation of this quat
   */
  public negate(): this {
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    this[3] = -this[3];
    this.handleOnChanged();
    return this
  }

  /**
   * @returns {Quat} a negated copy of this quat
   */
  public getNegated(): Quat {
    return new Quat(-this[0], -this[1], -this[2], -this[3]);
  }

  /**
   * @returns {this} in-place logarithm of this quat
   */
  public log(): this {
    let x = this[0], y = this[1], z = this[2], w = this[3];

    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      x *= l;
      y *= l;
      z *= l;
      w *= l;
    }

    let vv = x*x + y*y + z*z;
    let mm = w*w + vv;

    if (mm < Const.EPSILON) {
      this[0] = 0;
      this[1] = 0;
      this[2] = 0;
      this[3] = -Infinity;
    } else if (vv < Const.EPSILON) {
      this[0] = 0;
      this[1] = 0;
      this[2] = 0;
      this[3] = 0.5*Math.log(mm);
    } else {
      const m = Math.sqrt(mm);
      const s = Math.acos(w / m) / Math.sqrt(vv);
      this[0] = x*s;
      this[1] = y*s;
      this[2] = z*s;
      this[3] = Math.log(m);
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @returns {Quat} a logarithmic copy of this quat
   */
  public getLog(): Quat {
    let x = this[0], y = this[1], z = this[2], w = this[3];

    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      x *= l;
      y *= l;
      z *= l;
      w *= l;
    }

    const vv = x*x + y*y + z*z;
    const mm = w*w + vv;
    if (mm < Const.EPSILON) {
      return new Quat(0, 0, 0, -Infinity);
    } else if (vv < Const.EPSILON) {
      return new Quat(0, 0, 0, 0.5*Math.log(mm));
    }

    const m = Math.sqrt(mm);
    const s = Math.acos(w / m) / Math.sqrt(vv);
    return new Quat(x*s, y*s, z*s, Math.log(m));
  }

  /**
   * @returns {number} euclidean length of this quat
   */
  public magnitude(): number {
    return Math.sqrt(this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3]);
  }

  /**
   * @returns {number} the square euclidean length of this quat
   */
  public magnitudeSq(): number {
    return this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3];
  }

  /**
   * @desc compute the geodesic distance between two quats using the
   *       logarithm map on the Riemannian manifold using this quat as
   *       the base point
   *
   * @param {QuatLike} quat some target quat
   *
   * @returns {number} the geodesic distance between two quats
   */
  public distance(quat: QuatLike): number {
    // Normalise quats
    let ax = this[0], ay = this[1], az = this[2], aw = this[3];
    let bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];

    let l = ax*ax + ay*ay + az*az + aw*aw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      ax *= l;
      ay *= l;
      az *= l;
      aw *= l;
    }

    l = bx*bx + by*by + bz*bz + bw*bw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      bx *= l;
      by *= l;
      bz *= l;
      bw *= l;
    }

    // Invert this quat
    ax = -ax;
    ay = -ay;
    az = -az;

    // Mul inv(q0) x q1 and compute the logarithmic quat
    let x = aw*bx + ax*bw + ay*bz - az*by,
        y = aw*by - ax*bz + ay*bw + az*bx,
        z = aw*bz + ax*by - ay*bx + az*bw,
        w = aw*bw - ax*bx - ay*by - az*bz;

    const vv = x*x + y*y + z*z;
    const mm = w*w + vv;
    if (mm < Const.EPSILON) {
      x = 0;
      y = 0;
      z = 0;
      w = -Infinity;
    } else if (vv < Const.EPSILON) {
      x = 0;
      y = 0;
      z = 0;
      w = 0.5*Math.log(mm);
    } else {
      const m = Math.sqrt(mm);
      const s = Math.acos(w / m) / Math.sqrt(vv);
      x = x*s;
      y = y*s;
      z = z*s;
      w = Math.log(m);
    }

    // Compute intrinsic geodesic dist
    //  -> Note that this should fall within Range<min: 0, max: 2π>
    //     for unitary quaternions
    return 2*Math.sqrt(x*x + y*y + z*z + w*w);
  }

  /**
   * @param {QuatLike} quat some input quat
   *
   * @returns {number} the dot product of this quat
   */
  public dot(quat: QuatLike): number {
    return this[0]*quat[0] + this[1]*quat[1] + this[2]*quat[2] + this[3]*quat[3]
  }

  /**
   * @desc in-place normalisation of this quat
   *
   * @returns {this} the normalised quaternion
   */
  public normalise(): this {
    let l = this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3];
    if (Math.abs(l) < Const.EPSILON) {
      return this;
    }

    l = 1 / Math.sqrt(l);
    this[0] *= l;
    this[1] *= l;
    this[2] *= l;
    this[3] *= l;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc copy of the normalised quat
   *
   * @returns {Quat} the normalised quaternion
   */
  public getNormalised(): Quat {
    let l = this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3];
    if (Math.abs(l) < Const.EPSILON) {
      return new Quat(this[0], this[1], this[2], this[3]);
    }

    l = 1 / Math.sqrt(l);
    return new Quat(this[0]*l, this[1]*l, this[2]*l, this[3]*l);
  }

  /**
   * @desc in-place conjugate of this quat
   *
   * @returns {this} the conjugated quat
   */
  public conjugate(): this {
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc conjugated copy of this quat
   *
   * @returns {Quat} the conjugated quat
   */
  public getConjugate(): Quat {
    return new Quat(-this[0], -this[1], -this[2], this[3]);
  }

  /**
   * @desc inverses a quat in-place
   * @note assumes quat is unitary & is invertible
   *
   * @returns {this} the inverted quat
   */
  public inverse(): this {
    this[0] = -this[0];
    this[1] = -this[1];
    this[2] = -this[2];
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc inverted copy of this quat
   * @note assumes quat is unitary & is invertible
   *
   * @returns {Quat} the inverted quat
   */
  public getInverted(): Quat {
    return new Quat(-this[0], -this[1], -this[2], this[3]);
  }

  /**
   * @desc inverses quat in-place, normalising if required
   *
   * @returns {this} the inverted quat
   */
  public normalisedInverse(): this {
    let x = this[0], y = this[1], z = this[2], w = this[3];
    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      x *= l;
      y *= l;
      z *= l;
      w *= l;
    }

    this[0] = -x;
    this[1] = -y;
    this[2] = -z;
    this[3] =  w;
    this.handleOnChanged();
    return this;
  }

  /**
   * @desc inverted copy of a quat, normalising if required
   *
   * @returns {Quat} the inverted quat
   */
  public getNormalisedInverse(): Quat {
    let x = this[0], y = this[1], z = this[2], w = this[3];
    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      x *= l;
      y *= l;
      z *= l;
      w *= l;
    }

    return new Quat(-x, -y, -z, w);
  }

  /**
   * @returns {number} the angle of rotation for this quat
   */
  public angle(): number {
    return 2*Math.acos(this[3]);
  }

  /**
   * @desc returns the axis of rotation for this quat
   * @note result is in radians
   *
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the resulting axis of rotation
   */
  public axis(vec?: Vec3): Vec3 {
    let x = this[0], y = this[1], z = this[2], w = this[3];
    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      x *= l;
      y *= l;
      z *= l;
      w *= l;
    }

    const rs = 1 / Math.sqrt(1 - w*w);
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    return vec.set(x*rs, y*rs, z*rs);
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the world right vector of this quaternion
   */
  public rightVector(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3(1, 0, 0);
    } else {
      vec[0] = 1;
      vec[1] = 0;
      vec[2] = 0;
    }

    return this.transformVec3(vec);
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the world up vector of this quaternion
   */
  public upVector(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3(0, 1, 0);
    } else {
      vec[0] = 0;
      vec[1] = 1;
      vec[2] = 0;
    }

    return this.transformVec3(vec);
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the world look vector (-Z) of this quaternion
   */
  public lookVector(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3(0, 0, -1);
    } else {
      vec[0] =  0;
      vec[1] =  0;
      vec[2] = -1;
    }

    return this.transformVec3(vec);
  }

  /**
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the world back vector (+Z) of this quaternion
   */
  public backVector(vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3(0, 0, 1);
    } else {
      vec[0] = 0;
      vec[1] = 0;
      vec[2] = 1;
    }

    return this.transformVec3(vec);
  }

  /**
   * @desc rotates this quaternion in-place, rotating about the positive X axis by the given angle
   *
   * @param {number} angle some angle
   *
   * @returns {this} this quaternion rotated in-place
   */
  public rotateX(angle: number): this {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];

    const h = angle*0.5;
    const s = Math.sin(h);
    const bx = 1*s,
          by = 0,
          bz = 0,
          bw = Math.cos(h);

    let x = aw*bx + ax*bw + ay*bz - az*by,
        y = aw*by - ax*bz + ay*bw + az*bx,
        z = aw*bz + ax*by - ay*bx + az*bw,
        w = aw*bw - ax*bx - ay*by - az*bz;

    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      this[0] = x*l;
      this[1] = y*l;
      this[2] = z*l;
      this[3] = w*l;
    } else {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      this[3] = w;
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc rotates this quaternion in-place, rotating about the positive Y axis by the given angle
   *
   * @param {number} angle some angle
   *
   * @returns {this} this quaternion rotated in-place
   */
  public rotateY(angle: number): this {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];

    const h = angle*0.5;
    const s = Math.sin(h);
    const bx = 0,
          by = 1*s,
          bz = 0,
          bw = Math.cos(h);

    let x = aw*bx + ax*bw + ay*bz - az*by,
        y = aw*by - ax*bz + ay*bw + az*bx,
        z = aw*bz + ax*by - ay*bx + az*bw,
        w = aw*bw - ax*bx - ay*by - az*bz;

    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      this[0] = x*l;
      this[1] = y*l;
      this[2] = z*l;
      this[3] = w*l;
    } else {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      this[3] = w;
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc rotates this quaternion in-place, rotating about the positive Z axis by the given angle
   *
   * @param {number} angle some angle
   *
   * @returns {this} this quaternion rotated in-place
   */
  public rotateZ(angle: number): this {
    const ax = this[0], ay = this[1], az = this[2], aw = this[3];

    const h = angle*0.5;
    const s = Math.sin(h);
    const bx = 0,
          by = 0,
          bz = 1*s,
          bw = Math.cos(h);

    let x = aw*bx + ax*bw + ay*bz - az*by,
        y = aw*by - ax*bz + ay*bw + az*bx,
        z = aw*bz + ax*by - ay*bx + az*bw,
        w = aw*bw - ax*bx - ay*by - az*bz;

    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      this[0] = x*l;
      this[1] = y*l;
      this[2] = z*l;
      this[3] = w*l;
    } else {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      this[3] = w;
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc rotates this quaternion in-place, rotating about the given axis by the given angle
   *
   * @param {Vec3Like} axis  some axis of rotation
   * @param {number}   angle some angle
   *
   * @returns {this} this quaternion rotated in-place
   */
  public rotateAxisAngle(axis: Vec3Like, angle: number): this {
    let x = axis[0], y = axis[1], z = axis[2], w!: number;
    let l = x*x + y*y + z*z;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      x *= l;
      y *= l;
      z *= l;
    }

    const ax = this[0], ay = this[1], az = this[2], aw = this[3];

    const h = angle*0.5;
    const s = Math.sin(h);
    const bx = axis[0]*s,
          by = axis[1]*s,
          bz = axis[2]*s,
          bw = Math.cos(h);

    x = aw*bx + ax*bw + ay*bz - az*by;
    y = aw*by - ax*bz + ay*bw + az*bx;
    z = aw*bz + ax*by - ay*bx + az*bw;
    w = aw*bw - ax*bx - ay*by - az*bz;

    l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      this[0] = x*l;
      this[1] = y*l;
      this[2] = z*l;
      this[3] = w*l;
    } else {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      this[3] = w;
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc set this quaternion from an XYZ-ordered euler rotation
   *
   * @param {Vec3Like} vec some XYZ-ordered euler rotation (in radians)
   *
   * @returns {this} in-place quat representing the euler rotation
   */
  public setFromEulerXYZ(vec: Vec3Like): this {
    const x = vec[0], y = vec[1], z = vec[2];

		const c0 = Math.cos(0.5*x);
		const c1 = Math.cos(0.5*y);
		const c2 = Math.cos(0.5*z);

		const s0 = Math.sin(0.5*x);
		const s1 = Math.sin(0.5*y);
		const s2 = Math.sin(0.5*z);

    let qx = s0*c1*c2 + c0*s1*s2,
        qy = c0*s1*c2 - s0*c1*s2,
        qz = c0*c1*s2 + s0*s1*c2,
        qw = c0*c1*c2 - s0*s1*s2;

    let l = qx*qx + qy*qy + qz*qz + qw*qw;
    if (Math.abs(l) < Const.EPSILON) {
      qx = qy = qz = 0, qw = 1;
    } else if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      qx *= l;
      qy *= l;
      qz *= l;
    }

    this[0] = qx;
    this[1] = qy;
    this[2] = qz;
    this[3] = qw;

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc extracts the rotation of this quaternion into an XYZ-ordered euler rotation (in radians)
   *
   * @returns {Vec3} a vector describing the XYZ ordered euler rotation (in radians)
   */
  public toEulerXYZ(): Vec3 {
		const x = this[0],
          y = this[1],
          z = this[2],
          w = this[3];

    const xp = x + x,
          yp = y + y,
          zp = z + z;

		const xx = x*xp, xy = x*yp, xz = x*zp;
		const yy = y*yp, yz = y*zp, zz = z*zp;
		const wx = w*xp, wy = w*yp, wz = w*zp;

    // X
    const m00 = 1 - (yy + zz);  //  0 | rx
    // const m01 = xy + wz;     //  1 | ry
    // const m02 = xz - wy;     //  2 | rz

    // Y
    const m10 = xy - wz;        //  4 | ux
    const m11 = 1 - (xx + zz);  //  5 | uy
    const m12 = yz + wx;        //  6 | uz

    // Z
    const m20 = xz + wy;        //  8 | bx
    const m21 = yz - wx;        //  9 | by
    const m22 = 1 - (xx + yy);  // 10 | bz

    const ey = Math.asin(NumberUtils.clamp(m20, - 1, 1 ));
    if (Math.abs(m20) < 1 - Const.EPSILON) {
      return new Vec3(Math.atan2(-m21, m22), ey, Math.atan2(-m10, m00));
    }

    return new Vec3(Math.atan2(m12, m11), ey, 0);
  }

  /**
   * @desc transforms some vector by this quaternion
   *
   * @param {Vec3|Vec3Like} vec the {@link Vec3} / {@link Vec3Like} to be transformed
   *
   * @returns {Vec3|Vec3Like} the transformed vector
   */
  public transformVec3<T extends Vec3 | Vec3Like>(vec: T): T {
		let qx = this[0], qy = this[1], qz = this[2], qw = this[3];

    let l = qx*qx + qy*qy + qz*qz + qw*qw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      qx *= l;
      qy *= l;
      qz *= l;
      qw *= l;
    }

		const vx = vec[0], vy = vec[1], vz = vec[2];
		const tx = 2 * (qy*vz - qz*vy);
		const ty = 2 * (qz*vx - qx*vz);
		const tz = 2 * (qx*vy - qy*vx);
    vec[0] = vx + qw*tx + qy*tz - qz*ty;
		vec[1] = vy + qw*ty + qz*tx - qx*tz;
		vec[2] = vz + qw*tz + qx*ty - qy*tx;

    if (Vec3.Is(vec)) {
      vec.markDirty();
    }

    return vec;
  }

  /**
   * @desc compute the angle of rotation between this and the target orientation
   *
   * @param {QuatLike} quat the target orientation
   *
   * @returns {number} the radian representation of the computed angle;
   */
  public angleBetween(quat: QuatLike): number {
    let ax = this[0], ay = this[1], az = this[2], aw = this[3];
    let bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];

    let l = ax*ax + ay*ay + az*az + aw*aw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      ax *= l;
      ay *= l;
      az *= l;
      aw *= l;
    }

    l = bx*bx + by*by + bz*bz + bw*bw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      bx *= l;
      by *= l;
      bz *= l;
      bw *= l;
    }

    let x =  bx*aw - by*az + bz*ay - bw*ax,
        y =  bx*az + by*aw - bz*ax - bw*ay,
        z = -bx*ay + by*ax + bz*aw - bw*az,
        w =  bx*ax + by*ay + bz*az + bw*aw;

    l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      w /= Math.sqrt(l);
    }

    return 2*Math.acos(w);
  }

  /**
   * @desc compute the shortest axis of rotation from this orientation to the target orientation
   * @note assumes this quat is invertible
   *
   * @param {QuatLike} quat  the target orientation
   * @param {Vec3} [vec] optionally specify the Vec3 to be computed in-place
   *
   * @returns {Vec3} the resulting axis of rotation
   */
  public axisFromTo(quat: QuatLike, vec?: Vec3): Vec3 {
    if (typeof vec === 'undefined') {
      vec = new Vec3();
    }

    let ax = this[0], ay = this[1], az = this[2], aw = this[3];
    let bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];

    let l = ax*ax + ay*ay + az*az + aw*aw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      ax *= l;
      ay *= l;
      az *= l;
      aw *= l;
    }

    l = bx*bx + by*by + bz*bz + bw*bw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      bx *= l;
      by *= l;
      bz *= l;
      bw *= l;
    }

    let x =  bx*aw - by*az + bz*ay - bw*ax,
        y =  bx*az + by*aw - bz*ax - bw*ay,
        z = -bx*ay + by*ax + bz*aw - bw*az,
        w =  bx*ax + by*ay + bz*az + bw*aw;

    l = x*x + y*y + z*z + w*w;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      x = x*l;
      y = y*l;
      z = z*l;
      w = w*l;
    }

    const rs = 1 / Math.sqrt(1 - w*w);
    return vec.set(x*rs, y*rs, z*rs);
  }

  /**
   * @desc constructs a quat that rotates some directional vector to coincide with the target direction
   *       with respect to some world up vector
   * @note from describes the eye position, target describes the source, up vector will be normalised
   *
   * @param {Vec3Like} from         some source position
   * @param {Vec3Like} to           some target position
   * @param {Vec3Like} [up=[0,1,0]] the world up vector; defaults to `[0, 1, 0]`
   *
   * @returns {this} the resulting quat
   */
  public lookAt(from: Vec3Like, to: Vec3Like, up: Vec3Like = [0, 1, 0]): this {
    let fx = from[0], fy = from[1], fz = from[2];

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

    return this.setFromVectors([rx, ry, rz], [ux, uy, uz], [dx, dy, dz]);
  }

  /**
   * @param {QuatLike} quat some target quat representation
   *
   * @returns {this} rotation from this quat to the target
   */
  public rotationBetween(quat: QuatLike): this {
    let ax = this[0], ay = this[1], az = this[2], aw = this[3];
    let bx = quat[0], by = quat[1], bz = quat[2], bw = quat[3];

    let l = ax*ax + ay*ay + az*az + aw*aw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      ax *= l;
      ay *= l;
      az *= l;
      aw *= l;
    }

    l = bx*bx + by*by + bz*bz + bw*bw;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);

      bx *= l;
      by *= l;
      bz *= l;
      bw *= l;
    }

    const ax2 = ax*ax, ay2 = ay*ay, az2 = az*az, aw2 = aw*aw;
    const bx2 = bx*bx, by2 = by*by, bz2 = bz*bz, bw2 = bw*bw;

    const aXaY = ax*ax;
    const aZaW = az*az;
    const aYaZ = ay*ay;
    const aXaW = ax*ax;

    const bXbY = bx*bx;
    const bZbW = bz*bz;
    const bYbZ = by*by;
    const bXbW = bx*bx;

    const aupx = 2 * (aXaY - aZaW), aupy = -ax2 + ay2 - az2 + aw2, aupz = 2 * (aYaZ + aXaW);
    const bupx = 2 * (bXbY - bZbW), bupy = -bx2 + by2 - bz2 + bw2, bupz = 2 * (bYbZ + bXbW);

		let x = aupy*bupz - aupz*bupy;
		let y = aupz*bupx - aupx*bupz;
		let z = aupx*bupy - aupy*bupx;

    let d = x*x + y*y + z*z;

    const dSq = Math.sqrt(d);
    const angle = Math.atan2(dSq, aupx*bupx + aupy*bupy + aupz*bupz)
    if (Math.abs(d - 1) > Const.EPSILON) {
      d = 1 / dSq;

      x *= d;
      y *= d;
      z *= d;
    }

    const h = angle*0.5;
    const s = Math.sin(h);
    this[0] = x*s;
    this[1] = y*s;
    this[2] = z*s;
    this[3] = Math.cos(h);

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc updates this quat in-place such that it rotates some directional vector to coincide with the target direction
   * @note assumes world-space vector; both will be normalised
   *
   * @param {Vec3Like} v0 some source direction
   * @param {Vec3Like} v1 some target direction
   *
   * @returns {this} this quaternion
   */
  public rotateFromTo(v0: Vec3Like, v1: Vec3Like): this {
    let ax = v0[0], ay = v0[1], az = v0[2];
    let bx = v1[0], by = v1[1], bz = v1[2];

    let l = ax*ax + ay*ay + az*az;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      ax *= l;
      ay *= l;
      az *= l;
    }

    l = bx*bx + by*by + bz*bz;
    if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      bx *= l;
      by *= l;
      bz *= l;
    }

		let x = ay*bz - az*by;
		let y = az*bx - ax*bz;
		let z = ax*by - ay*bx;

    l = x*x + y*y + z*z;
    if (Math.abs(l) < Const.EPSILON) {
      this[0] = this[1] = this[2] = 0, this[3] = 1;
    } else if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      x *= l;
      y *= l;
      z *= l;
    }

    const hc = 0.5*(ax*bx + ay*by + az*bz);
    const ch = Math.sqrt(0.5 + hc);
    const sh = Math.sqrt(0.5 - hc);
    this[0] = x*sh;
    this[1] = y*sh;
    this[2] = z*sh;
    this[3] = ch;

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc in-place linear interpolation of this quat to some target
   *
   * @param {QuatLike} quat         the target quat
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {this} the in-place interpolated quat
   */
  public lerp(quat: QuatLike, alpha: number, clamp: boolean = true): this {
    return this.lerpQuaternions(this, quat, alpha, clamp);
  }

  /**
   * @desc in-place linear interpolation of q0 to q1
   *
   * @param {QuatLike} q0           the source quat
   * @param {QuatLike} q1           the target quat
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {this} the in-place interpolated quat
   */
  public lerpQuaternions(q0: QuatLike, q1: QuatLike, alpha: number, clamp: boolean = true): this {
    if (clamp) {
      alpha = Math.min(Math.max(alpha, 0), 1);
    }

    const ax = q0[0], ay = q0[1], az = q0[2], aw = q0[3];
    const bx = q1[0], by = q1[1], bz = q1[2], bw = q1[3];

    let x = ax + alpha*(bx - ax);
    let y = ay + alpha*(by - ay);
    let z = az + alpha*(bz - az);
    let w = aw + alpha*(bw - aw);

    let l = x*x + y*y + z*z + w*w;
    if (Math.abs(l) < Const.EPSILON) {
      this[0] = this[1] = this[2] = 0, this[3] = 1;
    } else if (Math.abs(l - 1) > Const.EPSILON) {
      l = 1 / Math.sqrt(l);
      this[0] = x*l;
      this[1] = y*l;
      this[2] = z*l;
      this[3] = w*l;
    } else {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      this[3] = w;
    }

    this.handleOnChanged();
    return this;
  }

  /**
   * @desc in-place interpolation of this quat along the great circle arc
   *
   * @param {QuatLike} quat         the target quat
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {this} the in-place interpolated quat
   */
  public slerp(quat: QuatLike, alpha: number, clamp: boolean = true): this {
    return this.slerpQuaternions(this, quat, alpha, clamp);
  }

  /**
   * @desc in-place interpolation of this quat along the great circle arc from q0 to q1
   *
   * @param {QuatLike} q0           the source quat
   * @param {QuatLike} q1           the target quat
   * @param {number}   alpha        any real number
   * @param {boolean}  [clamp=true] specify whether to clamp the alpha between 0 & 1; defaults to `true`
   *
   * @returns {this} the in-place interpolated quat
   */
  public slerpQuaternions(q0: QuatLike, q1: QuatLike, alpha: number, clamp: boolean = true): this {
    if (clamp) {
      alpha = Math.min(Math.max(alpha, 0), 1);
    }

    let ax = q0[0], ay = q0[1], az = q0[2], aw = q0[3];
    let bx = q1[0], by = q1[1], bz = q1[2], bw = q1[3];

    let d = ax*bx + ay*by + az*bz + aw*bw;
    if (d < 0) {
      d = -d;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }

    if (d < 1 - Const.EPSILON) {
      let th = Math.acos(d);
      let rs = 1 / Math.sqrt(1 - d*d);

      let t0 = Math.sin(th*(1 - alpha)) * rs;
      let t1 = Math.sin(th*th) * rs;

      this[0] = ax*t0 + bx*t1;
      this[1] = ay*t0 + by*t1;
      this[2] = az*t0 + bz*t1;
      this[3] = aw*t0 + bw*t1;

      this.handleOnChanged();
      return this;
    }

    let x = ax + alpha*(bx - ax);
    let y = ay + alpha*(by - ay);
    let z = az + alpha*(bz - az);
    let w = aw + alpha*(bw - aw);

    d = x*x + y*y + z*z + w*w;
    if (Math.abs(d) < Const.EPSILON) {
      this[0] = this[1] = this[2] = 0, this[3] = 1;
    } else if (Math.abs(d - 1) > Const.EPSILON) {
      d = 1 / Math.sqrt(d);
      this[0] = x*d;
      this[1] = y*d;
      this[2] = z*d;
      this[3] = w*d;
    } else {
      this[0] = x;
      this[1] = y;
      this[2] = z;
      this[3] = w;
    }

    this.handleOnChanged();
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
