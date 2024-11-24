import * as Three from 'three'
import * as VecUtils from '../common/vecUtils'

import { Const } from '../constants'
import { DisposableItem } from '../types';

const IL_POINT_INDICES = [
  0, 1, 2,
  0, 2, 3,
];

const IL_POINT_POS_UV = new Float32Array([
  -0.5, -0.5, 0, 0, 0,
   0.5, -0.5, 0, 1, 0,
   0.5,  0.5, 0, 1, 1,
  -0.5,  0.5, 0, 0, 1
]);

// See `../../shaders/node/node.vert`
const transformVertex = (
  viewWorldMatrix: Three.Matrix4,
  vertexPosition: Three.Vector3,
  mvPosition: Three.Vector3,
  center: Three.Vector2,
  pOffset: Three.Vector3,
  xScale: number,
  yScale: number
): void => {
	const position = new Three.Vector3(
    (vertexPosition.x - (center.x - 0.5)) * xScale,
    (vertexPosition.y - (center.y - 0.5)) * yScale,
    0
  );

	vertexPosition.copy(mvPosition);
	vertexPosition.x += position.x;
	vertexPosition.y += position.y;

	vertexPosition.applyMatrix4(viewWorldMatrix).add(pOffset);
}

export default class InstancedPoints extends Three.Mesh<Three.InstancedBufferGeometry, Three.ShaderMaterial> {
  public type: string = 'InstancedPoints';
  public center: Three.Vector2 = new Three.Vector2(0.5, 0.5);

  public mesh!: Three.Mesh;
  public data!: Uint32Array;
  public points!: Float32Array;

  public boundingBox?: Three.Box3;
  public boundingSphere?: Three.Sphere;

  private disposables: DisposableItem[] = [];

  public constructor(points: Float32Array, data: Uint32Array, material: Three.ShaderMaterial) {
    // Base plane geometry
    const baseGeometry = new Three.BufferGeometry();
    baseGeometry.setIndex(IL_POINT_INDICES.slice(0));

    const buffer = new Three.InterleavedBuffer(IL_POINT_POS_UV.slice(0), 5);
    baseGeometry.setAttribute(      'uv', new Three.InterleavedBufferAttribute(buffer, 2, 3, false));
    baseGeometry.setAttribute('position', new Three.InterleavedBufferAttribute(buffer, 3, 0, false));

    // Instanced geometry
    const geometry = new Three.InstancedBufferGeometry();
    geometry.index = baseGeometry.index;
    geometry.attributes = baseGeometry.attributes;
    geometry.instanceCount = points.length / 7;

    // Uint data buffer
    geometry.setAttribute('data', new Three.InstancedBufferAttribute(data, 1, false, 1));

    // Interleaved position + scale buffer
    const pointBuffer = new Three.InstancedInterleavedBuffer(points, 7, 1);
    geometry.setAttribute('rdOffset', new Three.InterleavedBufferAttribute(pointBuffer, 3, 0, false));
    geometry.setAttribute('scOffset', new Three.InterleavedBufferAttribute(pointBuffer, 3, 3, false));
    geometry.setAttribute(   'scale', new Three.InterleavedBufferAttribute(pointBuffer, 1, 6, false));

    super(geometry, material);

    this.data = data;
    this.points = points;
    this.position.set(0, 0, 0);

    this.disposables.push(geometry.dispose.bind(geometry));
    this.disposables.push(baseGeometry.dispose.bind(baseGeometry));
    this.disposables.push(material.dispose.bind(material));
  }

  public dispose(): void {
    this.removeFromParent();

    for (let i = 0; i < this.disposables.length; ++i) {
      try {
        this.disposables[i]();
      }
      catch (e) {
        console.warn(`Disposable failed: ${e}`);
      }
    }
  }

  public getPointAtIndex(index: number, vec: Three.Vector3): Three.Vector3 {
    const pA = this.material.uniforms.uView.value;
		const p0 = this.geometry.getAttribute('rdOffset');
		const p1 = this.geometry.getAttribute('scOffset');

    return vec.fromBufferAttribute(p0, index).lerp(vec.clone().fromBufferAttribute(p1, index), pA);
  }

	public computeBoundingBox(): void {
		if (!this.boundingBox) {
			this.boundingBox = new Three.Box3();
		}

		this.updateWorldMatrix(true, false);
    this.boundingBox.makeEmpty();

    const vec = new Three.Vector3();
    const worldMatrix = this.matrixWorld;
    for (let i = 0; i < this.points.length / 7; ++i) {
      this.boundingBox.expandByPoint(this.getPointAtIndex(i, vec).applyMatrix4(worldMatrix));
    }
	}

