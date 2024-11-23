import * as Three from 'three'
import * as Css2d from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as Utils from '../../common/utils'
import * as VecUtils from '../../common/vecUtils'
import * as QuatUtils from '../../common/quatUtils'

import AxisLine from './axisLine';
import RadialAxis from './radialAxis';

import { Const } from '@/explorer/constants';
import { AtlasAxesOpts, AxisHoverTarget, AxisObject } from './types';
import { AxisToggleTarget } from '@/explorer/types';
import { AxisHelperDefaults, RadialAxisDefaults, VerticalAxisDefaults } from './constants';

const XZ_VECTOR = new Three.Vector3(1.0, 0.0, 1.0);

export default class AtlasAxes extends Three.Group {
  public type: string = 'AtlasAxis';

  private origin!: Three.Vector3;
  private elements: Record<string, Css2d.CSS2DObject> = {};
  private components: Record<string, Three.Object3D> = {};

  private hasUpdate: boolean = true;
  private axisTarget: AxisHoverTarget | undefined = undefined;
  private properties!: AtlasAxesOpts;
  private showLabels: boolean = true;

  public constructor(opts: AtlasAxesOpts) {
    super()

    this.properties = opts;
    this.properties.AxisHelper = { ...AxisHelperDefaults, ...this.properties.AxisHelper };
    this.properties.RadialAxis = { ...RadialAxisDefaults, ...this.properties.RadialAxis };
    this.properties.VerticalAxis = { ...VerticalAxisDefaults, ...this.properties.VerticalAxis };

    this.initialise();
  }

  public get objects(): Record<string, Three.Object3D> {
    return this.components;
  }

  public ConsumeUpdate(): boolean {
    const hasUpdate = this.hasUpdate;
    this.hasUpdate = false;

    return hasUpdate;
  }

  public GetComponent<T>(name: string): T | undefined {
    const component = this.components?.[name];
    return component ? component as T : undefined;
  }

  public HasTarget(): boolean {
    return !!this.axisTarget;
  }

  public GetInteractable(): Three.Object3D[] {
    return [this.components.radialLine, this.components.verticalLine];
  }

  public SetTarget(target: AxisToggleTarget | undefined = undefined, point: Three.Vector3 | undefined = undefined): AtlasAxes {
    if (typeof target === 'undefined' || typeof point === 'undefined') {
      return this.ResetTarget();
    }

    switch (target) {
      case AxisToggleTarget.RadialAxis:
      case AxisToggleTarget.VerticalAxis:
        this.axisTarget = { Axis: target, Position: point };
        break;

      default:
        this.ResetTarget();
        break;
    }

    return this;
  }

  public ResetTarget(): AtlasAxes {
    if (this.axisTarget) {
      this.hasUpdate = true;
    }

    this.axisTarget = undefined;
    return this;
  }

  public Update(camera: Three.PerspectiveCamera, radius: number = 45): AtlasAxes {
    let target: Three.Vector3 | undefined = this.ComputeRadialSegment(camera, radius);
    target = (this.axisTarget && this.axisTarget.Axis === AxisToggleTarget.RadialAxis)
      ? this.axisTarget.Position
      : target;

    this.ComputeRadialLabel(target);

    target = (this.axisTarget && this.axisTarget.Axis === AxisToggleTarget.VerticalAxis)
      ? this.axisTarget.Position
      : undefined;

    this.ComputeVerticalLabel(target);

    return this;
  }

