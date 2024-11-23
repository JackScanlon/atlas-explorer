import * as Three from 'three'

import { Const } from '../constants'
import { ViewportSize } from '../types'
import { approximately, clampValue } from './utils'

const PI = Math.PI;
const DEG2RAD = PI * 2 / 360;
const RAD2DEG = 1 / DEG2RAD;

type VecType = Three.Vector3 | Three.Vector2;

/**
 * tryNormaliseVector
 * @desc safely normalise a vector or replace with the given default vec
 *
 * @param {Vector2|Vector3}           vec          the vector to normalise
 * @param {Vector2|Vector3|undefined} defaultValue a default vector if (optional; defaults to Vec2(0, 1) | Vec3(0, 1, 0))
 *
 * @returns {Vector2|Vector3} the normalised vector
 */
export const tryNormaliseVector = <T extends VecType>(vec: T, defaultValue?: T | undefined): T => {
  const isVec2 = vec instanceof Three.Vector2;

  let len: number;
  if (isVec2) {
    len = vec.x*vec.x + vec.y*vec.y;
  } else {
    len = vec.x*vec.x + vec.y*vec.y + vec.z*vec.z;
  }

  if (approximately(len, 1)) {
    return vec;
  } else if (len > Const.EPS) {
    vec.normalize();
  } else {
    if (isVec2) {
      if (defaultValue) {
        vec.copy(defaultValue as Three.Vector2);
      } else {
        vec.set(0, 1);
      }
    } else {
      if (defaultValue) {
        vec.copy(defaultValue as Three.Vector3);
      } else {
        vec.set(0, 1, 0);
      }
    }
  }

  return vec;
}

/**
 * closestPointOnRay
 * @desc computes the closest point on a ray from some translation
 *
 * @param {Vector3}     point        some origin
 * @param {Vector3}     rayOrigin    the start of the ray
 * @param {Vector3}     rayDirection the ray direction (direction vector w/ magnitude, or can be normalised)
 * @param {number|any}  min          optionally clamp the minimum bounds of the point (optional; defaults to `undefined`)
 * @param {number|any}  max          optionally clamp the maximum bounds of the point (optional; defaults to `undefined`)
 *
 * @returns {Vector3} the closest point on the ray
 */
export const closestPointOnRay = (
  point: Three.Vector3,
  lineOrigin: Three.Vector3,
  lineDirection: Three.Vector3,
  min?: number,
  max?: number,
): { Position: Three.Vector3, Distance: number } => {
  const dir = tryNormaliseVector(lineDirection.clone());
  const vec = point.clone().sub(lineOrigin);

  let dot = vec.dot(dir);
  if (typeof min === 'number' && typeof max === 'number') {
    dot = clampValue(dot, min, max);
  }

  const pos = dir.multiplyScalar(dot).add(lineOrigin)
  return {
    Position: pos,
    Distance: dot,
  };
}

/**
 * computeAngle
 * @desc computes the angle between two unit vectors
 *
 * @param {Vector3}     a      some unit vector
 * @param {Vector3}     b      some unit vector
 * @param {boolean|any} useRad specifies whether to compute radians | degrees
 *
 * @returns {number} a number specifying the angle between the vectors (in radians)
 */
export const computeAngle = (a: Three.Vector3, b: Three.Vector3, useRad: boolean = true): number => {
  const r = useRad ? 1 : Const.RAD2DEG;

  let d = Math.sqrt((a.x*a.x + a.y*a.y + a.z*a.z) * (b.x*b.x + b.y*b.y + b.z*b.z));
  if (d < Const.EPS) {
    return 0;
  }

  d = clampValue(a.dot(b) / d, -1, 1)
  return Math.acos(d) * r
}

/**
 * computeSignedAngle
 * @desc computes the signed angle between two unit vectors in relation
 *       to the axis of rotation
 *
 * @param {Vector3}     a      some unit vector
 * @param {Vector3}     b      some unit vector
 * @param {Vector3}     axis   some axis of rotation
 * @param {boolean|any} useRad specifies whether to compute radians | degrees
 *
 * @returns {number} a number specifying the signed angle between the vectors (in radians)
 */
export const computeSignedAngle = (
  a: Three.Vector3,
  b: Three.Vector3,
  axis: Three.Vector3 = Const.UpVector,
  useRad: boolean = true
): number => {
  const r = useRad ? 1 : RAD2DEG;

  let d = Math.sqrt((a.x*a.x + a.y*a.y + a.z*a.z) * (b.x*b.x + b.y*b.y + b.z*b.z));
  if (d < Const.EPS) {
    return 0;
  }

  d = clampValue(a.dot(b) / d, -1, 1);
  d = Math.acos(d) * r;

  const ax = a.x, ay = a.y, az = a.z;
  const bx = b.x, by = b.y, bz = b.z;
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;

  const s = (axis.x*cx + axis.y*cy + axis.z*cz) >= 0
    ? 1
    : -1;

  return d*s
}

/**
 * rotatePointAroundOrigin
 * @desc rotates a point around an origin, given some angle and some axis of rotation
 * @note this operation does _NOT_ copy
 *
 * @param {Vector3} point  some point to rotate about an origin and its axis (optional; defaults to `Vector3(0, 0, 0)`)
 * @param {Vector3} origin some origin to rotate the point around (optional; defaults to `Vector3(0, 0, 0)`)
 * @param {number}  theta  some angle in radians (optional; defaults to `0`)
 * @param {Vector3} axis   some axis of rotation (optional; defaults to up vector of `Vector3(0, 1, 0)`)
 *
 * @returns {Vector3} the resultant `Vector3` after being rotated
 */
export const rotatePointAroundOrigin = (
  point  : Three.Vector3 = Const.ZeroVector,
  origin : Three.Vector3 = Const.ZeroVector,
  theta  : number  = 0,
  axis   : Three.Vector3 = Const.UpVector
): Three.Vector3 => {
  return point
    .sub(origin)
    .applyAxisAngle(axis, theta)
    .add(point);
};

/**
 * toScreenSpace
 * @desc projects world-space position to screen-space
 *
 * @param {Vector3}           point  some world-space position
 * @param {PerspectiveCamera} camera the camera used in the projection
 * @param {ViewportSize}      canvas an object describing the height/width of the device
 * @param {Vector2|undefined} result an optional output vector to update
 *
 * @returns {Vector2} the resulting screen-space pixel position in which the top-left of the screen is `Vec2(0,0)`
 */
export const toScreenSpace = (
  point: Three.Vector3,
  camera: Three.PerspectiveCamera,
  canvas: ViewportSize,
  result?: Three.Vector2
): Three.Vector2 => {

  if (!result) {
    result = new Three.Vector2();
  }

  const wHalf = 0.5*canvas.width,
        hHalf = 0.5*canvas.height;

  point = point.clone().project(camera);
  return result.set(
     (point.x * wHalf) + wHalf,
    -(point.y * hHalf) + hHalf
  );
}