  public computeBoundingSphere(): void {
    if (!this.boundingSphere) {
      this.boundingSphere = new Three.Sphere();
    }

    if (!this.boundingBox) {
      this.computeBoundingBox();
    }
		this.updateWorldMatrix(true, false);

    const scaleBuffer   = this.geometry.getAttribute('scale'),
          instanceCount = this.points.length / 7;

    let radiusSqr = 0,
            scale = 0,
            point = new Three.Vector3(0.0);

    const worldMatrix = this.matrixWorld;
    const displacement = new Three.Vector3();

    const boxOrigin = this.boundingBox!.getCenter(point.clone())
      .applyMatrix4(worldMatrix);

    for (let i = 0; i < instanceCount; ++i) {
      scale = scaleBuffer.getComponent(i, 0);

      this.getPointAtIndex(i, point)
        .applyMatrix4(worldMatrix);

      displacement.copy(point)
        .sub(boxOrigin);

      VecUtils.tryNormaliseVector(displacement, Const.UpVector);
      point.add(displacement.multiplyScalar(scale));

      radiusSqr = Math.max(radiusSqr, boxOrigin.distanceToSquared(point));
    }

    this.boundingSphere.center = boxOrigin;
    this.boundingSphere.radius = Math.sqrt(radiusSqr);
  }

  public raycast(raycaster: Three.Raycaster, intersects: Three.Intersection[]): void {
    if (!raycaster.camera) {
      return;
    }

    const intersectPoint = new Three.Vector3();

    const vA = new Three.Vector3();
    const vB = new Three.Vector3();
    const vC = new Three.Vector3();

    const uvA = new Three.Vector2(),
          uvB = new Three.Vector2(),
          uvC = new Three.Vector2();

    const center = this.center;
    const points = this.points;

    const viewWorldMatrix = new Three.Matrix4().copy(raycaster.camera.matrixWorld);
		this.modelViewMatrix.multiplyMatrices(raycaster.camera.matrixWorldInverse, this.matrixWorld);

    const mvPosition = new Three.Vector3().setFromMatrixPosition(this.modelViewMatrix);
    const modelMatrix = this.matrixWorld.elements;

    const aScale = new Three.Vector2(
      Math.sqrt(modelMatrix[0]*modelMatrix[0] + modelMatrix[4]*modelMatrix[4] + modelMatrix[8]*modelMatrix[8]) * -mvPosition.z,
      Math.sqrt(modelMatrix[1]*modelMatrix[1] + modelMatrix[5]*modelMatrix[5] + modelMatrix[9]*modelMatrix[9]) * -mvPosition.z,
    )
      .divideScalar(300.00)
      .clampScalar(0.5, 1.0);

    const pointOffset = new Three.Vector3();
    for (let i = 0; i < points.length / 7; ++i) {
      this.getPointAtIndex(i, pointOffset)

      const scale = points[i*7 + 6];
      transformVertex(viewWorldMatrix, vA.set(-0.5, -0.5, 0), mvPosition, center, pointOffset, aScale.x*scale, aScale.y*scale);
      transformVertex(viewWorldMatrix, vB.set( 0.5, -0.5, 0), mvPosition, center, pointOffset, aScale.x*scale, aScale.y*scale);
      transformVertex(viewWorldMatrix, vC.set( 0.5,  0.5, 0), mvPosition, center, pointOffset, aScale.x*scale, aScale.y*scale);

      uvA.set(0, 0);
      uvB.set(1, 0);
      uvC.set(1, 1);

      let intersect = raycaster.ray.intersectTriangle(vA, vB, vC, false, intersectPoint);
      if (!intersect) {
        transformVertex(viewWorldMatrix, vB.set(-0.5, 0.5, 0), mvPosition, center, pointOffset, aScale.x*scale, aScale.y*scale);
        uvB.set(0, 1);

        intersect = raycaster.ray.intersectTriangle(vA, vC, vB, false, intersectPoint);
        if (!intersect) {
          continue;
        }
      }

      const distance = raycaster.ray.origin.distanceTo(intersectPoint);
      if (distance < raycaster.near || distance > raycaster.far) {
        continue;
      }

      intersects.push({
        uv: Three.Triangle.getInterpolation(intersectPoint, vA, vB, vC, uvA, uvB, uvC, uvA.clone()) || undefined,
        face: null,
        index: i,
        point: intersectPoint.clone(),
        object: this,
        distance: distance,
      });
    }
  }
};