  public ComputeRadialSegment(
    camera: Three.PerspectiveCamera,
    radius: number = 45
  ): Three.Vector3 {
    let target = new Three.Vector3(0);

    const line = this.GetComponent<AxisLine>('radialLine');
    const origin = this.origin;
    if (!line) {
      return origin.clone();
    }

    const prop = this.properties.RadialAxis;
    const axis = prop.Scale;
    const size = (axis.Max - axis.Min)*2;
    const vertices = line.lineVertices;

    // Get look vector of camera
    const lookVector = QuatUtils.safeQuatMultVec3(camera.quaternion, Const.LookVector)
    const direction = lookVector.clone().multiply(XZ_VECTOR);

    // Find plane intersect underneath us (imaginary plane)
    const result = Utils.rayPlaneIntersect(
      camera.position,
      Const.UpVector.clone().negate().add(direction.clone().multiplyScalar(0.5)),
      origin,
      Const.UpVector
    );

    // Compute offset target
    target = result.Position.multiply(XZ_VECTOR)
      .setY(origin.y)
      .add(direction.clone().multiplyScalar(radius));

    // Ensure we're not behind the origin
    const vec = target.clone().sub(origin);
    const dot = vec.dot(VecUtils.tryNormaliseVector(origin.clone().sub(camera.position)));
    if (dot >= 0) {
      target.add(QuatUtils.safeQuatMultVec3(camera.quaternion, Const.RightVector).multiply(XZ_VECTOR).multiplyScalar(radius));
    }

    direction.copy(target)
      .sub(origin)
      .normalize()
      .multiplyScalar(size);

    line.UpdateSegment(vertices[0].copy(origin), vertices[1].copy(origin).add(direction));
    return target;
  }

  public ComputeRadialLabel(target: Three.Vector3): Three.Vector3 {
    const prop = this.properties.RadialAxis;
    const axis = prop.Scale;
    const size = (axis.Max - axis.Min)*2;

    const origin   = this.origin,
          elements = this.elements;

    const point = VecUtils.closestPointOnRay(target, origin, target.clone().sub(origin), 0, size);
    const radialLabel = elements.radialLabel;

    const value = (point.Distance/size)*(prop.Range.Max - prop.Range.Min);
    radialLabel.visible = this.showLabels && value > 2.0;
    radialLabel.element.textContent = `(Age: ${value.toFixed(2)}, Freq: 0)`;
    radialLabel.position.copy(point.Position);
    radialLabel.matrixWorldNeedsUpdate = true;

    return point.Position;
  }

  public ComputeVerticalLabel(target: Three.Vector3 | undefined): Three.Vector3 {
    const prop = this.properties.VerticalAxis;
    const axis = prop.Scale;
    const size = (axis.Max - axis.Min)*2;

    const range    = prop.Range.Max - prop.Range.Min,
          elements = this.elements,
          label    = elements.verticalLabel;

    let value: number = range;
    if (target) {
      const point = VecUtils.closestPointOnRay(target, Const.ZeroVector, Const.UpVector.clone(), 0, size);
      value = (point.Distance/size)*range;
      label.position.copy(point.Position);
    } else {
      label.position.copy(Const.UpVector.clone().multiplyScalar(size));
    }

    label.visible = this.showLabels && value > 2.0;
    label.element.textContent = `(Age: 0, Freq: ${value.toFixed(2)})`;
    label.matrixWorldNeedsUpdate = true;

    return label.position.clone();
  }

  public SetVisibility(targets: Record<AxisToggleTarget, boolean>): AtlasAxes {
    const radialAxis = this.GetComponent<RadialAxis>('radialAxis');
    if (radialAxis) {
      radialAxis.material.uniforms.uOpacity.value = !targets[AxisToggleTarget.RadialAxis] ? 0 : 1;
      radialAxis.material.needsUpdate = true;
    }

    const radialLine = this.GetComponent<RadialAxis>('radialLine');
    if (radialLine) {
      radialLine.material.opacity = !targets[AxisToggleTarget.RadialAxis] ? 0 : 1;
      radialLine.material.needsUpdate = true;
    }

    const verticalLine = this.GetComponent<AxisLine>('verticalLine');
    if (verticalLine) {
      verticalLine.material.opacity = !targets[AxisToggleTarget.VerticalAxis] ? 0 : 1;
      verticalLine.material.needsUpdate = true;
    }

    if (!!targets[AxisToggleTarget.AxesLabels] !== this.showLabels) {
      this.hasUpdate = true;
    }
    this.showLabels = !!targets[AxisToggleTarget.AxesLabels];
    this.elements.originLabel.visible = this.showLabels;

    return this;
  }

