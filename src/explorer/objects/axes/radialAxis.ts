import * as Three from 'three'
import * as Css2d from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import * as Utils from '@/explorer/common/utils'
import * as MathUtils from '@/explorer/common/mathUtils'

import RadialAxisFragShader from '@/shaders/radialAxis/radialAxis.frag?raw'
import RadialAxisVertShader from '@/shaders/radialAxis/radialAxis.vert?raw'

import AxisLine from './axisLine'

import { Const } from '@/explorer/constants'
import { AxisToggleTarget } from '@/explorer/types'
import { AxisHoverTarget, AxisObject, RadialAxisOpts } from './types'

const XZ_VECTOR = new Three.Vector3(1.0, 0.0, 1.0);

/**
 * RadialAxis
 * @desc Plane with a shader material that renders concentric rings as described
 *       by the input params (specifically, the axis scale derived from `../loader.ts`)
 */
export default class RadialAxis extends Three.Mesh<Three.PlaneGeometry, Three.ShaderMaterial> {
  public type: string = 'RadialAxis';
  public axisScale!: Three.Vector3;
  public worldOrigin: Three.Vector3 = new Three.Vector3(0, 0, 0);

  private axis: AxisToggleTarget = AxisToggleTarget.RadialAxis;
  private origin!: Three.Vector3;
  private showLabels: boolean = true;
  private properties!: RadialAxisOpts;

  private elements: Record<string, Css2d.CSS2DObject> = {};
  private components: Record<string, Three.Object3D> = {};

