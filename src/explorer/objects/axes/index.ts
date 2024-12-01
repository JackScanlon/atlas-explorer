import * as Three from 'three'

import RadialAxis from './radialAxis'

import { GridSurface } from './gridSurface'
import { AtlasAxesOpts, AxisHoverTarget, AxisObject } from './types'
import { AtlasViewState, AxisToggleTarget } from '@/explorer/types'
import {
  RadialAxisDefaults, RadialAxisHelperDefaults, RadialVerticalAxisDefaults,
  GridSurfaceDefaults, GridSurfaceLineDefaults, GridSurfaceSpacingDefaults
} from './constants'

export default class AtlasAxes extends Three.Group {
  public type: string = 'AtlasAxis';

  private viewState: AtlasViewState = AtlasViewState.RadialView;
  private components: Record<string, Three.Object3D> = {};

  private hasUpdate: boolean = true;
  private axisTarget: AxisHoverTarget | undefined = undefined;
  private properties!: AtlasAxesOpts;
  private showLabels: boolean = true;

  public constructor(opts: AtlasAxesOpts) {
    super()

    this.properties = opts;

    this.properties.GridSurface = { ...GridSurfaceDefaults, ...this.properties.GridSurface };
    this.properties.GridSurface.Width = { ...GridSurfaceLineDefaults, ...this.properties.GridSurface.Width };
    this.properties.GridSurface.Spacing = { ...GridSurfaceSpacingDefaults, ...this.properties.GridSurface.Spacing };

    this.properties.RadialAxis = { ...RadialAxisDefaults, ...this.properties.RadialAxis };
    this.properties.RadialAxis.Vertical = { ...RadialVerticalAxisDefaults, ...this.properties.RadialAxis.Vertical };
    this.properties.RadialAxis.Horizontal = { ...RadialAxisHelperDefaults, ...this.properties.RadialAxis.Horizontal };

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
    if (this.viewState == AtlasViewState.RadialView) {
      return this.GetComponent<RadialAxis>('radialAxis')!.GetInteractable();
    } else if (this.viewState == AtlasViewState.ScatterView) {
      return this.GetComponent<RadialAxis>('gridSurface')!.GetInteractable();
    }

    return [];
  }

  public GetTargetWorldOrigin(view: AtlasViewState, vec: Three.Vector3): Three.Vector3 {
    const origin = view === AtlasViewState.RadialView
      ? this.GetComponent<RadialAxis>('radialAxis')!.worldOrigin
      : this.GetComponent<GridSurface>('gridSurface')!.worldOrigin;

    return vec.copy(origin);
  }

  public SetViewState(target: AtlasViewState): AtlasAxes {
    this.viewState = target;
    this.ToggleHelperView();

    return this;
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
    const radialAxis = this.GetComponent<RadialAxis>('radialAxis');
    if (radialAxis && radialAxis.visible) {
      radialAxis.Update(camera, this.axisTarget, radius);
    }

    const gridSurface = this.GetComponent<GridSurface>('gridSurface');
    if (gridSurface && gridSurface.visible) {
      gridSurface.Update(camera);
    }

    return this;
  }

  public SetVisibility(targets: Record<AxisToggleTarget, boolean>): AtlasAxes {
    const isRadialView = this.viewState === AtlasViewState.RadialView;
    const axesHelperOpacity = !targets[AxisToggleTarget.AxesHelper] ? 0 : 1;
    const axesLabelOpacity = targets[AxisToggleTarget.AxesLabels];

    if (!!axesLabelOpacity !== this.showLabels) {
      this.hasUpdate = true;
    }
    this.showLabels = !!targets[AxisToggleTarget.AxesLabels];

    const radialAxis = this.GetComponent<RadialAxis>('radialAxis');
    if (radialAxis) {
      radialAxis.SetVisibility({ axisVisible: isRadialView, axisOpacity: axesHelperOpacity, labelVisible: this.showLabels });
    }

    const gridSurface = this.GetComponent<GridSurface>('gridSurface');
    if (gridSurface) {
      gridSurface.SetVisibility({ axisVisible: !isRadialView, axisOpacity: axesHelperOpacity, labelVisible: this.showLabels });
    }

    return this;
  }

  public ToggleHelperView(): AtlasAxes {
    const isRadialView = this.viewState === AtlasViewState.RadialView;

    const radialAxis = this.GetComponent<RadialAxis>('radialAxis');
    if (radialAxis) {
      radialAxis.SetVisibility({ axisVisible: isRadialView, labelVisible: this.showLabels });
    }

    const gridSurface = this.GetComponent<GridSurface>('gridSurface');
    if (gridSurface) {
      gridSurface.SetVisibility({ axisVisible: !isRadialView, labelVisible: this.showLabels });
    }

    this.hasUpdate = true;
    return this;
  }

  public UpdateGeometry(): AtlasAxes {
    const radialAxis = this.GetComponent<RadialAxis>('radialAxis');
    if (radialAxis) {
      radialAxis.UpdateGeometry();
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

    this.removeFromParent();
  }

  private initialise(): void {
    const props = this.properties;

    const gridSurface = new GridSurface(props.GridSurface);
    gridSurface.visible = false;
    this.components.gridSurface = gridSurface;
    this.add(gridSurface);

    const radialAxis = new RadialAxis(props.RadialAxis);
    this.components.radialAxis = radialAxis;
    this.add(radialAxis);
  }
};