  public UpdateGeometry(): AtlasAxes {
    const radialLine = this.GetComponent<AxisLine>('radialLine');
    if (radialLine) {
      radialLine.UpdateGeometry();
    }

    const verticalLine = this.GetComponent<AxisLine>('verticalLine');
    if (verticalLine) {
      verticalLine.UpdateGeometry();
    }

    return this;
  }

  public dispose(): void {
    for (let i = 0; i < this.children.length; ++i) {
      const obj = this.children[i];
      if (!obj.hasOwnProperty('dispose')) {
        obj.removeFromParent();
        continue;
      };

      (obj as AxisObject).dispose();
    }

    const elems = Object.values(this.elements);
    for (let i = 0; i < elems.length; ++i) {
      elems[i].removeFromParent();
      elems[i].element.remove();
    }
  }

  private initialise(): void {
    const props = this.properties;

    // Init geom(s)
    const radialSize = (props.RadialAxis.Scale.Max - props.RadialAxis.Scale.Min)*2;
    const radialAxis = new RadialAxis(props.RadialAxis);
    this.components.radialAxis = radialAxis;
    this.add(radialAxis);

    const radialLine = new AxisLine({
      Axis: AxisToggleTarget.RadialAxis,
      Color: props.VerticalAxis.Color,
      Width: props.VerticalAxis.Width,
      Vertices: [
        new Three.Vector3(         0, 0, 0),
        new Three.Vector3(radialSize, 0, 0),
      ],
    });
    this.components.radialLine = radialLine;
    this.add(radialLine);

    const verticalSize = (props.VerticalAxis.Scale.Max - props.VerticalAxis.Scale.Min)*2;
    const verticalAxis = new AxisLine({
      Axis: AxisToggleTarget.VerticalAxis,
      Color: props.VerticalAxis.Color,
      Width: props.VerticalAxis.Width,
      Vertices: [
        new Three.Vector3(0, props.VerticalAxis.Scale.Min, 0),
        new Three.Vector3(0,                 verticalSize, 0),
      ],
    });
    this.components.verticalLine = verticalAxis;
    this.add(verticalAxis);

    this.origin = new Three.Vector3(0, props.VerticalAxis.Scale.Min, 0);

    // Init label(s)
    const originLabelDiv = document.createElement('div');
    originLabelDiv.textContent = '(Age: 0, Freq: 0)';
    originLabelDiv.style.backgroundColor = 'transparent';

    const originLabel = new Css2d.CSS2DObject(originLabelDiv);
    originLabel.position.copy(this.origin);
    originLabel.center.set(0, 0);

    this.elements.originLabel = originLabel;
    this.add(originLabel);

    const radialLabelDiv = document.createElement('div');
    radialLabelDiv.textContent = `(Age: ${props.RadialAxis.Range.Max.toFixed(0)}, Freq: 0)`;
    radialLabelDiv.style.backgroundColor = 'transparent';

    const radialLabel = new Css2d.CSS2DObject(radialLabelDiv);
    radialLabel.position.copy(Const.RightVector.clone().multiplyScalar(radialSize).add(this.origin));
    radialLabel.center.set(-0.15, -0.15);

    this.elements.radialLabel = radialLabel;
    this.add(radialLabel);

    const verticalLabelDiv = document.createElement('div');
    verticalLabelDiv.textContent = `(Age: 0, ${props.VerticalAxis.Range.Max.toFixed(0)})`;
    verticalLabelDiv.style.backgroundColor = 'transparent';

    const verticalLabel = new Css2d.CSS2DObject(verticalLabelDiv);
    verticalLabel.position.copy(Const.UpVector.clone().multiplyScalar(verticalSize).add(this.origin));
    verticalLabel.center.set(-0.15, 0.15);

    this.elements.verticalLabel = verticalLabel;
    this.add(verticalLabel);
  }
};
