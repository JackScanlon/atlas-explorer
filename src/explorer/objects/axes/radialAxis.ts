import * as Three from 'three'

import RadialAxisFragShader from '@/shaders/radialAxis/radialAxis.frag?raw'
import RadialAxisVertShader from '@/shaders/radialAxis/radialAxis.vert?raw'

import { RadialAxisOpts } from './types'
import { RadialAxisDefaults } from './constants'
import { AxisToggleTarget } from '@/explorer/types'

/**
 * RadialAxis
 * @desc Plane with a shader material that renders concentric rings as described
 *       by the input params (specifically, the axis scale derived from `../loader.ts`)
 */
export default class RadialAxis extends Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial> {
  public type: string = 'RadialAxis';
  public axisScale!: Three.Vector3;

  private axis: AxisToggleTarget = AxisToggleTarget.RadialAxis;

  public constructor(opts: RadialAxisOpts) {
    opts = { ...RadialAxisDefaults, ...opts};

    const size = (opts.Scale.Max - opts.Scale.Min)*4;
    const geometry = new Three.PlaneGeometry(size, size);
    const material = new Three.ShaderMaterial({
      uniforms: {
        uWidth: { value: opts.Width! },
        uColor: { value: opts.Color! },
        uScale: { value: new Three.Vector3(opts.Scale.Min, opts.Scale.Max, opts.Scale.Step) },
        uOpacity: { value: 1.0 },
      },
      vertexShader: RadialAxisVertShader,
      fragmentShader: RadialAxisFragShader,
      side: Three.DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    super(geometry, material);

    this.position.y = opts.Height! + opts.Offset!;
    this.rotation.setFromQuaternion(opts.Rotation!);
    this.axisScale = material.uniforms.uScale.value;
  }

  public get axisTarget(): AxisToggleTarget {
    return this.axis;
  }

  public dispose(): void {
    this.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
};
