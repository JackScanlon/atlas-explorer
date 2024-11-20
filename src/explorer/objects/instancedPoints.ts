import * as Three from 'three'

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

const transformVertex = (
  viewWorldMatrix: Three.Matrix4,
  vertexPosition: Three.Vector3,
  mvPosition: Three.Vector3,
  center: Three.Vector2,
  pOffset: Three.Vector3,
  pScale: number
): void => {
	const position = new Three.Vector3(
    (vertexPosition.x - (center.x - 0.5)) * pScale,
    (vertexPosition.y - (center.y - 0.5)) * pScale,
    0
  );

	vertexPosition.copy(mvPosition);
	vertexPosition.x += position.x;
	vertexPosition.y += position.y;

	vertexPosition.applyMatrix4(viewWorldMatrix).add(pOffset);
}

export default class InstancedPoints extends Three.Mesh {
  public type: string = 'InstancedPoints';
  public center: Three.Vector2 = new Three.Vector2(0.5, 0.5);

  public mesh!: Three.Mesh;
  public data!: Uint32Array;
  public points!: Float32Array;
  public scaling!: Float32Array;

  public constructor(points: Float32Array, scaling: Float32Array, data: Uint32Array, material: Three.ShaderMaterial) {
    const baseGeometry = new Three.BufferGeometry();
    baseGeometry.setIndex(IL_POINT_INDICES.slice(0));

    const buffer = new Three.InterleavedBuffer(IL_POINT_POS_UV.slice(0), 5);
    baseGeometry.setAttribute('position', new Three.InterleavedBufferAttribute(buffer, 3, 0, false));
    baseGeometry.setAttribute(      'uv', new Three.InterleavedBufferAttribute(buffer, 2, 3, false));

    const geometry = new Three.InstancedBufferGeometry();
    geometry.index = baseGeometry.index;
    geometry.attributes = baseGeometry.attributes;
    geometry.instanceCount = points.length / 3;

    geometry.setAttribute('data', new Three.InstancedBufferAttribute(data, 1, false, 1));
    geometry.setAttribute('scale', new Three.InstancedBufferAttribute(scaling, 1, false, 1));
    geometry.setAttribute('offset', new Three.InstancedBufferAttribute(points, 3, false, 1));

    super(geometry, material);

    this.data = data;
    this.points = points;
    this.scaling = scaling;
  }

  public raycast(raycaster: Three.Raycaster, intersects: Three.Intersection[]): void {
    if (!raycaster.camera) {
      return;
    }

    const intersectPoint = new Three.Vector3();

    const vA = new Three.Vector3();
    const vB = new Three.Vector3();
    const vC = new Three.Vector3();

    const center = this.center;
    const points = this.points;
    const scaling = this.scaling;

    const viewWorldMatrix = new Three.Matrix4().copy(raycaster.camera.matrixWorld);
		this.modelViewMatrix.multiplyMatrices(raycaster.camera.matrixWorldInverse, this.matrixWorld);

    const mvPosition = new Three.Vector3().setFromMatrixPosition(this.modelViewMatrix);
    const pointOffset = new Three.Vector3();
    for (let i = 0; i < points.length / 3; ++i) {
      const scale = scaling[i];
      pointOffset.set(
        points[i*3 + 0],
        points[i*3 + 1],
        points[i*3 + 2]
      );

      transformVertex(viewWorldMatrix, vA.set(-0.5, -0.5, 0), mvPosition, center, pointOffset, scale);
      transformVertex(viewWorldMatrix, vB.set( 0.5, -0.5, 0), mvPosition, center, pointOffset, scale);
      transformVertex(viewWorldMatrix, vC.set( 0.5,  0.5, 0), mvPosition, center, pointOffset, scale);

      const uvA = new Three.Vector2().set(0, 0);
      const uvB = new Three.Vector2().set(1, 0);
      const uvC = new Three.Vector2().set(1, 1);

      let intersect = raycaster.ray.intersectTriangle(vA, vB, vC, false, intersectPoint);
      if (!intersect) {
        transformVertex(viewWorldMatrix, vB.set(-0.5, 0.5, 0), mvPosition, center, pointOffset, scale);
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
        distance: distance,
        index: i,
        point: intersectPoint.clone(),
        uv: Three.Triangle.getInterpolation(intersectPoint, vA, vB, vC, uvA, uvB, uvC, new Three.Vector2()) || undefined,
        face: null,
        object: this
      });
    }
  }
}
