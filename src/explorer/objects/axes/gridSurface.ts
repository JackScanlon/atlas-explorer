import * as Three from 'three'

import GridSurfaceFragShader from '@/shaders/gridSurface/gridSurface.frag?raw'
import GridSurfaceVertShader from '@/shaders/gridSurface/gridSurface.vert?raw'

import { AxisToggleTarget } from '@/explorer/types'
import { GridSurfaceOpts, GridSurfaceAxisData } from './types'
import { GridSurfaceDefaults, GridSurfaceLineDefaults, GridSurfaceSpacingDefaults } from './constants'

/**
 * GridSurface
 * @desc Plane with a shader material that renders a grid-like texture
 */
export default class GridSurface extends Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial> {
  public type: string = 'GridSurface';
  public surface!: GridSurfaceAxisData;

  public worldOrigin: Three.Vector3 = new Three.Vector3(0, 0, 0);

  private axis: AxisToggleTarget = AxisToggleTarget.GridSurface;

  public constructor(opts: GridSurfaceOpts) {
    opts = { ...GridSurfaceDefaults, ...opts};

    opts.Width = { ...GridSurfaceLineDefaults, ...opts.Width };
    opts.Spacing = { ...GridSurfaceSpacingDefaults, ...opts.Spacing };

    const xSize = (opts.Plane.x.Scale.Max - opts.Plane.x.Scale.Min)*1;
    const ySize = (opts.Plane.y.Scale.Max - opts.Plane.y.Scale.Min)*1;
    const zSize = (opts.Plane.z.Scale.Max - opts.Plane.z.Scale.Min)*1;

    const geometry = new Three.BoxGeometry(xSize, ySize, zSize, 2, 2, 2);
    const material = new Three.ShaderMaterial({
      uniforms: {
        uColor: { value: opts.Color! },
        uOpacity: { value: 1.0 },
        uAxisLine: { value: new Three.Vector2(opts.Spacing.Axis!, opts.Width.Axis!) },
        uTickLine: { value: new Three.Vector2(opts.Spacing.Tick!, opts.Width.Tick!) },
      },
      vertexShader: GridSurfaceVertShader,
      fragmentShader: GridSurfaceFragShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      dithering: true,
      side: Three.BackSide,
    });

    super(geometry, material);

    this.surface = opts.Plane;
    this.position.setY(ySize*0.5 + opts.Plane.y.Scale.Min);
    this.worldOrigin.set(-xSize*0.5 - opts.Plane.x.Scale.Min, 0, -zSize*0.5 - opts.Plane.z.Scale.Min);
    this.rotation.setFromQuaternion(opts.Rotation!);
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
