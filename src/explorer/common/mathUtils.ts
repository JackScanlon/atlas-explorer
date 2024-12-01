import * as Three from 'three'
import * as Utils from './utils'

import { Const } from '@/explorer/constants'
import { ViewportSize, AxisId, NormalId } from '@/explorer/types'

type VecType = Three.Vector3 | Three.Vector2;

/**
 *
 * @param vec
 *
 * @returns {Vector3}
 */
export const getPerpendicularVector = (vec: Three.Vector3): Three.Vector3 => {
  let axis!: Three.Vector3;
  if (Math.abs(vec.dot(Const.RightVector)) > 0.7) {
    axis = Const.UpVector;
  } else if (Math.abs(vec.dot(Const.LookVector)) > 0.7) {
    axis = Const.RightVector
  } else {
    axis = Const.LookVector;
  }

  return tryNormaliseVector(vec.crossVectors(axis, vec));
};

/**
 * getNormalIdFromVector
 * @desc finds the `NormalId` that describes some direction vector
 *
 * @param {Vector3}  vec             some direction vector
 * @param {NormalId} defaultNormalId some default normal id (defaults to `NormalId.Top`)
 * @param {number}   threshold       an optional parameter that specifies the minimum threshold; specifying this parameter
 *                                   will resolve the closest match rather than resolving when the scalar product is `>=0.9`
 *
 * @returns {NormalId} the `NormalId` that describes this vector
 */
export const getNormalIdFromVector = (vec: Three.Vector3, defaultNormalId: NormalId = NormalId.Top, threshold?: number): NormalId => {
  if (Utils.approximately(vec.lengthSq(), 1)) {
    vec = tryNormaliseVector(vec.clone());
  }

  if (typeof threshold !== 'number') {
    for (const [id, normal] of Const.NormalIdVectorMap) {
      if (vec.dot(normal) >= 0.9) {
        return id;
      }
    }

    return defaultNormalId;
  }

  let dotProduct    = 0,
      bestNormalId  = defaultNormalId,
      bestDistance  = -1;
  for (const [id, normal] of Const.NormalIdVectorMap) {
    dotProduct = vec.dot(normal);
    if (dotProduct >= threshold && dotProduct > bestDistance) {
      bestNormalId = id;
    }
  }

  return bestNormalId;
};

/**
 * getAxisIdFromVector
 * @desc finds the `AxisId` that describes some direction vector
 *
 * @param {Vector3} vec           some direction vector
 * @param {AxisId}  defaultAxisId some default axis id (defaults to `AxisId.Y`)
 * @param {number}  threshold     an optional parameter that specifies the minimum threshold; specifying this parameter
 *                                will resolve the closest match rather than resolving when the scalar product is `>=0.9`
 *
 * @returns {AxisId} the `AxisId` that describes this vector
 */
export const getAxisIdFromVector = (vec: Three.Vector3, defaultAxisId: AxisId = AxisId.Y, threshold?: number): AxisId => {
  if (Utils.approximately(vec.lengthSq(), 1)) {
    vec = tryNormaliseVector(vec.clone());
  }

  if (typeof threshold !== 'number') {
    for (const [id, normal] of Const.AxisIdVectorMap) {
      if (Math.abs(vec.dot(normal)) > 0.9) {
        return id;
      }
    }

    return defaultAxisId;
  }

  let dotProduct   = 0,
      bestAxisId   = defaultAxisId,
      bestDistance = -1;
  for (const [id, normal] of Const.AxisIdVectorMap) {
    dotProduct = Math.abs(vec.dot(normal));
    if (dotProduct >= threshold && dotProduct > bestDistance) {
      bestAxisId = id;
    }
  }

  return bestAxisId;
};

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

  if (Utils.approximately(len, 1)) {
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
};

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
    dot = Utils.clampValue(dot, min, max);
  }

  const pos = dir.multiplyScalar(dot).add(lineOrigin);
  return {
    Position: pos,
    Distance: dot,
  };
};

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

  d = Utils.clampValue(a.dot(b) / d, -1, 1);
  return Math.acos(d) * r;
};

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
  const r = useRad ? 1 : Const.RAD2DEG;

  let d = Math.sqrt((a.x*a.x + a.y*a.y + a.z*a.z) * (b.x*b.x + b.y*b.y + b.z*b.z));
  if (d < Const.EPS) {
    return 0;
  }

  d = Utils.clampValue(a.dot(b) / d, -1, 1);
  d = Math.acos(d) * r;

  const ax = a.x, ay = a.y, az = a.z;
  const bx = b.x, by = b.y, bz = b.z;
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;

  const s = (axis.x*cx + axis.y*cy + axis.z*cz) >= 0
    ? 1
    : -1;

  return d*s;
};

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
};

