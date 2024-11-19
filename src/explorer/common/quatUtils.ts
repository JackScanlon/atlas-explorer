import * as Three from 'three'

import { World } from '../constants'
import { tryNormaliseVector } from './vecUtils';

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
  if (Math.abs(l) > 1e-6) {
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
  )
}

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
	let x, y, z, w, s
	let m00 = v1.x, m01 = v1.y, m02 = v1.z;
	let m10 = v2.x, m11 = v2.y, m12 = v2.z;
	let m20 = v0.x, m21 = v0.y, m22 = v0.z;

	let n = m00 + m11 + m22
	if (n > 0) {
		s = Math.sqrt(n + 1)
		w = s*0.5

		s = 0.5/s
		x = (m12 - m21)*s
		y = (m20 - m02)*s
		z = (m01 - m10)*s
		return [x, y, z, w]
  } else if (m00 >= m11 && m00 >= m22) {
		s = Math.sqrt(1 + m00 - m11 - m22)
		x = 0.5*s

		s = 0.5/s
		y = (m01 + m10)*s
		z = (m02 + m20)*s
		w = (m12 - m21)*s
		return [x, y, z, w]
  } else if (m11 > m22) {
		s = Math.sqrt(1 + m11 - m00 - m22)
		y = 0.5*s

		s = 0.5/s
		x = (m10 + m01)*s
		z = (m21 + m12)*s
		w = (m20 - m02)*s
		return [x, y, z, w]
  }

	s = Math.sqrt(1 + m22 - m00 - m11)
	z = 0.5*s

	x = (m20 + m02)*s
	y = (m21 + m12)*s
	w = (m01 - m10)*s
	return [x, y, z, w]
}

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
export const quatLookAt = (from: Three.Vector3, to: Three.Vector3, up: Three.Vector3 = World.UpVector): Three.Quaternion => {
  let x!: number,
      y!: number,
      z!: number,
      w!: number;

  from = from.clone();
  to = to.clone();
  up = up.clone();

  tryNormaliseVector(up, World.UpVector);

  const forward = to.sub(from);
  tryNormaliseVector(forward, World.LookVector.clone().negate());

  const right = forward.clone().cross(up);
  const length = right.lengthSq();
  if (length > 1e-6) {
    tryNormaliseVector(right, World.RightVector);
    up = tryNormaliseVector(right.clone().cross(forward), World.UpVector);

    [x, y, z, w] = componentsFromVectors(forward.negate(), right, up);
  } else {
    tryNormaliseVector(forward.clone().cross(World.RightVector), World.RightVector);
    up = tryNormaliseVector(right.clone().cross(forward), World.UpVector);

    [x, y, z, w] = componentsFromVectors(forward.negate(), right, up);
  }

  return new Three.Quaternion(x, y, z, w);
}
