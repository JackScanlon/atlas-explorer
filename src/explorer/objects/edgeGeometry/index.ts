import * as Three from 'three'
import * as MathUtils from '@/explorer/common/mathUtils'
import * as Primitive from './primitive'

import { AxisId, NormalId } from '@/explorer/types'

export * from './primitive';

export default class BoxEdgesGeometry extends Three.EdgesGeometry {
	public type: string = 'BoxEdgesGeometry';

  private uvs!: Three.InterleavedBufferAttribute;
  private normals!: Three.InterleavedBufferAttribute;
  private positions!: Three.InterleavedBufferAttribute;

  private faces!: Map<NormalId, Primitive.QuadPrimitive<Three.Vector3>>;
  private segments!: Primitive.EdgePrimitive[];

  public constructor() {
    super();

    this.build();
  }

  public get quads(): Map<NormalId, Primitive.QuadPrimitive<Three.Vector3>> {
    return this.faces;
  }

  public get edges(): Primitive.EdgePrimitive[] {
    return this.segments;
  }

  public getQuad(normalId: NormalId): Primitive.QuadPrimitive<Three.Vector3> {
    return this.faces.get(normalId)!;
  }

  public vertexAt(index: number, out?: Three.Vector3): Three.Vector3 {
    if (!out) {
      out = new Three.Vector3();
    }

    return out.fromBufferAttribute(this.positions, index);
  }

  public normalAt(index: number, out?: Three.Vector3): Three.Vector3 {
    if (!out) {
      out = new Three.Vector3();
    }

    return out.fromBufferAttribute(this.normals, index);
  }

  public uvAt(index: number, out?: Three.Vector2): Three.Vector2 {
    if (!out) {
      out = new Three.Vector2();
    }

    return out.set(this.uvs.getX(index), this.uvs.getY(index));
  }

  public copy(source: BoxEdgesGeometry): this {
		super.copy(source as Three.BufferGeometry);
		return this;
  }

  private build(): void {
    // Build geom
    const data    = Primitive.vertexBuffer.slice(0),
          indices = Primitive.triIndices.slice(0);

    for (let i = 0; i < data.length / 8; ++i) {
      data[i*8 + 0] *= 0.5;
      data[i*8 + 1] *= 0.5;
      data[i*8 + 2] *= 0.5;
    }

    const buffer    = new Three.InterleavedBuffer(data, 8);
    const positions = new Three.InterleavedBufferAttribute(buffer, 3, 0),
          normals   = new Three.InterleavedBufferAttribute(buffer, 3, 3),
          uvs       = new Three.InterleavedBufferAttribute(buffer, 2, 6);

    this.setAttribute('position', positions);
    this.setAttribute(  'normal',   normals);
    this.setAttribute(      'uv',       uvs);

    this.setIndex(new Three.BufferAttribute(indices, 1));

    // Build quads
    this.faces = new Map<NormalId, Primitive.QuadPrimitive<Three.Vector3>>();

    for (const [normalId, quad] of Primitive.quads) {
      const face: Primitive.QuadPrimitive<Three.Vector3> = {
        ...quad,
        ...{
          point: new Three.Vector3().fromArray(quad.point),
          normal: new Three.Vector3().fromArray(quad.normal)
        }
      };

      this.faces.set(normalId, face);
    }

    // Build edges
    this.segments = [];

    const vertex0 = new Three.Vector3(),
          vertex1 = new Three.Vector3(),
          displacement = new Three.Vector3(),
          edges = Primitive.edgeIndices;

    let edgeId = 0;
    for (let i = 0; i < edges.length / 2; ++i) {
      const index0 = edges[i*2 + 0];
      const index1 = edges[i*2 + 1];

      vertex0.fromBufferAttribute(positions, index0);
      vertex1.fromBufferAttribute(positions, index1);

      const length = displacement.subVectors(vertex0, vertex1).length();
      const axisId: AxisId = MathUtils.getAxisIdFromVector(displacement);
      this.segments.push({
        id: edgeId++,
        axisId: axisId,
        index0: index0,
        index1: index1,
        vertex0: vertex0.clone(),
        vertex1: vertex1.clone(),
        magnitude: length,
        direction: displacement.clone(),
      });
    }
  }
};
