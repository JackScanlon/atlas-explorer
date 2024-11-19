import * as Three from 'three'

import { AxisLineOpts } from './types';
import { AxisLineDefaults } from './constants';
import { AxisToggleTarget } from '@/explorer/types';

/**
 * AxisLine
 * @desc defines some interactable line component
 */
export default class AxisLine extends Three.Line<Three.BufferGeometry, Three.LineBasicMaterial> {
  public type: string = 'AxisLine';
  private axis!: AxisToggleTarget;
  private vertices!: Three.Vector3[];

  public constructor(opts: AxisLineOpts) {
    opts = { ...AxisLineDefaults, ...opts};

    const material = opts.Dashed!
      ? new Three.LineDashedMaterial({
        color: opts.Color!.getHex(),
        linewidth: opts.Width!,
        gapSize: 1,
        scale: 1,
        dashSize: 1,
        transparent: true,
      })
      : new Three.LineBasicMaterial({
        color: opts.Color!.getHex(),
        linewidth: opts.Width!,
        vertexColors: false,
        transparent: true,
      });

    const geometry = new Three.BufferGeometry();
    const vertices = [
      opts.Vertices!?.[0] || new Three.Vector3(0, 0, 0),
      opts.Vertices!?.[1] || new Three.Vector3(0, 0, 0)
    ];

    super(geometry, material);
    this.axis = opts.Axis;
    this.vertices = vertices;

    this.UpdateGeometry();
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
    this.geometry.setFromPoints(this.vertices);
    this.geometry.computeBoundingSphere();
  }

  public dispose(): void {
    this.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
};
