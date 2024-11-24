import * as Three from 'three'

import BillboardAxisFragShader from '@/shaders/billboardAxis/billboardAxis.frag?raw'
import BillboardAxisVertShader from '@/shaders/billboardAxis/billboardAxis.vert?raw'

import { VerticalAxisOpts } from './types'
import { VerticalAxisDefaults } from './constants'

/**
 * VerticalAxis
 * @desc defines some line along some direction, i.e. some horizontal / vertical axis
 */
export default class VerticalAxis extends Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial> {
  public type: string = 'VerticalAxis';
  public axisScale!: Three.Vector3;

  public constructor(opts: VerticalAxisOpts) {
    opts = { ...VerticalAxisDefaults, ...opts};

    const size = opts.Scale.Max - opts.Scale.Min;
    const geometry = new Three.PlaneGeometry(size, size*2);
    const material = new Three.ShaderMaterial({
      uniforms: {
        uWidth: { value: opts.Width! },
        uColor: { value: opts.Color! },
        uScale: { value: new Three.Vector3(opts.Scale.Min, opts.Scale.Max, opts.Scale.Step) },
        uOpacity: { value: 1.0 },
      },
      vertexShader: BillboardAxisVertShader,
      fragmentShader: BillboardAxisFragShader,
      side: Three.FrontSide,
      transparent: true,
      depthWrite: false,
    });

    super(geometry, material);
    this.position.y = opts.Scale.Min + size;
  }

  public dispose(): void {
    this.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
};
