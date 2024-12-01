import * as Three from 'three'
import * as Css2d from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import * as Utils from '@/explorer/common/utils'

import GridSurfaceFragShader from '@/shaders/gridSurface/gridSurface.frag?raw'
import GridSurfaceVertShader from '@/shaders/gridSurface/gridSurface.vert?raw'

import AxisLine from './axisLine'
import BoxEdgesGeometry, { QuadPrimitive, EdgePrimitive } from '@/explorer/objects/edgeGeometry'

import { Const } from '@/explorer/constants'
import { AxisId, AxisToggleTarget } from '@/explorer/types'
import { GridSurfaceOpts, GridSurfaceAxisData } from './types'

const axisKeyMap = {
  [AxisId.X]: 'x',
  [AxisId.Y]: 'y',
  [AxisId.Z]: 'z',
};

/**
 * @desc the edge that best fits some axis
 */
interface BestFitEdge {
  edge: EdgePrimitive,
  quad: QuadPrimitive<Three.Vector3>,
  score: number,
};

/**
 * @desc sort fn for sorted binary arr
 */
const lteBestFit = (a: BestFitEdge, b: BestFitEdge): number => a.score < b.score ? 1 : (a.score > b.score ? -1 : 0);

/**
 * @desc describes the quad & edge that best fits the specified axis
 */
export interface GridAxisLine {
  axis: AxisId,
  edge: EdgePrimitive,
  quad: QuadPrimitive<Three.Vector3>,
};

/**
 * @desc describes the best axis edge / quad for some frame
 */
export interface GridAxes {
  x?: GridAxisLine,
  y?: GridAxisLine,
  z?: GridAxisLine,
}

/**
 * @desc internal interface describing line + label groups
 */
interface AxisGroup {
  line: AxisLine,
  label0: Css2d.CSS2DObject, // title
  label1: Css2d.CSS2DObject, // min
  label2: Css2d.CSS2DObject, // max
};

/**
 * GridSurface
 * @desc Plane with a shader material that renders a grid-like texture
 */
export class GridSurface extends Three.Mesh<Three.BoxGeometry, Three.ShaderMaterial> {
  public type: string = 'GridSurface';
  public surface!: GridSurfaceAxisData;
  public worldOrigin: Three.Vector3 = new Three.Vector3(0, 0, 0);

  private axis: AxisToggleTarget = AxisToggleTarget.GridSurface;
  private axes: GridAxes = {};
  private axisLines!: Record<string, AxisGroup>;
  private showLabels: boolean = true;
  private properties!: GridSurfaceOpts;
  private edgesGeometry?: BoxEdgesGeometry;

