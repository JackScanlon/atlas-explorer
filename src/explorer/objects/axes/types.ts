import * as Three from 'three'

import { AlAxisScale, AlDataRange, AxisToggleTarget } from '../../types'

/* Radial Axis */
// Radial axis constructor props
export interface RadialAxisOpts {
  Scale: AlAxisScale,
  Range: AlDataRange,
  Color?: Three.Color,
  Width?: number,
  Height?: number,
  Offset?: number,
  Rotation?: Three.Quaternion,
};

// Radial axis helper constructor props
export interface AxisHelperOpts {
  Size: number,
  Scale: AlAxisScale,
  Origin: Three.Vector3,
  Color?: Three.Color,
  Width?: number,
  Dashed?: boolean,
};

/* Linear Axis */
export interface VerticalAxisOpts {
  Scale: AlAxisScale,
  Range: AlDataRange,
  Color?: Three.Color,
  Width?: number,
  Dashed?: boolean,
};

/* Global axes group */
export interface AtlasAxesOpts {
  AxisHelper: AxisHelperOpts,
  RadialAxis: RadialAxisOpts,
  VerticalAxis: VerticalAxisOpts,
};

/* Axis Line */
export interface AxisLineOpts {
  Axis: AxisToggleTarget,
  Color?: Three.Color,
  Width?: number,
  Dashed?: boolean,
  Vertices?: Three.Vector3[],
};

/* Atlas Axes */
export type AxisHoverTarget = {
  Axis: AxisToggleTarget,
  Position: Three.Vector3,
};

export interface AxisObject extends Three.Object3D<Three.Object3DEventMap> {
  axisTarget: AxisToggleTarget;
  dispose: () => void;
};
