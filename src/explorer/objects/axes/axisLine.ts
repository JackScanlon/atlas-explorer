import * as Three from 'three'

import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'

import { AxisLineOpts } from './types'
import { AxisLineDefaults } from './constants'
import { AxisToggleTarget } from '@/explorer/types'

/**
 * AxisLine
 * @desc defines some interactable line component
 */
export default class AxisLine extends Line2 {
  public type: string = 'AxisLine';
  private axis!: AxisToggleTarget;
  private vertices!: Three.Vector3[];

  public constructor(opts: AxisLineOpts) {
    opts = { ...AxisLineDefaults, ...opts};

    const material = new LineMaterial({
      color: opts.Color!.getHex(),
      linewidth: opts.Width!,
      gapSize: 1,
      dashScale: 1,
      dashSize: 2,
      transparent: true,
      alphaToCoverage: false,
      vertexColors: false,
      dashed: !!opts.Dashed,
    });

    const geometry = new LineGeometry();
    const vertices = [
      opts.Vertices!?.[0] || new Three.Vector3(0, 0, 0),
      opts.Vertices!?.[1] || new Three.Vector3(0, 1, 0)
    ];

    super(geometry, material);

    this.geometry.setPositions([
      vertices[0].x, vertices[0].y, vertices[0].z,
      vertices[1].x, vertices[1].y, vertices[1].z,
    ]);


    this.axis = opts.Axis;
    this.vertices = vertices;

    this.computeLineDistances();
    this.geometry.computeBoundingSphere();
  }

  public get axisTarget(): AxisToggleTarget {
    return this.axis;
  }

  public get axisScale(): number {
    return this.vertices[0].clone().sub(this.vertices[1]).length();
  }

  public get lineStart(): Three.Vector3 {
    return this.vertices[0];
  }

  public get lineEnd(): Three.Vector3 {
    return this.vertices[1];
  }

  public set lineStart(vec: Three.Vector3) {
    this.vertices[0] = vec;
    this.UpdateGeometry();
  }

  public set lineEnd(vec: Three.Vector3) {
    this.vertices[1] = vec;
    this.UpdateGeometry();
  }

  public get lineVertices(): Three.Vector3[] {
    return [ ... this.vertices ];
  }

  public UpdateSegment(vec0: Three.Vector3, vec1: Three.Vector3): AxisLine {
    this.vertices[0].copy(vec0);
    this.vertices[1].copy(vec1);
    this.UpdateGeometry();
    return this;
  }

  public UpdateGeometry(): void {
    const [vert0, vert1] = this.vertices;
    this.geometry.setPositions([
      vert0.x, vert0.y, vert0.z,
      vert1.x, vert1.y, vert1.z,
    ]);

    this.geometry.computeBoundingSphere();
    this.computeLineDistances();
  }

  public dispose(): void {
    this.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
};