  public constructor(opts: RadialAxisOpts) {
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
      transparent: true,
      depthWrite: false,
      depthTest: true,
      dithering: true,
      side: Three.DoubleSide,
    });

    super(geometry, material);

    this.position.y = opts.Height! + opts.Offset!;
    this.rotation.setFromQuaternion(opts.Rotation!);
    this.matrixWorldAutoUpdate = true;

    this.axisScale = material.uniforms.uScale.value;
    this.properties = opts;

    this.initialise();
  }

  public get axisTarget(): AxisToggleTarget {
    return this.axis;
  }

  public GetComponent<T>(name: string): T | undefined {
    const component = this.components?.[name];
    return component ? component as T : undefined;
  }

  public SetVisibility({ axisVisible, axisOpacity, labelVisible }: {
    axisVisible?: boolean,
    axisOpacity?: number,
    labelVisible?: boolean
  }): RadialAxis {
    if (typeof axisVisible !== 'boolean') {
      axisVisible = this.visible;
    }

    if (typeof labelVisible !== 'boolean') {
      labelVisible = this.showLabels;
    }

    if (typeof axisOpacity !== 'number') {
      axisOpacity = this.material.uniforms.uOpacity.value;
    }

    const radialLine = this.GetComponent<AxisLine>('radialLine');
    if (radialLine) {
      radialLine.material.opacity = axisOpacity!;
      radialLine.material.needsUpdate = true;
      radialLine.visible = axisVisible;
    }

    const verticalLine = this.GetComponent<AxisLine>('verticalLine');
    if (verticalLine) {
      verticalLine.material.opacity = axisOpacity!;
      verticalLine.material.needsUpdate = true;
      verticalLine.visible = axisVisible;
    }

    this.visible = axisVisible;
    this.showLabels = labelVisible;

    this.elements.originLabel.visible = labelVisible;
    this.material.uniforms.uOpacity.value = axisOpacity!;
    this.material.needsUpdate = true;
    return this;
  }

  public GetInteractable(): Three.Object3D[] {
    return [this.components.radialLine, this.components.verticalLine];
  }

  public Update(camera: Three.PerspectiveCamera, axisTarget?: AxisHoverTarget, radius: number = 45): RadialAxis {
    const invQuat = this.quaternion.clone().invert();

    let target: Three.Vector3 | undefined = this.ComputeRadialSegment(camera, radius);
    target = (axisTarget && axisTarget.Axis === AxisToggleTarget.RadialAxis)
      ? axisTarget.Position
      : target;

    this.ComputeRadialLabel(target, invQuat);

    target = (axisTarget && axisTarget.Axis === AxisToggleTarget.VerticalAxis)
      ? axisTarget.Position
      : undefined;

    this.ComputeVerticalLabel(target, invQuat);

    return this;
  }

  public UpdateGeometry(): RadialAxis {
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

  public ComputeRadialLabel(target: Three.Vector3, invQuat?: Three.Quaternion): Three.Vector3 {
    const isRadialView = this.visible,
          elements     = this.elements,
          radialLabel  = elements.radialLabel,
          originLabel  = elements.originLabel;

    const targetOpacity = isRadialView ? '1' : '0';
    if (radialLabel.element.style.opacity !== targetOpacity) {
      radialLabel.element.style.opacity = targetOpacity;
      originLabel.element.style.opacity = targetOpacity;
    }

    if (!isRadialView) {
      return target.clone();
    }

    if (!invQuat) {
      invQuat = this.quaternion.clone().invert();
    }

    const prop = this.properties;
    const axis = prop.Scale;
    const size = (axis.Max - axis.Min)*2;
    const origin = this.origin;
    const point = MathUtils.closestPointOnRay(target, origin, target.clone().sub(origin), 0, size);

    const value = (point.Distance/size)*(prop.Range.Max - prop.Range.Min);
    radialLabel.visible = this.showLabels && value > 2.0;
    radialLabel.element.textContent = `(Age: ${value.toFixed(2)}, Freq: 0)`;
    radialLabel.position.copy(point.Position.clone().applyQuaternion(invQuat));
    radialLabel.matrixWorldNeedsUpdate = true;

    return point.Position;
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

    const prop = this.properties;
    const axis = prop.Scale;
    const size = (axis.Max - axis.Min)*2;
    const vertices = line.lineVertices;

    // Get look vector of camera
    const lookVector = MathUtils.safeQuatMultVec3(camera.quaternion, Const.LookVector)
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
    const dot = vec.dot(MathUtils.tryNormaliseVector(origin.clone().sub(camera.position)));
    if (dot >= 0) {
      target.add(MathUtils.safeQuatMultVec3(camera.quaternion, Const.RightVector).multiply(XZ_VECTOR).multiplyScalar(radius));
    }

    direction.copy(target)
      .sub(origin)
      .normalize()
      .multiplyScalar(size);

    line.UpdateSegment(vertices[0].copy(origin), vertices[1].copy(origin).add(direction));
    return target;
  }

  public ComputeVerticalLabel(target: Three.Vector3 | undefined, invQuat?: Three.Quaternion): Three.Vector3 {
    const isRadialView = this.visible,
          elements     = this.elements,
          label        = elements.verticalLabel;

    const targetOpacity = isRadialView ? '1' : '0';
    if (label.element.style.opacity !== targetOpacity) {
      label.element.style.opacity = targetOpacity;
    }

    if (!isRadialView) {
      return label.position.clone();
    }

    if (!invQuat) {
      invQuat = this.quaternion.clone().invert();
    }

    const prop = this.properties.Vertical;
    const axis = prop.Scale;
    const size = (axis.Max - axis.Min)*2;

    const range = prop.Range.Max - prop.Range.Min;

    let value: number = range;
    if (target) {
      const point = MathUtils.closestPointOnRay(target, Const.ZeroVector, Const.UpVector.clone(), 0, size);
      value = (point.Distance/size)*range;
      label.position.copy(point.Position.clone().applyQuaternion(invQuat));
    } else {
      label.position.copy(Const.UpVector.clone().multiplyScalar(size).clone().applyQuaternion(invQuat));
    }

    label.visible = this.showLabels && value > 2.0;
    label.element.textContent = `(Age: 0, Freq: ${value.toFixed(2)})`;
    label.matrixWorldNeedsUpdate = true;

    return label.position.clone();
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

    this.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }

  private initialise(): void {
    const props = this.properties,
          xProps = props.Horizontal,
          yProps = props.Vertical;

    const inverseQuat = this.quaternion.clone().invert();
    this.origin = new Three.Vector3(0, yProps.Scale.Min, 0);

    // Init geom
    const radialLine = new AxisLine({
      Axis: AxisToggleTarget.RadialAxis,
      Color: xProps.Color,
      Width: xProps.Width,
      Vertices: [
        new Three.Vector3(          0, 0, 0),
        new Three.Vector3(xProps.Size, 0, 0),
      ],
    });
    radialLine.quaternion.copy(inverseQuat);

    this.components.radialLine = radialLine;
    this.add(radialLine);

    const verticalAxis = new AxisLine({
      Axis: AxisToggleTarget.VerticalAxis,
      Color: yProps.Color,
      Width: yProps.Width,
      Vertices: [
        new Three.Vector3(0, yProps.Scale.Min, 0),
        new Three.Vector3(0,      yProps.Size, 0),
      ],
    });
    verticalAxis.quaternion.copy(inverseQuat);

    this.components.verticalLine = verticalAxis;
    this.add(verticalAxis);

    // Init label(s)
    const originLabelDiv = document.createElement('div');
    originLabelDiv.textContent = '(Age: 0, Freq: 0)';
    originLabelDiv.style.transition = 'opacity 250ms ease-in-out';
    originLabelDiv.style.backgroundColor = 'transparent';

    const originLabel = new Css2d.CSS2DObject(originLabelDiv);
    originLabel.position.copy(this.origin);
    originLabel.center.set(0, 0);

    this.elements.originLabel = originLabel;
    this.add(originLabel);

    const radialLabelDiv = document.createElement('div');
    radialLabelDiv.textContent = `(Age: ${props.Range.Max.toFixed(0)}, Freq: 0)`;
    radialLabelDiv.style.transition = 'opacity 250ms ease-in-out';
    radialLabelDiv.style.backgroundColor = 'transparent';

    const radialLabel = new Css2d.CSS2DObject(radialLabelDiv);
    radialLabel.position.copy(Const.RightVector.clone().multiplyScalar(xProps.Size).add(this.origin).applyQuaternion(inverseQuat));
    radialLabel.quaternion.copy(inverseQuat);
    radialLabel.center.set(-0.15, -0.15);

    this.elements.radialLabel = radialLabel;
    this.add(radialLabel);

    const verticalLabelDiv = document.createElement('div');
    verticalLabelDiv.textContent = `(Age: 0, ${yProps.Range.Max.toFixed(0)})`;
    verticalLabelDiv.style.transition = 'opacity 250ms ease-in-out';
    verticalLabelDiv.style.backgroundColor = 'transparent';

    const verticalLabel = new Css2d.CSS2DObject(verticalLabelDiv);
    verticalLabel.position.copy(Const.UpVector.clone().multiplyScalar(yProps.Size).add(this.origin).applyQuaternion(inverseQuat));
    verticalLabel.center.set(-0.15, 0.15);

    this.elements.verticalLabel = verticalLabel;
    this.add(verticalLabel);
  }
};