  public constructor(opts: GridSurfaceOpts) {
    const xSize = opts.Plane.x.Scale.Max - opts.Plane.x.Scale.Min;
    const ySize = opts.Plane.y.Scale.Max - opts.Plane.y.Scale.Min;
    const zSize = opts.Plane.z.Scale.Max - opts.Plane.z.Scale.Min;

    const geometry = new Three.BoxGeometry(1, 1, 1, 1, 1, 1);
    const material = new Three.ShaderMaterial({
      uniforms: {
        uColor: { value: opts.Color! },
        uOpacity: { value: 1.0 },
        uAxisLine: { value: new Three.Vector2(opts.Spacing!.Axis!, opts.Width!.Axis!) },
        uTickLine: { value: new Three.Vector2(opts.Spacing!.Tick!, opts.Width!.Tick!) },
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
    this.properties = opts;

    this.scale.set(xSize, ySize, zSize);
    this.position.setY(ySize*0.5 + opts.Plane.y.Scale.Min);
    this.worldOrigin.set(-xSize*0.5 - opts.Plane.x.Scale.Min, 0, -zSize*0.5 - opts.Plane.z.Scale.Min);
    this.rotation.setFromQuaternion(opts.Rotation!);

    this.initialise();
  }

  public get gridAxes(): GridAxes {
    return this.axes;
  }

  public get axisTarget(): AxisToggleTarget {
    return this.axis;
  }

  public GetInteractable(): Three.Object3D[] {
    return [];
  }

  public SetVisibility({ axisVisible, axisOpacity, labelVisible }: {
    axisVisible?: boolean,
    axisOpacity?: number,
    labelVisible?: boolean
  }): GridSurface {
    if (typeof axisVisible !== 'boolean') {
      axisVisible = this.visible;
    }

    if (typeof labelVisible !== 'boolean') {
      labelVisible = this.showLabels;
    }

    if (typeof axisOpacity !== 'number') {
      axisOpacity = this.material.uniforms.uOpacity.value;
    }

    this.visible = axisVisible;
    this.showLabels = labelVisible;

    for (const [_, group] of Object.entries(this.axisLines)) {
      const { line, label0, label1, label2 } = group;
      label0.element.style.opacity = label1.element.style.opacity = label2.element.style.opacity = (labelVisible ? 1 : 0).toFixed(0);
      line.visible = axisVisible;
      line.material.opacity = axisOpacity!;
      line.material.needsUpdate = true;
    }

    this.material.uniforms.uOpacity.value = axisOpacity!;
    this.material.needsUpdate = true;
    return this;
  }

  public dispose(): void {
    if (this.edgesGeometry) {
      this.edgesGeometry.dispose();
      this.edgesGeometry = undefined;
    }

    for (const [key, group] of Object.entries(this.axisLines)) {
      group.line.dispose();
      group.label0.removeFromParent();
      group.label1.removeFromParent();
      delete this.axisLines[key];
    }

    this.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }

  public Update(camera: Three.PerspectiveCamera): GridSurface {
    if (!this.visible) {
      return this;
    }
    this.RecomputeBestAxes(camera);

    const axes = this.axes;
    const lines = this.axisLines;

    const offset = new Three.Vector3();
    const vertex0 = new Three.Vector3();
    const vertex1 = new Three.Vector3();
    const midpoint = new Three.Vector3();

    const normal = new Three.Vector3();
    const direction = new Three.Vector3();

    const cameraLookVector = camera.getWorldDirection(new Three.Vector3());
    const cameraOrientation = camera.quaternion;
    for (const axisKey of Object.values(axisKeyMap)) {
      const axis = axes[axisKey as keyof GridAxes];
      const group = lines[axisKey as keyof GridAxes];

      const { line, label0, label1, label2 } = group;
      if (!axis) {
        label0.visible = label1.visible = label2.visible = false;
        continue;
      }

      line.UpdateSegment(
        axis.edge.vertex0,
        axis.edge.vertex1
      );

      vertex0.copy(axis.edge.vertex0);
      vertex1.copy(axis.edge.vertex1);
      midpoint.lerpVectors(vertex0, vertex1, 0.5);

      direction.copy(Const.AxisIdVectorMap.get(axis.edge.axisId)!)
              .applyQuaternion(cameraOrientation);

      normal.copy(axis.edge.direction)
              .set(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z));

      if (axis.quad.normal.dot(cameraLookVector) < -0.5) {
        label0.position.copy(midpoint).add(axis.quad.normal.clone().multiplyScalar(1e-1));
        label0.visible = true;
      } else {
        label0.visible = false;
      }

      if (direction.dot(normal.clone().applyQuaternion(cameraOrientation)) <= 1e-1) {
        normal.negate();
      }

      offset.copy(normal).multiplyScalar(1e-1);

      normal.multiplyScalar(axis.edge.magnitude*0.5);

      label1.position.copy(midpoint).sub(normal).sub(offset);
      label2.position.copy(midpoint).add(normal).add(offset);

      label1.visible = label2.visible = true;
    }

    return this;
  }

  /**
   * @TODO there's a better way to do this by projecting the vertices,
   *       selecting the bottom most vertex and its neighbours but I'm
   *       failing to think of how best to implement that so this'll do
   *       for now. Will come back to this
   *
   */
  public RecomputeBestAxes(camera: Three.PerspectiveCamera): GridSurface {
    if (!this.edgesGeometry) {
      return this;
    }

    const edgeGeometry   = this.edgesGeometry,
          transform      = this.matrix,
          worldTransform = this.matrixWorld,
          normalMatrix   = new Three.Matrix3().getNormalMatrix(worldTransform),
          cameraOrigin   = camera.position;

    const edges    = edgeGeometry.edges,
          surfaces = edgeGeometry.quads;

    const normal = new Three.Vector3(),
          vertex = new Three.Vector3(),
          vector = new Three.Vector3();

    const halfTanFov        = Math.tan(camera.fov*0.5)/camera.aspect,
          cameraLookVector  = Const.LookVector.clone().applyQuaternion(camera.quaternion),
          cameraUpVector    = Const.UpVector.clone().applyQuaternion(camera.quaternion),
          cameraRightVector = cameraLookVector.clone().cross(cameraUpVector);

    const bottomSide     = cameraLookVector.sub(cameraUpVector.multiplyScalar(halfTanFov)),
          bottomNormal   = cameraRightVector.negate().cross(bottomSide),
          bottomDistance = -cameraOrigin.dot(bottomNormal);

    const visibleEdges: Array<BestFitEdge> = [];
    for (const quad of surfaces.values()) {
      normal.copy(quad.normal)
            .applyMatrix3(normalMatrix);

      vertex.copy(quad.point)
            .applyMatrix4(transform);

      vector.subVectors(vertex, cameraOrigin);

      const isVisible = Math.sign(normal.dot(vector)) <= 0;
      if (isVisible) {
        for (let i = 0; i < quad.faceIndices.length; ++i) {
          const edge = edges[quad.faceIndices[i]];
          const dist = (
            (bottomNormal.dot(vector.lerpVectors(edge.vertex0, edge.vertex1, 0.5)) + bottomDistance)
            + vector.length()
          );
          Utils.binaryInsert(visibleEdges, { edge: edge, quad: quad, score: dist }, lteBestFit);
        }
      }
    }

    const resultset   = {} as { [key in keyof GridAxes]: boolean },
          currentAxes = this.axes;

    let axis: boolean | undefined,
        target!: BestFitEdge,
        axisKey!: keyof GridAxes;

    let i = 0, fulfilled = 0, changed = 0;
    while (i < visibleEdges.length && fulfilled < 3) {
      target = visibleEdges[i];
      axisKey = axisKeyMap[target.edge.axisId] as keyof GridAxes;

      axis = resultset?.[axisKey];
      if (!axis) {
        if (!currentAxes?.[axisKey] || currentAxes[axisKey]?.edge.id !== target.edge.id) {
          currentAxes[axisKey] = {
            axis: target.edge.axisId,
            edge: target.edge,
            quad: target.quad,
          };

          changed |= 1;
        }

        fulfilled++;
      }

      i++;
    }

    return this;
  }

  private initialise(): void {
    const props = this.properties;
    this.buildEdgeGeometry();

    const axisLines = {};
    this.axisLines = axisLines;

    const labelDiv = document.createElement('div');
    labelDiv.style.transition = 'opacity 250ms ease-in-out';
    labelDiv.style.backgroundColor = 'transparent';

    for (const [axisId, _] of Const.AxisIdVectorMap) {
      const line = new AxisLine({
        Axis: Number(axisId),
        Color: props.AxisColor!,
        Width: props.Width!.Line!,
        Vertices: [new Three.Vector3(), new Three.Vector3()],
      });
      this.add(line);

      const key = axisKeyMap[axisId];
      const axis = props.Plane[key as keyof GridSurfaceAxisData];
      const range = axis.Range;

      const label0Div  = labelDiv.cloneNode(true) as HTMLElement,
            label1Div  = labelDiv.cloneNode(true) as HTMLElement,
            label2Div  = labelDiv.cloneNode(true) as HTMLElement;

      label0Div.textContent = `${axis.Title} (${key})`;
      label1Div.textContent = `(${key}: ${range.Min.toFixed(1)})`;
      label2Div.textContent = `(${key}: ${range.Max.toFixed(1)})`;

      const label0 = new Css2d.CSS2DObject(label0Div);
      label0.visible = false;
      label0.center.set(0.5, 0.5);
      this.add(label0);

      const label1 = new Css2d.CSS2DObject(label1Div);
      label1.visible = false;
      label1.center.set(0.5, 0.5);
      this.add(label1);

      const label2 = new Css2d.CSS2DObject(label2Div);
      label2.visible = false;
      label2.center.set(0.5, 0.5);
      this.add(label2);

      this.axisLines[key] = { line, label0, label1, label2 };
    }
  }

  private buildEdgeGeometry(): void {
    if (this.edgesGeometry) {
      return;
    }

    this.edgesGeometry = new BoxEdgesGeometry();
  }
};