/**
 * safeQuatMultVec3
 * @desc safely multiply a vector with a quaternion without assuming unit length
 *
 * @param {Quaternion} quat some quaternion
 * @param {Vector3}    vec  some vector3
 * @returns {Vector3} the resulting vector
 */
export const safeQuatMultVec3 = (quat: Three.Quaternion, vec: Three.Vector3): Three.Vector3 => {
  let ax = quat.x, ay = quat.y, az = quat.z, aw = quat.w;
  let bx =  vec.x, by =  vec.y, bz =  vec.z, bw =      0;

  let l = ax*ax + ay*ay + az*az + aw*aw;
  if (Math.abs(l) > Const.EPS) {
    l = Math.sqrt(l);

    ax /= l;
    ay /= l;
    az /= l;
    aw /= l;
  } else {
    ax = 0, ay = 0, az = 0, aw = 0;
  }

  let abx = aw * bx + ax * bw + ay * bz - az * by;
  let aby = aw * by - ax * bz + ay * bw + az * bx;
  let abz = aw * bz + ax * by - ay * bx + az * bw;
  let abw = aw * bw - ax * bx - ay * by - az * bz;
  return new Three.Vector3(
    abw * -ax + abx *  aw + aby * -az - abz * -ay,
    abw * -ay - abx * -az + aby *  aw + abz * -ax,
    abw * -az + abx * -ay - aby * -ax + abz *  aw
  );
};

/**
 * quatComponentsFromVectors
 * @desc computes a quaternion's components from the given direction vectors (back, right, up)
 *
 * @param {Vector3} v0 some normalised back vector
 * @param {Vector3} v1 some normalised right vector
 * @param {Vector3} v2 some normalised up vector
 *
 * @returns {[number, number, number, number]} the x, y, z, and w components of the quaternion
 */
export const componentsFromVectors = (v0: Three.Vector3, v1: Three.Vector3, v2: Three.Vector3): [number, number, number, number] => {
	let x, y, z, w, s;
	let m00 = v1.x, m01 = v1.y, m02 = v1.z;
	let m10 = v2.x, m11 = v2.y, m12 = v2.z;
	let m20 = v0.x, m21 = v0.y, m22 = v0.z;

	let n = m00 + m11 + m22;
	if (n > 0) {
		s = Math.sqrt(n + 1);
		w = s*0.5;

		s = 0.5/s;
		x = (m12 - m21)*s;
		y = (m20 - m02)*s;
		z = (m01 - m10)*s;
		return [x, y, z, w];
  } else if (m00 >= m11 && m00 >= m22) {
		s = Math.sqrt(1 + m00 - m11 - m22);
		x = 0.5*s;

		s = 0.5/s;
		y = (m01 + m10)*s;
		z = (m02 + m20)*s;
		w = (m12 - m21)*s;
		return [x, y, z, w];
  } else if (m11 > m22) {
		s = Math.sqrt(1 + m11 - m00 - m22);
		y = 0.5*s;

		s = 0.5/s;
		x = (m10 + m01)*s;
		z = (m21 + m12)*s;
		w = (m20 - m02)*s;
		return [x, y, z, w];
  }

	s = Math.sqrt(1 + m22 - m00 - m11);
	z = 0.5*s;

	x = (m20 + m02)*s;
	y = (m21 + m12)*s;
	w = (m01 - m10)*s;
	return [x, y, z, w];
};

/**
 * quatLookAt
 * @desc constructs a quaternion describing a rotation facing towards `to` from the perspective of position `from`
 *
 * @param {Vector3} from some world-space origin position
 * @param {Vector3} to   some world-space position to target
 * @param {Vector3} up   the desired up vector (optional; defaults to `Vec3(0, 1, 0)`)
 *
 * @returns {Quaternion} the computed quaternion
 */
export const quatLookAt = (from: Three.Vector3, to: Three.Vector3, up: Three.Vector3 = Const.UpVector): Three.Quaternion => {
  let x!: number,
      y!: number,
      z!: number,
      w!: number;

  from = from.clone();
  to = to.clone();
  up = up.clone();

  tryNormaliseVector(up, Const.UpVector);

  const forward = to.sub(from);
  tryNormaliseVector(forward, Const.LookVector.clone().negate());

  const right = forward.clone().cross(up);
  const length = right.lengthSq();
  if (length > Const.EPS) {
    tryNormaliseVector(right, Const.RightVector);
    up = tryNormaliseVector(right.clone().cross(forward), Const.UpVector);

    [x, y, z, w] = componentsFromVectors(forward.negate(), right, up);
  } else {
    tryNormaliseVector(forward.clone().cross(Const.RightVector), Const.RightVector);
    up = tryNormaliseVector(right.clone().cross(forward), Const.UpVector);

    [x, y, z, w] = componentsFromVectors(forward.negate(), right, up);
  }

  return new Three.Quaternion(x, y, z, w);
};
